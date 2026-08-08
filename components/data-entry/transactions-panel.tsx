"use client";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";

export type TransactionRow = {
  id: number;
  date: string;
  description: string;
  amount: number;
  bank: string;
  category: string;
};

function downloadCsv(rows: TransactionRow[]) {
  const header = "Date,Description,Amount,Bank,Category";
  const escape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = rows.map((r) =>
    [r.date, escape(r.description), r.amount, escape(r.bank), escape(r.category)].join(","),
  );
  const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "transactions.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function TransactionsPanel({ transactions }: { transactions: TransactionRow[] }) {
  const sorted = [...transactions].sort((a, b) => (a.date < b.date ? 1 : -1));

  if (sorted.length === 0) {
    return <p className="text-muted-foreground">No transactions yet — upload a CSV above.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{sorted.length} transactions on file</p>
        <Button type="button" variant="outline" size="sm" onClick={() => downloadCsv(sorted)}>
          Download all transactions as CSV
        </Button>
      </div>
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
            {sorted.map((t) => (
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
    </div>
  );
}
