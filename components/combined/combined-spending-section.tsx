"use client";

import { useState } from "react";
import { getCategoryColor } from "@/lib/chart-colors";
import { BreakdownPieChart } from "@/components/charts/breakdown-pie-chart";
import { MonthlyStackedBarChart, type MonthlySeries } from "@/components/charts/monthly-stacked-bar-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ViewToggle, type CombinedView } from "@/components/combined/view-toggle";
import type { CombinedSpendingSummary, HouseholdCategoryTotal, MonthlyCategoryRow } from "@/lib/actions/household-summaries";

function seriesFor(categoryTotals: HouseholdCategoryTotal[]): MonthlySeries[] {
  return categoryTotals.map((c) => ({ key: c.category, name: c.category, color: getCategoryColor(c.category) }));
}

function SpendingCharts({ categoryTotals, monthly }: { categoryTotals: HouseholdCategoryTotal[]; monthly: MonthlyCategoryRow[] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-muted-foreground">By Category</p>
        <BreakdownPieChart data={categoryTotals.map((c) => ({ name: c.category, value: c.amount, color: getCategoryColor(c.category) }))} />
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-muted-foreground">Monthly by Category</p>
        <MonthlyStackedBarChart data={monthly} series={seriesFor(categoryTotals)} />
      </div>
    </div>
  );
}

export function CombinedSpendingSection({ data }: { data: CombinedSpendingSummary }) {
  const [view, setView] = useState<CombinedView>("combined");
  const householdIds = Object.keys(data.perHousehold);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>Spending</CardTitle>
        <ViewToggle value={view} onChange={setView} />
      </CardHeader>
      <CardContent>
        {view === "combined" ? (
          <SpendingCharts categoryTotals={data.combined} monthly={data.combinedMonthly} />
        ) : (
          <div className="flex flex-col gap-6">
            {householdIds.map((householdId) => (
              <div key={householdId} className="flex flex-col gap-2">
                <p className="text-sm font-medium text-muted-foreground">
                  {householdId === data.householdId ? "Your household" : "Linked household"}
                </p>
                <SpendingCharts
                  categoryTotals={data.perHousehold[householdId]}
                  monthly={data.perHouseholdMonthly[householdId] ?? []}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
