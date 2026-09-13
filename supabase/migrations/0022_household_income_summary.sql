-- Companion to household_spending_summary (0015), which deliberately
-- excludes amount >= 0 rows so category totals stay homogeneous for the
-- pie chart. Total Spending/Income/Net Cash Flow cards on the Combined
-- page need a household-level income figure too — this view sums the
-- positive side, with no category breakdown (matching how the individual
-- Spending page's own "Total Income" card is a single sum, not
-- category-split). Same Tier 2 privacy boundary as every other household
-- summary view: no transaction-level fields, access baked into the WHERE
-- clause via the private.* helpers, security_barrier so the planner can't
-- push a caller predicate underneath the check.
create view public.household_income_summary
with (security_barrier = true) as
select
  t.household_id,
  date_trunc('month', t.date)::date as month,
  sum(t.amount) as total_income
from public.transactions t
where t.amount > 0
  and (private.is_household_member(t.household_id) or private.is_linked_household(t.household_id))
group by t.household_id, date_trunc('month', t.date);

grant select on public.household_income_summary to authenticated;
