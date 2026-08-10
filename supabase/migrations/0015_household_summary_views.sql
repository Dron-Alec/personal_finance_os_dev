-- Tier 2 summary views: category-level spending and account balances,
-- shared with an actively-linked household. Structurally exclude every
-- transaction-level field (description, merchant, exact date, line-item
-- amount) — that's the Tier 1 guarantee, enforced here at the data layer,
-- not filtered in application code.
--
-- Postgres has no RLS on views — access control here is baked directly
-- into each view's WHERE clause via the private.* helpers (0009), which
-- always re-derive auth.uid() internally. security_barrier=true so the
-- planner can't push a caller-supplied predicate underneath the access
-- check. Supabase's advisor will flag these as "Security Definer View"
-- warnings — expected and correct for this design, not something to "fix"
-- by switching to security_invoker (that would break the entire
-- cross-household read path).

-- Deviates from a naive `sum(amount)` by restricting to amount < 0: without
-- it, refunds/credits net against spending within the same category+month,
-- which doesn't match how the individual spending page computes its pie
-- chart (lib/spending-utils.ts takes only amount<0 rows, then abs()s them).
-- Category-level exclusions (Internal Transfer, Income) are deliberately
-- NOT baked in here — applied as a JS-layer filter importing the same
-- SPENDING_EXCLUDE_CATEGORIES constant the individual page uses, so the
-- two views of "spending" can't drift out of sync via a forgotten SQL edit.
create view public.household_spending_summary
with (security_barrier = true) as
select
  t.household_id,
  date_trunc('month', t.date)::date as month,
  t.category,
  sum(t.amount) as total_amount
from public.transactions t
where t.amount < 0
  and (private.is_household_member(t.household_id) or private.is_linked_household(t.household_id))
group by t.household_id, date_trunc('month', t.date), t.category;

grant select on public.household_spending_summary to authenticated;

create view public.household_account_balances
with (security_barrier = true) as
select
  a.household_id,
  a.id as account_id,
  a.name as account_name,
  a.type as account_type,
  a.balance,
  a.as_of_date
from public.accounts a
where private.is_household_member(a.household_id) or private.is_linked_household(a.household_id);

grant select on public.household_account_balances to authenticated;

-- Not in the original two-view spec — household_account_balances only
-- exposes a single current point per account, not a series, so it can't
-- build a combined net worth graph over time on its own. Resolves
-- household_id via a join to accounts rather than a schema change to
-- account_balance_history itself (see 0011's comment on why that table was
-- left untouched). Still no transaction-level fields, consistent with the
-- Tier 2 boundary.
create view public.household_account_balance_history
with (security_barrier = true) as
select
  a.household_id,
  h.account_id,
  h.balance,
  h.as_of_date
from public.account_balance_history h
join public.accounts a on a.id = h.account_id
where private.is_household_member(a.household_id) or private.is_linked_household(a.household_id);

grant select on public.household_account_balance_history to authenticated;
