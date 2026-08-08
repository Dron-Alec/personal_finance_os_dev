import { createClient } from "@/lib/supabase/server";
import { DEFAULT_CATEGORY_RULES } from "@/lib/constants";
import {
  ALL,
  applyFilters,
  buildCategoryTotals,
  buildMonthlyCategoryData,
  computeSpendingMetrics,
} from "@/lib/spending-utils";
import { getCategoryColor } from "@/lib/chart-colors";
import { formatCurrency, formatSignedCurrency } from "@/lib/format";
import { SpendingFilters } from "@/components/spending/spending-filters";
import { RecategorizePanel } from "@/components/spending/recategorize-panel";
import { BreakdownPieChart } from "@/components/charts/breakdown-pie-chart";
import { MonthlyStackedBarChart } from "@/components/charts/monthly-stacked-bar-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function SpendingPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; category?: string; bank?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const [{ data: transactions }, { data: ruleRow }] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, date, description, amount, bank, category")
      .order("date", { ascending: false }),
    supabase.from("category_rules").select("rules").single(),
  ]);

  const all = transactions ?? [];
  if (all.length === 0) {
    return <p className="text-muted-foreground">No transactions yet — import CSV statements first.</p>;
  }

  const filters = {
    month: params.month ?? ALL,
    category: params.category ?? ALL,
    bank: params.bank ?? ALL,
  };

  const months = Array.from(new Set(all.map((t) => t.date.slice(0, 7)))).sort().reverse();
  const dataCategories = Array.from(new Set(all.map((t) => t.category))).sort();
  const banks = Array.from(new Set(all.map((t) => t.bank))).sort();

  const filtered = applyFilters(all, filters);
  const { totalSpending, totalIncome, netCashFlow, spendingRows } = computeSpendingMetrics(
    filtered,
    filters,
  );
  const categoryTotals = buildCategoryTotals(spendingRows);
  const pieData = categoryTotals.map((c) => ({ ...c, color: getCategoryColor(c.name) }));

  const { rows: monthlyRows, categories: monthlyCategories } = buildMonthlyCategoryData(spendingRows);
  const monthlySeries = monthlyCategories.map((c) => ({ key: c, name: c, color: getCategoryColor(c) }));

  const ruleCategories = (ruleRow?.rules ?? DEFAULT_CATEGORY_RULES).map((r) => r.category);
  const recategorizeCategories = Array.from(new Set([...ruleCategories, "Other"])).sort();
  const descriptions = Array.from(new Set(all.map((t) => t.description))).sort();

  const sortedTable = [...filtered].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="flex flex-col gap-6">
      <SpendingFilters months={months} categories={dataCategories} banks={banks} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">Total Spending</CardTitle>
            <p className="text-2xl font-semibold">{formatCurrency(totalSpending, 2)}</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">Total Income / Credits</CardTitle>
            <p className="text-2xl font-semibold">{formatCurrency(totalIncome, 2)}</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">Net Cash Flow</CardTitle>
            <p className="text-2xl font-semibold">{formatSignedCurrency(netCashFlow, 2)}</p>
          </CardHeader>
        </Card>
      </div>

      {spendingRows.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Spending by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <BreakdownPieChart data={pieData} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Monthly by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <MonthlyStackedBarChart data={monthlyRows} series={monthlySeries} />
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead>Category</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTable.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{t.date}</TableCell>
                    <TableCell className="max-w-64 truncate">{t.description}</TableCell>
                    <TableCell className="text-right">{formatCurrency(t.amount, 2)}</TableCell>
                    <TableCell className="text-muted-foreground">{t.bank}</TableCell>
                    <TableCell className="text-muted-foreground">{t.category}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Re-categorize Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <RecategorizePanel descriptions={descriptions} categories={recategorizeCategories} />
        </CardContent>
      </Card>
    </div>
  );
}
