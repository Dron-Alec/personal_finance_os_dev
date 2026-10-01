"use client";

import { clearAllSnapshots, deleteSnapshot } from "@/lib/actions/net-worth";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import { SnapshotDetailDialog } from "@/components/net-worth/snapshot-detail-dialog";
import type { OverlayAccount } from "@/lib/build-account-overlay-data";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import { compareDateStrings } from "@/lib/date-utils";

export type Snapshot = { id: number; date: string; net_worth: number; note: string | null };

export function SnapshotHistory({
  snapshots,
  accounts,
  history,
}: {
  snapshots: Snapshot[];
  accounts: OverlayAccount[];
  history: { account_id: number; balance: number; as_of_date: string }[];
}) {
  const sorted = [...snapshots].sort((a, b) => compareDateStrings(b.date, a.date));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          {snapshots.length} snapshot{snapshots.length === 1 ? "" : "s"}
        </h3>
        {snapshots.length > 0 && (
          <ConfirmActionButton
            label="Clear All Snapshots"
            title="Clear all net worth snapshots?"
            description="This permanently deletes every net worth snapshot. Account balances are not affected."
            confirmLabel="Clear all"
            onConfirm={clearAllSnapshots}
            size="sm"
          />
        )}
      </div>
      {sorted.length > 0 && (
        <div className="max-h-80 overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Net Worth</TableHead>
                <TableHead>Note</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.date}</TableCell>
                  <TableCell className="text-right">{formatCurrency(s.net_worth, 2)}</TableCell>
                  <TableCell className="text-muted-foreground">{s.note}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <SnapshotDetailDialog date={s.date} netWorth={s.net_worth} accounts={accounts} history={history} />
                      <ConfirmActionButton
                        label="Remove"
                        title={`Remove the ${s.date} snapshot?`}
                        description="This permanently deletes this net worth snapshot. Account balances are not affected."
                        confirmLabel="Remove"
                        onConfirm={() => deleteSnapshot(s.id)}
                        size="sm"
                        requireAcknowledgement="I understand this snapshot can never be recovered."
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
