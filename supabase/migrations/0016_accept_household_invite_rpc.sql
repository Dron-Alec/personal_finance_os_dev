-- SECURITY DEFINER RPC: the only way to accept a household_invites token.
-- Runs the validation (token match, not expired, status pending) itself
-- rather than relying on RLS, since the accepting user isn't yet a member
-- of the inviting household and so can't SELECT the invite row under the
-- normal "select own household invites" policy (0009). Always operates on
-- (select auth.uid()) internally — the token is the only untrusted input.
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
  if accepting_user_id is null then
    return false;
  end if;

  select * into invite_row
  from public.household_invites
  where token = invite_token
    and status = 'pending'
    and expires_at > now()
  for update; -- lock the row to prevent a double-accept race

  if invite_row is null then
    return false;
  end if;

  select household_id into accepting_household_id
  from public.household_members
  where user_id = accepting_user_id;

  if accepting_household_id is null then
    -- Should be unreachable post-0014 (every user gets a solo household at
    -- signup), but guard anyway rather than assume.
    return false;
  end if;

  if accepting_household_id = invite_row.household_id then
    return false; -- can't link a household to itself
  end if;

  household_a := least(invite_row.household_id, accepting_household_id);
  household_b := greatest(invite_row.household_id, accepting_household_id);

  insert into public.household_links (household_a_id, household_b_id, status)
  values (household_a, household_b, 'active')
  on conflict (household_a_id, household_b_id)
    do update set status = 'active'; -- re-accepting after a prior revoke re-activates

  update public.household_invites
  set status = 'accepted'
  where id = invite_row.id;

  return true;
end;
$$;

revoke execute on function public.accept_household_invite(text) from public, anon;
grant execute on function public.accept_household_invite(text) to authenticated;
