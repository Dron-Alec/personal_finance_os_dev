-- household_income_summary (0022) summed every positive row, including the
-- receiving side of Internal Transfers between a household's own accounts,
-- while spending already excludes them — so Net Cash Flow was inflated by
-- every savings→checking move. Exclude them here too (matches
-- computeSpendingMetrics in lib/spending-utils.ts).
create or replace view public.household_income_summary
with (security_barrier = true) as
select
  t.household_id,
  date_trunc('month', t.date)::date as month,
  sum(t.amount) as total_income
from public.transactions t
where t.amount > 0
  and t.category is distinct from 'Internal Transfer'
  and (private.is_household_member(t.household_id) or private.is_linked_household(t.household_id))
group by t.household_id, date_trunc('month', t.date);
