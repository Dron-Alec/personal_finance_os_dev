"use client";

import { useState } from "react";
import { getAccountBalancesAsOf, type OverlayAccount } from "@/lib/build-account-overlay-data";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function SnapshotDetailDialog({
  date,
  netWorth,
  accounts,
  history,
}: {
  date: string;
  netWorth: number;
  accounts: OverlayAccount[];
  history: { account_id: number; balance: number; as_of_date: string }[];
}) {
  const [open, setOpen] = useState(false);
  // Computed lazily (only while open) rather than on every render of every
  // row in the history table.
  const balances = open ? getAccountBalancesAsOf(accounts, history, date) : [];
  const hasAny = balances.some((b) => b.balance !== null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="outline" size="sm">View</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{date}</DialogTitle>
          <DialogDescription>
            Each account&apos;s balance as of this date, reconstructed from balance history — not stored with the
            snapshot itself, so this works even for snapshots entered before this existed.
          </DialogDescription>
        </DialogHeader>
        {hasAny ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {balances.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>{b.name}</TableCell>
                  <TableCell className="text-right">{b.balance === null ? "—" : formatCurrency(b.balance, 2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">No account balance history exists on or before this date.</p>
        )}
        <p className="text-sm text-muted-foreground">Snapshot total: {formatCurrency(netWorth, 2)}</p>
      </DialogContent>
    </Dialog>
  );
}
