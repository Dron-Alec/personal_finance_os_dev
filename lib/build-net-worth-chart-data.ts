import { format } from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";
import type { BalancePoint } from "@/lib/goals";
import type { NetWorthPoint } from "@/components/charts/net-worth-chart";

type Snapshot = { date: string; net_worth: number };
export type GoalCurve = { id: number; points: BalancePoint[] };

export function buildNetWorthChartData(snapshots: Snapshot[], goalCurves: GoalCurve[] = []): NetWorthPoint[] {
  const byDate = new Map<string, NetWorthPoint>();

  function getRow(date: string): NetWorthPoint {
    const existing = byDate.get(date);
    if (existing) return existing;
    const row: NetWorthPoint = { date, label: format(parseLocalDate(date), "MMM yyyy"), netWorth: null };
    byDate.set(date, row);
    return row;
  }

  for (const s of snapshots) {
    getRow(s.date).netWorth = s.net_worth;
  }
  for (const gc of goalCurves) {
    const key = `goal_${gc.id}`;
    for (const point of gc.points) {
      getRow(point.date)[key] = point.balance;
    }
  }

  return Array.from(byDate.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
}
