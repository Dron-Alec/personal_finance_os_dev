import { createClient } from "@/lib/supabase/server";
import { currentQuarter } from "@/lib/date-utils";
import { formatCurrency, formatSignedCurrency } from "@/lib/format";
import { buildNetWorthChartData } from "@/lib/build-net-worth-chart-data";
import { buildAccountOverlayData } from "@/lib/build-account-overlay-data";
import { computeGoalProgress, type Goal } from "@/lib/goals";
import { NetWorthChart } from "@/components/charts/net-worth-chart";
import { AccountOverlayChart } from "@/components/charts/account-overlay-chart";
import { SnapshotForm } from "@/components/net-worth/snapshot-form";
import { SnapshotHistory } from "@/components/net-worth/snapshot-history";
import { GoalForm } from "@/components/goals/goal-form";
import { GoalCard } from "@/components/goals/goal-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NetWorthPage() {
  const supabase = await createClient();

  const [{ data: snapshots }, { data: targets }, { data: goals }, { data: accounts }, { data: history }] =
    await Promise.all([
      supabase.from("nw_snapshots").select("id, date, net_worth, note").order("date"),
      supabase.from("nw_targets").select("quarter, target_net_worth").order("quarter"),
      supabase.from("goals").select("*").order("created_at"),
      supabase.from("accounts").select("id, name, balance").order("name"),
      supabase.from("account_balance_history").select("account_id, balance, as_of_date"),
    ]);

  const sortedSnapshots = [...(snapshots ?? [])].sort((a, b) => (a.date < b.date ? -1 : 1));
  const latest = sortedSnapshots.at(-1);
  const prev = sortedSnapshots.at(-2);
  const cq = currentQuarter();
  const target = (targets ?? []).find((t) => t.quarter === cq);

  const accountList = accounts ?? [];
  const accountsById = new Map(accountList.map((a) => [a.id, a]));
  const latestNetWorth = latest?.net_worth ?? 0;

  const goalRows = (goals ?? []) as Goal[];
  const goalCards = goalRows.map((goal) => {
    const currentValue =
      goal.scope_type === "account"
        ? Number(accountsById.get(goal.account_id ?? -1)?.balance ?? 0)
        : Number(latestNetWorth);
    const scopeLabel =
      goal.scope_type === "account"
        ? (accountsById.get(goal.account_id ?? -1)?.name ?? "Deleted account")
        : "Net Worth (aggregate)";
    return { goal, progress: computeGoalProgress(goal, currentValue), scopeLabel };
  });

  const overlayData = buildAccountOverlayData(accountList, history ?? []);

  return (
    <div className="flex flex-col gap-6">
      <Card data-tour="snapshot-form">
        <CardHeader>
          <CardTitle>Add / Update Snapshot</CardTitle>
          <CardDescription>Manually record a net worth snapshot for any date.</CardDescription>
        </CardHeader>
        <CardContent>
          <SnapshotForm />
        </CardContent>
      </Card>

      <Card data-tour="goals">
        <CardHeader>
          <CardTitle>Goals</CardTitle>
          <CardDescription>
            Track a target amount by a date, scoped to your net worth or a single account.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <GoalForm accounts={accountList} />
          {goalCards.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {goalCards.map(({ goal, progress, scopeLabel }) => (
                <GoalCard key={goal.id} goal={goal} progress={progress} scopeLabel={scopeLabel} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {overlayData.length > 0 && (
        <Card data-tour="account-overlay">
          <CardHeader>
            <CardTitle>Accounts Compared</CardTitle>
            <CardDescription>Every account&apos;s balance over time, on one chart.</CardDescription>
          </CardHeader>
          <CardContent>
            <AccountOverlayChart data={overlayData} accounts={accountList} />
          </CardContent>
        </Card>
      )}

      {!latest ? (
        <p className="text-muted-foreground">
          No snapshots yet — add your first net worth entry above.
        </p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader>
                <CardDescription>Current Net Worth</CardDescription>
                <CardTitle className="text-2xl">{formatCurrency(latest.net_worth, 0)}</CardTitle>
              </CardHeader>
            </Card>
            {target && (
              <Card>
                <CardHeader>
                  <CardDescription>{cq} Target</CardDescription>
                  <CardTitle className="text-2xl">
                    {formatCurrency(target.target_net_worth, 0)}
                  </CardTitle>
                  <CardDescription>
                    {formatSignedCurrency(latest.net_worth - target.target_net_worth, 0)} vs. target
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
            {prev && (
              <Card>
                <CardHeader>
                  <CardDescription>Δ Since Last Entry</CardDescription>
                  <CardTitle className="text-2xl">
                    {formatSignedCurrency(latest.net_worth - prev.net_worth, 0)}
                  </CardTitle>
                </CardHeader>
              </Card>
            )}
          </div>

          <Card data-tour="nw-chart">
            <CardContent>
              <NetWorthChart data={buildNetWorthChartData(sortedSnapshots, targets ?? [])} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Snapshot History</CardTitle>
            </CardHeader>
            <CardContent>
              <SnapshotHistory snapshots={sortedSnapshots} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
