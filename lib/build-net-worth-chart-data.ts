import { format } from "date-fns";
import { parseLocalDate, quarterToDate, toDateInputValue } from "@/lib/date-utils";
import type { NetWorthPoint } from "@/components/charts/net-worth-chart";

type Snapshot = { date: string; net_worth: number };
type Target = { quarter: string; target_net_worth: number };

export function buildNetWorthChartData(
  snapshots: Snapshot[],
  targets: Target[],
): NetWorthPoint[] {
  const byDate = new Map<string, NetWorthPoint>();

  function getRow(date: string): NetWorthPoint {
    const existing = byDate.get(date);
    if (existing) return existing;
    const row: NetWorthPoint = { date, label: format(parseLocalDate(date), "MMM yyyy"), netWorth: null, target: null };
    byDate.set(date, row);
    return row;
  }

  for (const s of snapshots) {
    getRow(s.date).netWorth = s.net_worth;
  }
  for (const t of targets) {
    const date = toDateInputValue(quarterToDate(t.quarter));
    getRow(date).target = t.target_net_worth;
  }

  return Array.from(byDate.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
}
