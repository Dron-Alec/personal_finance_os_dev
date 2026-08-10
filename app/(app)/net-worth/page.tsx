import { createClient } from "@/lib/supabase/server";
import { currentQuarter } from "@/lib/date-utils";
import { buildAccountOverlayData } from "@/lib/build-account-overlay-data";
import { computeGoalProgress, projectGoalCurve, type Goal } from "@/lib/goals";
import { CATEGORICAL_PALETTE } from "@/lib/chart-colors";
import type { GoalLine, GoalSeries } from "@/components/charts/net-worth-chart";
import type { GoalCurve } from "@/lib/build-net-worth-chart-data";
import { NetWorthChartSection } from "@/components/net-worth/net-worth-chart-section";
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
  const cq = currentQuarter();

  const accountList = accounts ?? [];
  const accountsById = new Map(accountList.map((a) => [a.id, a]));
  const latestNetWorth = Number(latest?.net_worth ?? 0);
  const netWorthHistory = sortedSnapshots.map((s) => ({ date: s.date, balance: Number(s.net_worth) }));
  const historyList = history ?? [];

  const goalRows = (goals ?? []) as Goal[];
  const goalCards = goalRows.map((goal, index) => {
    const isAccount = goal.scope_type === "account";
    const currentValue = isAccount ? Number(accountsById.get(goal.account_id ?? -1)?.balance ?? 0) : latestNetWorth;
    const balanceHistory = isAccount
      ? historyList
          .filter((h) => h.account_id === goal.account_id)
          .map((h) => ({ date: h.as_of_date, balance: Number(h.balance) }))
      : netWorthHistory;
    const scopeLabel = isAccount
      ? (accountsById.get(goal.account_id ?? -1)?.name ?? "Deleted account")
      : "Net Worth (aggregate)";
    return {
      goal,
      progress: computeGoalProgress(goal, currentValue, balanceHistory),
      scopeLabel,
      color: CATEGORICAL_PALETTE[index % CATEGORICAL_PALETTE.length],
      curvePoints: projectGoalCurve(goal, currentValue),
    };
  });

  // Goals with a contribution plan get a projected trajectory line
  // (GoalSeries/GoalCurve); goals without one fall back to the flat
  // horizontal target line (GoalLine) they've always had.
  const netWorthScoped = goalCards.filter(({ goal }) => goal.scope_type === "net_worth");
  const netWorthGoalLines: GoalLine[] = netWorthScoped
    .filter((g) => g.curvePoints.length === 0)
    .map(({ goal, color }) => ({ id: goal.id, name: goal.name, targetAmount: goal.target_amount, color }));
  const netWorthGoalSeries: GoalSeries[] = netWorthScoped
    .filter((g) => g.curvePoints.length > 0)
    .map(({ goal, color }) => ({ id: goal.id, name: goal.name, color }));
  const netWorthGoalCurves: GoalCurve[] = netWorthScoped
    .filter((g) => g.curvePoints.length > 0)
    .map(({ goal, curvePoints }) => ({ id: goal.id, points: curvePoints }));

  const overlayData = buildAccountOverlayData(accountList, historyList);

  const snapshotFormCard = (
    <Card data-tour="snapshot-form">
      <CardHeader>
        <CardTitle>Add / Update Snapshot</CardTitle>
        <CardDescription>Manually record a net worth snapshot for any date.</CardDescription>
      </CardHeader>
      <CardContent>
        <SnapshotForm />
      </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-col gap-6">
      {!latest ? (
        <>
          <p className="text-muted-foreground">
            No snapshots yet — add your first net worth entry below.
          </p>
          {snapshotFormCard}
        </>
      ) : (
        <NetWorthChartSection
          accounts={accountList}
          history={historyList}
          snapshots={sortedSnapshots}
          targets={targets ?? []}
          currentQuarter={cq}
          goalLines={netWorthGoalLines}
          goalSeries={netWorthGoalSeries}
          goalCurves={netWorthGoalCurves}
        />
      )}

      <Card data-tour="goals">
        <CardHeader>
          <CardTitle>Goals</CardTitle>
          <CardDescription>
            Track a target amount by a date, scoped to your net worth or a single account.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <GoalForm
            accounts={accountList.map((a) => ({ id: a.id, name: a.name, balance: Number(a.balance) }))}
            netWorthCurrent={latestNetWorth}
          />
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

      {latest && (
        <>
          {snapshotFormCard}

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
