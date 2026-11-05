-- Put the cross-household summary views back the way 0015/0022 designed
-- them. On live, three had been switched to security_invoker=on outside the
-- migrations (most likely by accepting the advisor's "Security Definer
-- View" fix). That made them run under the caller's RLS on accounts /
-- transactions — which only covers the caller's own household — so the
-- Combined tab silently showed nothing for the linked household. On a
-- fresh database this is a no-op.
--
-- The advisor will keep flagging these four views. That's expected: access
-- is enforced in each view's WHERE clause (is_household_member /
-- is_linked_household, both aal2-gated since 0024) and they only expose
-- category/month/account-level aggregates. Don't "fix" it.
alter view public.household_spending_summary set (security_invoker = off);
alter view public.household_income_summary set (security_invoker = off);
alter view public.household_account_balances set (security_invoker = off);
alter view public.household_account_balance_history set (security_invoker = off);

-- Supabase's default grants gave anon (and write privileges to
-- authenticated) on these views. They only ever need SELECT for signed-in
-- users; for anon the WHERE clause already returns nothing — this just
-- removes the surface.
revoke all on public.household_spending_summary, public.household_income_summary,
  public.household_account_balances, public.household_account_balance_history from anon;
revoke insert, update, delete, truncate, references, trigger
  on public.household_spending_summary, public.household_income_summary,
     public.household_account_balances, public.household_account_balance_history
  from authenticated;

-- rls_auto_enable() is Supabase's "auto-enable RLS on new tables" event
-- trigger (created by the dashboard, so absent on a fresh local database).
-- Event-trigger functions can't be invoked through the API anyway; revoking
-- EXECUTE just clears the advisor warning. The trigger keeps working.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;
