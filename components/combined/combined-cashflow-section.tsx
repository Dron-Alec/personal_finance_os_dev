"use client";

import { useState } from "react";
import { DELTA_BAD_COLOR, DELTA_GOOD_COLOR } from "@/lib/chart-colors";
import { formatCurrency, formatSignedCurrency } from "@/lib/format";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ViewToggle, type CombinedView } from "@/components/combined/view-toggle";
import type { CombinedCashFlow, HouseholdCashFlow } from "@/lib/actions/household-summaries";

function CashFlowCards({ data }: { data: HouseholdCashFlow }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-normal text-muted-foreground">Total Spending</CardTitle>
          <p className="text-2xl font-semibold">{formatCurrency(data.totalSpending, 2)}</p>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-normal text-muted-foreground">Total Income / Credits</CardTitle>
          <p className="text-2xl font-semibold">{formatCurrency(data.totalIncome, 2)}</p>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-normal text-muted-foreground">Net Cash Flow</CardTitle>
          <p
            className="text-2xl font-semibold"
            style={{ color: data.netCashFlow >= 0 ? DELTA_GOOD_COLOR : DELTA_BAD_COLOR }}
          >
            {formatSignedCurrency(data.netCashFlow, 2)}
          </p>
        </CardHeader>
      </Card>
    </div>
  );
}

export function CombinedCashFlowSection({ data }: { data: CombinedCashFlow }) {
  const [view, setView] = useState<CombinedView>("combined");
  const householdIds = Object.keys(data.perHousehold);

  return (
    <div className="flex flex-col gap-3" data-tour="combined-cashflow">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">Cash Flow</p>
        <ViewToggle value={view} onChange={setView} />
      </div>
      {view === "combined" ? (
        <CashFlowCards data={data.combined} />
      ) : (
        <div className="flex flex-col gap-4">
          {householdIds.map((householdId) => (
            <div key={householdId} className="flex flex-col gap-2">
              <p className="text-sm font-medium text-muted-foreground">
                {householdId === data.householdId ? "Your household" : "Linked household"}
              </p>
              <CashFlowCards data={data.perHousehold[householdId]} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
