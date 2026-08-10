"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentHouseholdId } from "@/lib/households";
import { SPENDING_EXCLUDE_CATEGORIES } from "@/lib/constants";
import { buildAccountOverlayData, type OverlayAccount } from "@/lib/build-account-overlay-data";
import { buildCombinedNetWorthChartData, type HouseholdNetWorthBundle } from "@/lib/build-combined-net-worth-chart-data";

export type HouseholdCategoryTotal = { category: string; amount: number };

export type CombinedSpendingSummary = {
  householdId: string;
  combined: HouseholdCategoryTotal[];
  perHousehold: Record<string, HouseholdCategoryTotal[]>;
};

// household_spending_summary's WHERE clause already restricts rows to "my
// household OR actively linked households" — no household_id filter needed
// here, the view itself is the access boundary.
export async function getCombinedSpendingSummary(month?: string): Promise<CombinedSpendingSummary> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const householdId = await getCurrentHouseholdId(supabase, user.id);

  let query = supabase.from("household_spending_summary").select("household_id, month, category, total_amount");
  if (month) query = query.eq("month", month);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  // household_id/category/total_amount are non-null on the underlying
  // transactions table, but view codegen can't carry that constraint
  // through — narrow with a type guard instead of asserting.
  const rows = (data ?? []).filter(
    (r): r is { household_id: string; month: string; category: string; total_amount: number } =>
      r.household_id !== null && r.category !== null && r.total_amount !== null && !SPENDING_EXCLUDE_CATEGORIES.has(r.category),
  );

  const perHousehold: Record<string, HouseholdCategoryTotal[]> = {};
  const combinedByCategory = new Map<string, number>();
  for (const r of rows) {
    const amount = Math.abs(Number(r.total_amount));
    if (!perHousehold[r.household_id]) perHousehold[r.household_id] = [];
    perHousehold[r.household_id].push({ category: r.category, amount });
    combinedByCategory.set(r.category, (combinedByCategory.get(r.category) ?? 0) + amount);
  }

  return {
    householdId,
    combined: Array.from(combinedByCategory, ([category, amount]) => ({ category, amount })),
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
