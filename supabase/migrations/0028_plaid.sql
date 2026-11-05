-- Plaid (sandbox first). All Plaid calls happen in the `plaid` Edge
-- Function (supabase/functions/plaid), which runs with the service role;
-- the Next app never holds a Plaid secret or a service-role key.
--
-- Access tokens live only in Supabase Vault (docs/decisions/0001); a
-- plaid_items row holds just the vault secret's id. Deleting the row —
-- disconnect, or the households cascade from delete_own_account — deletes
-- the secret too.

create table public.plaid_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  plaid_item_id text not null unique,
  institution_name text,
  access_token_secret_id uuid not null,
  cursor text,
  -- Transactions dated before this are skipped, so Plaid doesn't
  -- double-count history already imported from CSV statements.
  import_from date not null,
  status text not null default 'active' check (status in ('active', 'login_required', 'error')),
  error_code text,
  last_synced_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index plaid_items_household_idx on public.plaid_items (household_id);

alter table public.plaid_items enable row level security;
alter table public.plaid_items force row level security;

create policy "select household" on public.plaid_items
  for select to authenticated using (private.is_household_member(household_id));
create policy "require aal2" on public.plaid_items as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2')
  with check ((select auth.jwt() ->> 'aal') = 'aal2');

-- Clients may see connection status, never the secret id or sync cursor,
-- and never write (only the Edge Function does, as service_role).
revoke all on public.plaid_items from anon, authenticated;
grant select (id, household_id, institution_name, import_from, status, error_code, last_synced_at, created_at)
  on public.plaid_items to authenticated;

-- Vault isn't reachable through the API, so the Edge Function goes through
-- these. service_role only.
create function public.plaid_store_item(
  p_household_id uuid, p_plaid_item_id text, p_institution_name text,
  p_access_token text, p_import_from date, p_created_by uuid
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  secret_id uuid;
  item_id uuid;
begin
  secret_id := vault.create_secret(p_access_token, 'plaid:' || p_plaid_item_id);
  insert into public.plaid_items (household_id, plaid_item_id, institution_name, access_token_secret_id, import_from, created_by)
  values (p_household_id, p_plaid_item_id, p_institution_name, secret_id, p_import_from, p_created_by)
  returning id into item_id;
  return item_id;
end;
$$;

create function public.plaid_access_token(p_item_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select ds.decrypted_secret
  from public.plaid_items pi
  join vault.decrypted_secrets ds on ds.id = pi.access_token_secret_id
  where pi.id = p_item_id;
$$;

revoke execute on function public.plaid_store_item(uuid, text, text, text, date, uuid) from public, anon, authenticated;
revoke execute on function public.plaid_access_token(uuid) from public, anon, authenticated;
grant execute on function public.plaid_store_item(uuid, text, text, text, date, uuid) to service_role;
grant execute on function public.plaid_access_token(uuid) to service_role;

create function private.delete_plaid_secret()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from vault.secrets where id = old.access_token_secret_id;
  return null;
end;
$$;

create trigger delete_plaid_secret
  after delete on public.plaid_items
  for each row execute function private.delete_plaid_secret();

-- Accounts fed by Plaid. One Plaid account maps to at most one Candid account.
alter table public.accounts
  add column plaid_account_id text unique,
  add column plaid_item_id uuid references public.plaid_items (id) on delete set null;

-- Transactions: CSV dedupe stays exactly as before (plaid_transaction_id is
-- null on every CSV row, and NULLS NOT DISTINCT makes those nulls equal),
-- while Plaid rows are keyed by Plaid's id — so two identical same-day
-- Plaid transactions (two $4.50 coffees) are both kept.
--
-- The old 4-column key stays until 0029: the app deployed before this
-- migration upserts against it, the one after against the new key. With
-- both in place either works (a CSV duplicate hits both identically).
alter table public.transactions
  add column source text not null default 'csv' check (source in ('csv', 'plaid')),
  add column plaid_transaction_id text unique;
alter table public.transactions add constraint transactions_dedupe_key
  unique nulls not distinct (household_id, date, description, amount, plaid_transaction_id);
