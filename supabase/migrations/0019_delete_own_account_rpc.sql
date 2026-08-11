-- Self-service account deletion. accounts/transactions reference
-- households(id) with no ON DELETE clause (default NO ACTION/RESTRICT —
-- see 0011's comment), so they must be deleted explicitly before the
-- household row itself; every other table (household_members,
-- household_invites, household_links, category_rules, nw_snapshots,
-- account_templates, goals, user_settings, and Supabase's own
-- auth.identities/sessions/mfa_factors/etc.) already cascades from either
-- households(id) or auth.users(id) — confirmed by inspecting pg_constraint
-- against both tables before writing this migration, not assumed.
--
-- A household always has exactly one member (household_members_
-- one_household_per_user, 0009), so deleting your own household can never
-- remove another user's data — the only cross-household effect is that any
-- active household_links row involving it cascades away too, which simply
-- removes a linked partner's Combined-tab access, not their data.
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

  select household_id into target_household_id
  from public.household_members
  where user_id = current_user_id;

  if target_household_id is not null then
    delete from public.transactions where household_id = target_household_id;
    delete from public.accounts where household_id = target_household_id;
    delete from public.households where id = target_household_id;
  end if;

  -- Cascades everything else: category_rules, nw_snapshots,
  -- account_templates, goals, user_settings, household_members (if somehow
  -- not already gone above), household_invites, and auth's own internal
  -- tables (identities, sessions, mfa_factors, one_time_tokens, oauth_*,
  -- webauthn_*). custom_bank_formats.created_by is SET NULL, not deleted —
  -- it's the one deliberately shared, cross-user table (0005).
  delete from auth.users where id = current_user_id;
end;
$$;

revoke execute on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
