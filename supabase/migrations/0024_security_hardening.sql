-- Security hardening from the 2026-10-28 scan.

-- 1. Enforce MFA at the data layer, not just in proxy.ts. The anon key is
-- public, so an aal1 session (password only, TOTP not yet passed) could
-- otherwise hit PostgREST directly. Restrictive policies AND with every
-- existing permissive policy. Scoped to `authenticated` only, so SECURITY
-- DEFINER functions (handle_new_user etc.) are unaffected.
do $$
declare
  t text;
begin
  foreach t in array array[
    'accounts', 'account_balance_history', 'account_templates', 'transactions',
    'nw_snapshots', 'category_rules', 'goals', 'households', 'household_members',
    'household_invites', 'household_links', 'user_settings', 'custom_bank_formats'
  ]
  loop
    execute format(
      'create policy "require aal2" on public.%I as restrictive for all to authenticated '
      'using ((select auth.jwt() ->> ''aal'') = ''aal2'') '
      'with check ((select auth.jwt() ->> ''aal'') = ''aal2'')',
      t
    );
  end loop;
end $$;

-- The household summary views run as their owner (bypassing table RLS), so
-- the aal2 check has to live in the helpers their WHERE clauses call too.
create or replace function private.is_household_member(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.jwt() ->> 'aal') = 'aal2' and exists (
    select 1
    from public.household_members
    where household_id = target_household_id
      and user_id = (select auth.uid())
  );
$$;

create or replace function private.is_linked_household(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.jwt() ->> 'aal') = 'aal2' and exists (
    select 1
    from public.household_links hl
    join public.household_members hm on hm.user_id = (select auth.uid())
    where hl.status = 'active'
      and (
        (hl.household_a_id = hm.household_id and hl.household_b_id = target_household_id)
        or (hl.household_b_id = hm.household_id and hl.household_a_id = target_household_id)
      )
  );
$$;

-- Same gap for the two SECURITY DEFINER RPCs.
create or replace function public.accept_household_invite(invite_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  invite_row public.household_invites%rowtype;
  accepting_user_id uuid := (select auth.uid());
  accepting_household_id uuid;
  household_a uuid;
  household_b uuid;
begin
  if accepting_user_id is null or (select auth.jwt() ->> 'aal') is distinct from 'aal2' then
    return false;
  end if;

  select * into invite_row
  from public.household_invites
  where token = invite_token
    and status = 'pending'
    and expires_at > now()
  for update;

  if invite_row is null then
    return false;
  end if;

  select household_id into accepting_household_id
  from public.household_members
  where user_id = accepting_user_id;

  if accepting_household_id is null then
    return false;
  end if;

  if accepting_household_id = invite_row.household_id then
    return false;
  end if;

  household_a := least(invite_row.household_id, accepting_household_id);
  household_b := greatest(invite_row.household_id, accepting_household_id);

  insert into public.household_links (household_a_id, household_b_id, status)
  values (household_a, household_b, 'active')
  on conflict (household_a_id, household_b_id)
    do update set status = 'active';

  update public.household_invites
  set status = 'accepted'
  where id = invite_row.id;

  return true;
end;
$$;

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

  select household_id into target_household_id
  from public.household_members
  where user_id = current_user_id;

  if target_household_id is not null then
    delete from public.transactions where household_id = target_household_id;
    delete from public.accounts where household_id = target_household_id;
    delete from public.households where id = target_household_id;
  end if;

  delete from auth.users where id = current_user_id;
end;
$$;

-- 2. household_links: clients may only revoke. Previously either side could
-- flip a revoked link back to 'active', repoint household_b_id, or insert an
-- active link to any household id they knew — skipping the invite entirely.
-- accept_household_invite is SECURITY DEFINER (owner bypasses RLS, same as
-- the summary views rely on), so it doesn't need the client insert policy.
drop policy "insert own household link" on public.household_links;
drop policy "update own household link" on public.household_links;
create policy "revoke own household link" on public.household_links
  for update to authenticated
  using (private.is_household_member(household_a_id) or private.is_household_member(household_b_id))
  with check (status = 'revoked');
revoke insert, update on public.household_links from authenticated;
grant update (status) on public.household_links to authenticated;

-- 3. account_id foreign keys: account ids are sequential bigints, and the FK
-- check bypasses RLS, so a user could attach rows to another household's
-- account (fake points on its Combined net worth chart via
-- household_account_balance_history, or an existence oracle). The subquery
-- runs under the caller's RLS on accounts, so it only sees own-household
-- accounts.
create policy "own account only" on public.account_balance_history
  as restrictive for insert to authenticated
  with check (exists (select 1 from public.accounts a where a.id = account_id));

create policy "own account only" on public.goals
  as restrictive for all to authenticated
  using (true)
  with check (account_id is null or exists (select 1 from public.accounts a where a.id = account_id));
