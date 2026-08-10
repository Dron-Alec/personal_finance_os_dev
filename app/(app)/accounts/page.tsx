import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/format";
import { getAccountColor, getAccountTypeColor, CATEGORICAL_PALETTE } from "@/lib/chart-colors";
import { projectGoalCurve, type Goal } from "@/lib/goals";
import { AccountForm } from "@/components/accounts/account-form";
import { AccountsTable } from "@/components/accounts/accounts-table";
import { BalanceHistorySection } from "@/components/accounts/balance-history-section";
import { BreakdownPieChart } from "@/components/charts/breakdown-pie-chart";
import { TotalsBarChart } from "@/components/charts/totals-bar-chart";
import type { GoalLine, GoalSeries } from "@/components/charts/balance-history-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AccountsPage() {
  const supabase = await createClient();

  const [{ data: accounts }, { data: history }, { data: goals }] = await Promise.all([
    supabase.from("accounts").select("id, name, type, balance, as_of_date, bank_format").order("id"),
    supabase.from("account_balance_history").select("account_id, balance, as_of_date"),
    supabase
      .from("goals")
      .select("*")
      .eq("scope_type", "account"),
  ]);

  const accountList = accounts ?? [];
  const accountsById = new Map(accountList.map((a) => [a.id, a]));
  const sortedIds = [...accountList].map((a) => a.id).sort((a, b) => a - b);
  const total = accountList.reduce((sum, a) => sum + Number(a.balance), 0);

  // Goals with a contribution plan get a projected trajectory line
  // (GoalSeries/curve); goals without one fall back to the flat horizontal
  // target line (GoalLine) they've always had.
  const goalLinesByAccount: Record<number, GoalLine[]> = {};
  const goalSeriesByAccount: Record<number, GoalSeries[]> = {};
  const goalCurvesByAccount: Record<number, { id: number; points: ReturnType<typeof projectGoalCurve> }[]> = {};
  (goals ?? []).forEach((raw, index) => {
    const g = raw as Goal;
    if (g.account_id === null) return;
    const color = CATEGORICAL_PALETTE[index % CATEGORICAL_PALETTE.length];
    const currentBalance = Number(accountsById.get(g.account_id)?.balance ?? 0);
    const curvePoints = projectGoalCurve(g, currentBalance);
    if (curvePoints.length > 0) {
      (goalSeriesByAccount[g.account_id] ??= []).push({ id: g.id, name: g.name, color });
      (goalCurvesByAccount[g.account_id] ??= []).push({ id: g.id, points: curvePoints });
    } else {
      (goalLinesByAccount[g.account_id] ??= []).push({
        id: g.id,
        name: g.name,
        targetAmount: Number(g.target_amount),
        color,
      });
    }
  });

  const pieData = accountList.map((a) => ({
    name: a.name,
    value: Number(a.balance),
    color: getAccountColor(a.id, sortedIds),
  }));

  const typeTotals = new Map<string, number>();
  for (const a of accountList) {
    typeTotals.set(a.type, (typeTotals.get(a.type) ?? 0) + Number(a.balance));
  }
  const typeBarData = Array.from(typeTotals.entries()).map(([type, value]) => ({
    name: type,
    value,
    color: getAccountTypeColor(type),
  }));

  return (
    <div className="flex flex-col gap-6">
      <Card data-tour="account-form">
        <CardHeader>
          <CardTitle>Add / Update Account</CardTitle>
        </CardHeader>
        <CardContent>
          <AccountForm accounts={accountList} />
        </CardContent>
      </Card>

      {accountList.length === 0 ? (
        <p className="text-muted-foreground">
          Add your checking, savings, investment, and retirement accounts above.
        </p>
      ) : (
        <>
          <Card data-tour="accounts-table">
            <CardHeader>
              <CardTitle>Total Account Value: {formatCurrency(total, 0)}</CardTitle>
            </CardHeader>
            <CardContent>
              <AccountsTable accounts={accountList} />
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card data-tour="portfolio-breakdown">
              <CardHeader>
                <CardTitle>Portfolio Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <BreakdownPieChart data={pieData} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>By Account Type</CardTitle>
              </CardHeader>
              <CardContent>
                <TotalsBarChart data={typeBarData} />
              </CardContent>
            </Card>
          </div>

          <Card data-tour="balance-history">
            <CardHeader>
              <CardTitle>Balance History</CardTitle>
            </CardHeader>
            <CardContent>
              <BalanceHistorySection
                accounts={accountList}
                history={history ?? []}
                goalLinesByAccount={goalLinesByAccount}
                goalSeriesByAccount={goalSeriesByAccount}
                goalCurvesByAccount={goalCurvesByAccount}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
