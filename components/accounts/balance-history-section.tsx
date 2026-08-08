"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { BalanceHistoryChart } from "@/components/charts/balance-history-chart";
import { getAccountColor } from "@/lib/chart-colors";
import { parseLocalDate } from "@/lib/date-utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";

export type HistoryRow = { account_id: number; balance: number; as_of_date: string };
export type AccountOption = { id: number; name: string };

export function BalanceHistorySection({
  accounts,
  history,
}: {
  accounts: AccountOption[];
  history: HistoryRow[];
}) {
  const [selectedId, setSelectedId] = useState<string>(accounts[0] ? String(accounts[0].id) : "");

  const sortedIds = useMemo(() => accounts.map((a) => a.id).sort((a, b) => a - b), [accounts]);
  const color = getAccountColor(Number(selectedId), sortedIds);

  const rows = useMemo(
    () =>
      history
        .filter((h) => String(h.account_id) === selectedId)
        .sort((a, b) => (a.as_of_date < b.as_of_date ? -1 : 1)),
    [history, selectedId],
  );

  const chartData = rows.map((r) => ({
    date: r.as_of_date,
    label: format(parseLocalDate(r.as_of_date), "MMM d, yyyy"),
    balance: r.balance,
  }));

  if (accounts.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="max-w-xs">
        <Select value={selectedId} onValueChange={(v) => setSelectedId(v ?? "")}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={String(a.id)}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No history yet for this account — entries appear here after the next save.
        </p>
      ) : (
        <>
          <BalanceHistoryChart data={chartData} color={color} />
          <div className="max-h-64 overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...rows].reverse().map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{r.as_of_date}</TableCell>
                    <TableCell className="text-right">{formatCurrency(r.balance, 2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
