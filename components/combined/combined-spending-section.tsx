"use client";

import { useState } from "react";
import { getCategoryColor } from "@/lib/chart-colors";
import { BreakdownPieChart } from "@/components/charts/breakdown-pie-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ViewToggle, type CombinedView } from "@/components/combined/view-toggle";
import type { CombinedSpendingSummary } from "@/lib/actions/household-summaries";

export function CombinedSpendingSection({ data }: { data: CombinedSpendingSummary }) {
  const [view, setView] = useState<CombinedView>("combined");
  const householdIds = Object.keys(data.perHousehold);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>Spending by Category</CardTitle>
        <ViewToggle value={view} onChange={setView} />
      </CardHeader>
      <CardContent>
        {view === "combined" ? (
          <BreakdownPieChart data={data.combined.map((c) => ({ name: c.category, value: c.amount, color: getCategoryColor(c.category) }))} />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {householdIds.map((householdId) => (
              <div key={householdId} className="flex flex-col gap-2">
                <p className="text-sm font-medium text-muted-foreground">
                  {householdId === data.householdId ? "Your household" : "Linked household"}
                </p>
                <BreakdownPieChart
                  data={data.perHousehold[householdId].map((c) => ({
                    name: c.category,
                    value: c.amount,
                    color: getCategoryColor(c.category),
                  }))}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
