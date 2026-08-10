"use client";

import { useMemo, useState } from "react";
import { NetWorthChart, type GoalLine, type GoalSeries } from "@/components/charts/net-worth-chart";
import { buildNetWorthChartData, type GoalCurve } from "@/lib/build-net-worth-chart-data";
import { buildFilteredNetWorthSeries } from "@/lib/build-filtered-net-worth-series";
import { toDateInputValue } from "@/lib/date-utils";
import { formatCurrency, formatSignedCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const RANGE_PRESETS: { label: string; months: number | null }[] = [
  { label: "1Y", months: 12 },
  { label: "3Y", months: 36 },
  { label: "5Y", months: 60 },
  { label: "All", months: null },
];

export type AccountOption = { id: number; name: string };
export type HistoryRow = { account_id: number; balance: number; as_of_date: string };
export type SnapshotRow = { date: string; net_worth: number };
export type TargetRow = { quarter: string; target_net_worth: number };

export function NetWorthChartSection({
  accounts,
  history,
  snapshots,
  targets,
  currentQuarter,
  goalLines,
  goalSeries,
  goalCurves,
}: {
  accounts: AccountOption[];
  history: HistoryRow[];
  snapshots: SnapshotRow[]; // sorted ascending
  targets: TargetRow[];
  currentQuarter: string;
  goalLines: GoalLine[];
  goalSeries: GoalSeries[];
  goalCurves: GoalCurve[];
}) {
  const [selectedAccountIds, setSelectedAccountIds] = useState<number[] | null>(null); // null = all accounts
  const [selectedGoalIds, setSelectedGoalIds] = useState<number[] | null>(null); // null = all goals shown
  const [rangeMonths, setRangeMonths] = useState<number | null>(null); // null = all time

  const allSelected = selectedAccountIds === null;
  const activeIds = selectedAccountIds ?? accounts.map((a) => a.id);

  const allGoals = useMemo(
    () => [...goalLines.map((g) => ({ id: g.id, name: g.name })), ...goalSeries.map((g) => ({ id: g.id, name: g.name }))],
    [goalLines, goalSeries],
  );
  const goalsVisible = selectedGoalIds === null;
  const activeGoalIds = selectedGoalIds ?? allGoals.map((g) => g.id);

  const filteredSeries = useMemo(() => {
    if (allSelected) return snapshots.map((s) => ({ date: s.date, value: s.net_worth }));
    return buildFilteredNetWorthSeries(activeIds, history);
  }, [allSelected, activeIds, snapshots, history]);

  const latest = filteredSeries.at(-1);
  const prev = filteredSeries.at(-2);
  const target = targets.find((t) => t.quarter === currentQuarter);

  // Target line + goal overlays are scoped to *total* net worth — showing
  // them against a filtered subset would compare apples to oranges, so they
  // only render when every account is included. Within that, each goal can
  // still be toggled off individually (on by default).
  const chartGoalLines = allSelected ? goalLines.filter((g) => activeGoalIds.includes(g.id)) : [];
  const chartGoalSeries = allSelected ? goalSeries.filter((g) => activeGoalIds.includes(g.id)) : [];

  const rawData = useMemo(() => {
    const chartGoalCurves = allSelected ? goalCurves.filter((c) => activeGoalIds.includes(c.id)) : [];
    return buildNetWorthChartData(
      filteredSeries.map((p) => ({ date: p.date, net_worth: p.value })),
      allSelected ? targets : [],
      chartGoalCurves,
    );
  }, [filteredSeries, allSelected, targets, goalCurves, activeGoalIds]);

  const data = useMemo(() => {
    if (rangeMonths === null) return rawData;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - rangeMonths);
    const cutoffStr = toDateInputValue(cutoff);
    return rawData.filter((r) => r.date >= cutoffStr);
  }, [rawData, rangeMonths]);

  function toggleAccount(id: number) {
    setSelectedAccountIds((prevIds) => {
      const current = prevIds ?? accounts.map((a) => a.id);
      const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
      // Selecting every account collapses back to "all" (null) so it stays
      // driven by the accurate nw_snapshots total, not a recomputed sum.
      return next.length === accounts.length ? null : next;
    });
  }

  function toggleGoal(id: number) {
    setSelectedGoalIds((prevIds) => {
      const current = prevIds ?? allGoals.map((g) => g.id);
      const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
      return next.length === allGoals.length ? null : next;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>{allSelected ? "Current Net Worth" : "Selected Accounts Total"}</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(latest?.value ?? 0, 0)}</CardTitle>
          </CardHeader>
        </Card>
        {allSelected && target && latest && (
          <Card>
            <CardHeader>
              <CardDescription>{currentQuarter} Target</CardDescription>
              <CardTitle className="text-2xl">{formatCurrency(target.target_net_worth, 0)}</CardTitle>
              <CardDescription>
                {formatSignedCurrency(latest.value - target.target_net_worth, 0)} vs. target
              </CardDescription>
            </CardHeader>
          </Card>
        )}
        {prev && latest && (
          <Card>
            <CardHeader>
              <CardDescription>Δ Since Last Entry</CardDescription>
              <CardTitle className="text-2xl">{formatSignedCurrency(latest.value - prev.value, 0)}</CardTitle>
            </CardHeader>
          </Card>
        )}
      </div>

      <Card data-tour="nw-chart">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Net Worth Over Time</CardTitle>
            <CardDescription>Filter by date range or by which accounts count toward the line.</CardDescription>
          </div>
          <div className="flex gap-1">
            {RANGE_PRESETS.map((r) => (
              <Button
                key={r.label}
                type="button"
                size="sm"
                variant={rangeMonths === r.months ? "secondary" : "outline"}
                onClick={() => setRangeMonths(r.months)}
              >
                {r.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {accounts.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                type="button"
                size="xs"
                variant={allSelected ? "secondary" : "outline"}
                onClick={() => setSelectedAccountIds(null)}
              >
                All accounts
              </Button>
              {accounts.map((a) => (
                <Button
                  key={a.id}
                  type="button"
                  size="xs"
                  variant={activeIds.includes(a.id) ? "secondary" : "outline"}
                  onClick={() => toggleAccount(a.id)}
                >
                  {a.name}
                </Button>
              ))}
            </div>
          )}
          {allSelected && allGoals.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                type="button"
                size="xs"
                variant={goalsVisible ? "secondary" : "outline"}
                onClick={() => setSelectedGoalIds(null)}
              >
                All goals
              </Button>
              {allGoals.map((g) => (
                <Button
                  key={g.id}
                  type="button"
                  size="xs"
                  variant={activeGoalIds.includes(g.id) ? "secondary" : "outline"}
                  onClick={() => toggleGoal(g.id)}
                >
                  {g.name}
                </Button>
              ))}
            </div>
          )}
          <NetWorthChart
            data={data}
            goalLines={chartGoalLines}
            goalSeries={chartGoalSeries}
            seriesName={allSelected ? "Net Worth" : "Selected Accounts"}
          />
        </CardContent>
      </Card>
    </div>
  );
}
