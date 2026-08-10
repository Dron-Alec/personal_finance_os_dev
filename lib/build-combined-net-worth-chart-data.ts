import { format } from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";
import type { OverlayAccount, OverlayRow } from "@/lib/build-account-overlay-data";
import type { NetWorthPoint } from "@/components/charts/net-worth-chart";

export type HouseholdNetWorthBundle = {
  householdId: string;
  accounts: OverlayAccount[];
  overlayData: OverlayRow[];
};

/**
 * One row per distinct date across all linked households' account history,
 * each household's total forward-filled from its last known value (same
 * reasoning as buildAccountOverlayData) and then summed into a single
 * combined net worth line. `target` is always null — goals don't have a
 * household-scoped concept.
 */
export function buildCombinedNetWorthChartData(perHousehold: HouseholdNetWorthBundle[]): NetWorthPoint[] {
  const householdTotals = perHousehold.map(({ householdId, accounts, overlayData }) => ({
    householdId,
    totals: overlayData.map((row) => ({
      date: row.date,
      total: accounts.reduce((sum, a) => sum + (Number(row[String(a.id)]) || 0), 0),
    })),
  }));

  const dates = Array.from(new Set(householdTotals.flatMap((h) => h.totals.map((t) => t.date)))).sort();
  if (dates.length === 0) return [];

  const cursors = new Map<string, number>();
  for (const h of householdTotals) cursors.set(h.householdId, -1);

  return dates.map((date) => {
    let netWorth = 0;
    for (const h of householdTotals) {
      let idx = cursors.get(h.householdId) ?? -1;
      while (idx + 1 < h.totals.length && h.totals[idx + 1].date <= date) idx++;
      cursors.set(h.householdId, idx);
      netWorth += idx >= 0 ? h.totals[idx].total : 0;
    }
    return { date, label: format(parseLocalDate(date), "MMM d, yyyy"), netWorth, target: null };
  });
}
