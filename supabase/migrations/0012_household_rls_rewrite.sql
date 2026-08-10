-- Rewrite accounts/transactions RLS from user_id = auth.uid() to household
-- membership. Behavior-preserving today: household_members enforces
-- exactly one member per household (0009) and no household_links exist
-- yet, so private.is_household_member(household_id) grants identical
-- access to the old policy for both current users — this migration's risk
-- surface is plumbing correctness, not an actual access change.

drop policy "select own" on public.accounts;
drop policy "insert own" on public.accounts;
drop policy "update own" on public.accounts;
drop policy "delete own" on public.accounts;

create policy "select household" on public.accounts
  for select to authenticated using (private.is_household_member(household_id));
create policy "insert household" on public.accounts
  for insert to authenticated with check (private.is_household_member(household_id));
create policy "update household" on public.accounts
  for update to authenticated using (private.is_household_member(household_id)) with check (private.is_household_member(household_id));
create policy "delete household" on public.accounts
  for delete to authenticated using (private.is_household_member(household_id));

drop policy "select own" on public.transactions;
drop policy "insert own" on public.transactions;
drop policy "update own" on public.transactions;
drop policy "delete own" on public.transactions;

create policy "select household" on public.transactions
  for select to authenticated using (private.is_household_member(household_id));
create policy "insert household" on public.transactions
  for insert to authenticated with check (private.is_household_member(household_id));
create policy "update household" on public.transactions
  for update to authenticated using (private.is_household_member(household_id)) with check (private.is_household_member(household_id));
create policy "delete household" on public.transactions
  for delete to authenticated using (private.is_household_member(household_id));
