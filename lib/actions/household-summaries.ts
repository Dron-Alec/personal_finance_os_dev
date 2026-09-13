"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentHouseholdId } from "@/lib/households";
import { SPENDING_EXCLUDE_CATEGORIES } from "@/lib/constants";
import { buildAccountOverlayData, type OverlayAccount } from "@/lib/build-account-overlay-data";
import { buildCombinedNetWorthChartData, type HouseholdNetWorthBundle } from "@/lib/build-combined-net-worth-chart-data";

export type HouseholdCategoryTotal = { category: string; amount: number };

// Same row shape MonthlyStackedBarChart already consumes on the individual
// Spending page (lib/spending-utils.ts buildMonthlyCategoryData) — a month
// plus one numeric field per category, so the same chart component works
// unmodified here.
export type MonthlyCategoryRow = { month: string } & Record<string, number | string>;

export type CombinedSpendingSummary = {
  householdId: string;
  combined: HouseholdCategoryTotal[];
  perHousehold: Record<string, HouseholdCategoryTotal[]>;
  combinedMonthly: MonthlyCategoryRow[];
  perHouseholdMonthly: Record<string, MonthlyCategoryRow[]>;
};

function buildMonthlyRows(entries: { month: string; category: string; amount: number }[]): MonthlyCategoryRow[] {
  const months = new Map<string, Map<string, number>>();
  const categories = new Set<string>();
  for (const e of entries) {
    categories.add(e.category);
    if (!months.has(e.month)) months.set(e.month, new Map());
    const catMap = months.get(e.month)!;
    catMap.set(e.category, (catMap.get(e.category) ?? 0) + e.amount);
  }
  return Array.from(months.keys())
    .sort()
    .map((month) => {
      const row: MonthlyCategoryRow = { month };
      for (const cat of categories) row[cat] = months.get(month)!.get(cat) ?? 0;
      return row;
    });
}

// Union of both views' `month` columns rather than just one — a household
// with, say, only income in a given month (no spending rows at all) would
// otherwise silently drop that month from the picker. Values are full dates
// ("2026-07-01", from date_trunc) so they can be passed straight back into
// getCombinedCashFlow/getCombinedSpendingSummary's own `.eq("month", …)`
// filters without reformatting.
export async function getCombinedAvailableMonths(): Promise<string[]> {
  const supabase = await createClient();
  const [{ data: spendingMonths, error: spendingError }, { data: incomeMonths, error: incomeError }] = await Promise.all([
    supabase.from("household_spending_summary").select("month"),
    supabase.from("household_income_summary").select("month"),
  ]);
  if (spendingError) throw new Error(spendingError.message);
  if (incomeError) throw new Error(incomeError.message);

  const months = new Set<string>();
  for (const r of spendingMonths ?? []) if (r.month) months.add(r.month);
  for (const r of incomeMonths ?? []) if (r.month) months.add(r.month);
  return Array.from(months).sort().reverse();
}

// Distinct categories already scoped to spending (household_spending_summary
// only ever has amount<0 rows), same as the individual page's own category
// dropdown (app/(app)/spending/page.tsx derives dataCategories the same way,
// from whatever categories actually appear in the data).
export async function getCombinedAvailableCategories(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("household_spending_summary").select("category");
  if (error) throw new Error(error.message);

  const categories = new Set<string>();
  for (const r of data ?? []) if (r.category) categories.add(r.category);
  return Array.from(categories).sort();
}

// household_spending_summary's WHERE clause already restricts rows to "my
// household OR actively linked households" — no household_id filter needed
// here, the view itself is the access boundary.
export async function getCombinedSpendingSummary(month?: string, category?: string): Promise<CombinedSpendingSummary> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const householdId = await getCurrentHouseholdId(supabase, user.id);

  let query = supabase.from("household_spending_summary").select("household_id, month, category, total_amount");
  if (month) query = query.eq("month", month);
  if (category) query = query.eq("category", category);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  // household_id/category/total_amount are non-null on the underlying
  // transactions table, but view codegen can't carry that constraint
  // through — narrow with a type guard instead of asserting.
  const rows = (data ?? []).filter(
    (r): r is { household_id: string; month: string; category: string; total_amount: number } =>
      r.household_id !== null && r.category !== null && r.total_amount !== null && !SPENDING_EXCLUDE_CATEGORIES.has(r.category),
  );

  // household_spending_summary is grouped by (household, month, category), so
  // a household with the same category in more than one month yields
  // multiple rows here — aggregate into one Map per household (mirroring
  // combinedByCategory below) rather than pushing every row straight into
  // the array, which produced duplicate category entries (and React key
  // collisions) in the per-household pie chart/legend.
  const perHouseholdByCategory = new Map<string, Map<string, number>>();
  const combinedByCategory = new Map<string, number>();
  // month comes back as a full date ("2026-07-01") from date_trunc — sliced
  // to "YYYY-MM" to match the individual page's x-axis labels.
  const monthlyEntries: { household_id: string; month: string; category: string; amount: number }[] = [];
  for (const r of rows) {
    const amount = Math.abs(Number(r.total_amount));
    if (!perHouseholdByCategory.has(r.household_id)) perHouseholdByCategory.set(r.household_id, new Map());
    const catTotals = perHouseholdByCategory.get(r.household_id)!;
    catTotals.set(r.category, (catTotals.get(r.category) ?? 0) + amount);
    combinedByCategory.set(r.category, (combinedByCategory.get(r.category) ?? 0) + amount);
    monthlyEntries.push({ household_id: r.household_id, month: r.month.slice(0, 7), category: r.category, amount });
  }

  const perHousehold: Record<string, HouseholdCategoryTotal[]> = {};
  for (const [hid, catTotals] of perHouseholdByCategory) {
    perHousehold[hid] = Array.from(catTotals, ([category, amount]) => ({ category, amount }));
  }

  const perHouseholdMonthly: Record<string, MonthlyCategoryRow[]> = {};
  for (const hid of new Set(monthlyEntries.map((e) => e.household_id))) {
    perHouseholdMonthly[hid] = buildMonthlyRows(monthlyEntries.filter((e) => e.household_id === hid));
  }

  return {
    householdId,
    combined: Array.from(combinedByCategory, ([category, amount]) => ({ category, amount })),
    perHousehold,
    combinedMonthly: buildMonthlyRows(monthlyEntries),
    perHouseholdMonthly,
  };
}

export type HouseholdCashFlow = { totalSpending: number; totalIncome: number; netCashFlow: number };

export type CombinedCashFlow = {
  householdId: string;
  combined: HouseholdCashFlow;
  perHousehold: Record<string, HouseholdCashFlow>;
};

// Total Spending comes from household_spending_summary (same
// category-exclusion rule as the individual page's spendingRows — Internal
// Transfer/Income categories don't count as spend), and narrows with the
// `category` filter the same way. Total Income has no category concept at
// all — household_income_summary (0022) intentionally carries no category
// column — so a category filter never changes it: unlike the individual
// Spending page (whose Total Income card is computed from the same
// already-category-filtered row set as spending, and so incidentally drops
// to $0 once you filter to a spending-only category), Combined's Total
// Income stays the household's real total regardless of the category
// filter, which is more useful than reproducing that drop-to-zero quirk.
export async function getCombinedCashFlow(month?: string, category?: string): Promise<CombinedCashFlow> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const householdId = await getCurrentHouseholdId(supabase, user.id);

  let spendingQuery = supabase.from("household_spending_summary").select("household_id, category, total_amount");
  let incomeQuery = supabase.from("household_income_summary").select("household_id, total_income");
  if (month) {
    spendingQuery = spendingQuery.eq("month", month);
    incomeQuery = incomeQuery.eq("month", month);
  }
  if (category) spendingQuery = spendingQuery.eq("category", category);
  const [{ data: spendingRows, error: spendingError }, { data: incomeRows, error: incomeError }] = await Promise.all([
    spendingQuery,
    incomeQuery,
  ]);
  if (spendingError) throw new Error(spendingError.message);
  if (incomeError) throw new Error(incomeError.message);

  const spendingByHousehold = new Map<string, number>();
  for (const r of spendingRows ?? []) {
    if (r.household_id === null || r.category === null || r.total_amount === null) continue;
    if (SPENDING_EXCLUDE_CATEGORIES.has(r.category)) continue;
    spendingByHousehold.set(r.household_id, (spendingByHousehold.get(r.household_id) ?? 0) + Math.abs(Number(r.total_amount)));
  }

  const incomeByHousehold = new Map<string, number>();
  for (const r of incomeRows ?? []) {
    if (r.household_id === null || r.total_income === null) continue;
    incomeByHousehold.set(r.household_id, (incomeByHousehold.get(r.household_id) ?? 0) + Number(r.total_income));
  }

  const householdIds = new Set([...spendingByHousehold.keys(), ...incomeByHousehold.keys()]);
  const perHousehold: Record<string, HouseholdCashFlow> = {};
  let combinedSpending = 0;
  let combinedIncome = 0;
  for (const hid of householdIds) {
    const totalSpending = spendingByHousehold.get(hid) ?? 0;
    const totalIncome = incomeByHousehold.get(hid) ?? 0;
    perHousehold[hid] = { totalSpending, totalIncome, netCashFlow: totalIncome - totalSpending };
    combinedSpending += totalSpending;
    combinedIncome += totalIncome;
  }

  return {
    householdId,
    combined: {
      totalSpending: combinedSpending,
      totalIncome: combinedIncome,
      netCashFlow: combinedIncome - combinedSpending,
    },
    perHousehold,
  };
}

export type CombinedNetWorth = {
  householdId: string;
  perHousehold: HouseholdNetWorthBundle[];
  combined: ReturnType<typeof buildCombinedNetWorthChartData>;
};

export async function getCombinedNetWorth(): Promise<CombinedNetWorth> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const householdId = await getCurrentHouseholdId(supabase, user.id);

  const [{ data: rawBalances, error: balancesError }, { data: rawHistory, error: historyError }] = await Promise.all([
    supabase.from("household_account_balances").select("household_id, account_id, account_name"),
    supabase.from("household_account_balance_history").select("household_id, account_id, balance, as_of_date"),
  ]);
  if (balancesError) throw new Error(balancesError.message);
  if (historyError) throw new Error(historyError.message);

  // household_id/account_id/account_name are non-null on the underlying
  // accounts table, but view codegen can't carry that constraint through —
  // narrow with a type guard instead of asserting.
  const balances = (rawBalances ?? []).filter(
    (b): b is { household_id: string; account_id: number; account_name: string } =>
      b.household_id !== null && b.account_id !== null && b.account_name !== null,
  );
  const history = (rawHistory ?? []).filter(
    (h): h is { household_id: string; account_id: number; balance: number; as_of_date: string } =>
      h.household_id !== null && h.account_id !== null && h.balance !== null && h.as_of_date !== null,
  );

  const householdIds = Array.from(new Set(balances.map((b) => b.household_id)));

  const perHousehold: HouseholdNetWorthBundle[] = householdIds.map((hid) => {
    const accounts: OverlayAccount[] = balances.filter((b) => b.household_id === hid).map((b) => ({ id: b.account_id, name: b.account_name }));
    const hHistory = history.filter((h) => h.household_id === hid);
    return { householdId: hid, accounts, overlayData: buildAccountOverlayData(accounts, hHistory) };
  });

  return { householdId, perHousehold, combined: buildCombinedNetWorthChartData(perHousehold) };
}
