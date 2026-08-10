"use client";

import { useState } from "react";
import { NetWorthChart } from "@/components/charts/net-worth-chart";
import { AccountOverlayChart } from "@/components/charts/account-overlay-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ViewToggle, type CombinedView } from "@/components/combined/view-toggle";
import type { CombinedNetWorth } from "@/lib/actions/household-summaries";

export function CombinedNetWorthSection({ data }: { data: CombinedNetWorth }) {
  const [view, setView] = useState<CombinedView>("combined");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>Net Worth</CardTitle>
        <ViewToggle value={view} onChange={setView} />
      </CardHeader>
      <CardContent>
        {view === "combined" ? (
          <NetWorthChart data={data.combined} seriesName="Combined Net Worth" />
        ) : (
          <div className="flex flex-col gap-6">
            {data.perHousehold.map((bundle) => (
              <div key={bundle.householdId} className="flex flex-col gap-2">
                <p className="text-sm font-medium text-muted-foreground">
                  {bundle.householdId === data.householdId ? "Your household" : "Linked household"}
                </p>
                <AccountOverlayChart data={bundle.overlayData} accounts={bundle.accounts} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
