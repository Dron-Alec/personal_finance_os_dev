-- Who changed what, when. One generic trigger on the tables that hold
-- money data or control sharing. Rows are written by the trigger only
-- (SECURITY DEFINER); clients can read their own household's/user's rows
-- and never write.
--
-- Not logged: transaction INSERTs (CSV imports are bulk and already
-- deduplicated — the import itself isn't a "change"). UPDATEs store only
-- the changed columns, and no-op updates (e.g. re-categorize leaving a
-- category as-is) aren't logged at all.
--
-- ponytail: grows forever; add a pg_cron purge (e.g. > 1 year) with the
-- retention work in 4.5.

create table public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid default auth.uid(), -- null = dashboard / SQL editor / migrations
  household_id uuid,
  user_id uuid,
  table_name text not null,
  row_id text,
  op text not null check (op in ('INSERT', 'UPDATE', 'DELETE')),
  old jsonb,
  new jsonb
);

create index audit_log_household_at_idx on public.audit_log (household_id, at desc);
create index audit_log_user_at_idx on public.audit_log (user_id, at desc);

alter table public.audit_log enable row level security;
alter table public.audit_log force row level security;

create policy "select own household or user" on public.audit_log
  for select to authenticated
  using (user_id = (select auth.uid()) or private.is_household_member(household_id));
create policy "require aal2" on public.audit_log as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2')
  with check ((select auth.jwt() ->> 'aal') = 'aal2');
revoke insert, update, delete, truncate on public.audit_log from anon, authenticated;

create function private.audit_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  old_vals jsonb;
  new_vals jsonb;
begin
  -- delete_own_account sets this so erasing a user doesn't leave a copy of
  -- their data behind in the log.
  if current_setting('candid.skip_audit', true) = 'on' then
    return null;
  end if;

  if tg_op = 'UPDATE' then
    select jsonb_object_agg(n.key, to_jsonb(old) -> n.key), jsonb_object_agg(n.key, n.value)
      into old_vals, new_vals
      from jsonb_each(to_jsonb(new)) n
      where to_jsonb(old) -> n.key is distinct from n.value;
    if new_vals is null then
      return null;
    end if;
  elsif tg_op = 'DELETE' then
    old_vals := r;
  else
    new_vals := r;
  end if;

  insert into public.audit_log (household_id, user_id, table_name, row_id, op, old, new)
  values (
    coalesce(r ->> 'household_id', r ->> 'household_a_id')::uuid,
    coalesce(r ->> 'user_id', r ->> 'created_by', r ->> 'invited_by')::uuid,
    tg_table_name,
    r ->> 'id',
    tg_op,
    old_vals,
    new_vals
  );
  return null;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'accounts', 'account_balance_history', 'nw_snapshots', 'goals',
    'household_members', 'household_invites', 'household_links', 'custom_bank_formats'
  ]
  loop
    execute format(
      'create trigger audit after insert or update or delete on public.%I '
      'for each row execute function private.audit_row()',
      t
    );
  end loop;
end $$;

create trigger audit after update or delete on public.transactions
  for each row execute function private.audit_row();

-- Same as 0024's version, plus: no audit rows for the erasure itself, and
-- the user's existing audit history goes with them.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_household_id uuid;
begin
  if current_user_id is null then
    raise exception 'Not authenticated.';
  end if;
  if (select auth.jwt() ->> 'aal') is distinct from 'aal2' then
    raise exception 'MFA required.';
  end if;

  perform set_config('candid.skip_audit', 'on', true);

  select household_id into target_household_id
  from public.household_members
  where user_id = current_user_id;

  if target_household_id is not null then
    delete from public.transactions where household_id = target_household_id;
    delete from public.accounts where household_id = target_household_id;
    delete from public.households where id = target_household_id;
  end if;

  delete from auth.users where id = current_user_id;

  delete from public.audit_log
  where user_id = current_user_id
     or actor = current_user_id
     or household_id = target_household_id;
end;
$$;
