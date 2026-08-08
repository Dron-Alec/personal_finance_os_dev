import { createClient } from "@/lib/supabase/server";
import { currentQuarter } from "@/lib/date-utils";
import { formatCurrency, formatSignedCurrency } from "@/lib/format";
import { buildNetWorthChartData } from "@/lib/build-net-worth-chart-data";
import { NetWorthChart } from "@/components/charts/net-worth-chart";
import { SnapshotForm } from "@/components/net-worth/snapshot-form";
import { SnapshotHistory } from "@/components/net-worth/snapshot-history";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NetWorthPage() {
  const supabase = await createClient();

  const [{ data: snapshots }, { data: targets }] = await Promise.all([
    supabase.from("nw_snapshots").select("id, date, net_worth, note").order("date"),
    supabase.from("nw_targets").select("quarter, target_net_worth").order("quarter"),
  ]);

  const sortedSnapshots = [...(snapshots ?? [])].sort((a, b) => (a.date < b.date ? -1 : 1));
  const latest = sortedSnapshots.at(-1);
  const prev = sortedSnapshots.at(-2);
  const cq = currentQuarter();
  const target = (targets ?? []).find((t) => t.quarter === cq);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Add / Update Snapshot</CardTitle>
          <CardDescription>Manually record a net worth snapshot for any date.</CardDescription>
        </CardHeader>
        <CardContent>
          <SnapshotForm />
        </CardContent>
      </Card>

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

          <Card>
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
