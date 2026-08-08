import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/format";
import { getAccountColor, getAccountTypeColor } from "@/lib/chart-colors";
import { AccountForm } from "@/components/accounts/account-form";
import { AccountsTable } from "@/components/accounts/accounts-table";
import { BalanceHistorySection } from "@/components/accounts/balance-history-section";
import { BreakdownPieChart } from "@/components/charts/breakdown-pie-chart";
import { TotalsBarChart } from "@/components/charts/totals-bar-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AccountsPage() {
  const supabase = await createClient();

  const [{ data: accounts }, { data: history }] = await Promise.all([
    supabase.from("accounts").select("id, name, type, balance, as_of_date").order("id"),
    supabase.from("account_balance_history").select("account_id, balance, as_of_date"),
  ]);

  const accountList = accounts ?? [];
  const sortedIds = [...accountList].map((a) => a.id).sort((a, b) => a - b);
  const total = accountList.reduce((sum, a) => sum + Number(a.balance), 0);

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
      <Card>
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
          <Card>
            <CardHeader>
              <CardTitle>Total Account Value: {formatCurrency(total, 0)}</CardTitle>
            </CardHeader>
            <CardContent>
              <AccountsTable accounts={accountList} />
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
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

          <Card>
            <CardHeader>
              <CardTitle>Balance History</CardTitle>
            </CardHeader>
            <CardContent>
              <BalanceHistorySection accounts={accountList} history={history ?? []} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
