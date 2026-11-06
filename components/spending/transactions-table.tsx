"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { recategorizeTransactions } from "@/lib/actions/transactions";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CategorySwatch } from "@/components/category-swatch";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Row = { id: number; date: string; description: string; amount: number; bank: string; category: string };

export function TransactionsTable({ rows, categories }: { rows: Row[]; categories: string[] }) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [category, setCategory] = useState(categories[0] ?? "Other");
  const [pending, startTransition] = useTransition();

  // Only rows still visible under the current filters count — a selection
  // made before narrowing the search shouldn't silently ride along.
  const selectedIds = rows.filter((r) => selected.has(r.id)).map((r) => r.id);
  const allSelected = rows.length > 0 && selectedIds.length === rows.length;

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function apply() {
    startTransition(async () => {
      try {
        await recategorizeTransactions(selectedIds, category);
        toast.success(`Moved ${selectedIds.length} to ${category}.`);
        setSelected(new Set());
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted-foreground">
          {selectedIds.length > 0
            ? `${selectedIds.length} selected — move to`
            : "Select transactions to re-categorize them"}
        </p>
        <div className="w-48">
          <SearchableSelect value={category} onChange={setCategory} options={categories} />
        </div>
        <Button type="button" onClick={apply} disabled={pending || selectedIds.length === 0}>
          {pending ? "Applying…" : "Apply"}
        </Button>
        {selectedIds.length > 0 && (
          <Button type="button" variant="ghost" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        )}
      </div>
      <div className="max-h-96 overflow-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <Checkbox
                  aria-label="Select all shown"
                  checked={allSelected}
                  indeterminate={selectedIds.length > 0 && !allSelected}
                  onCheckedChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)))}
                />
              </TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Bank</TableHead>
              <TableHead>Category</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((t) => (
              <TableRow
                key={t.id}
                onClick={() => toggle(t.id)}
                className={cn("cursor-pointer", selected.has(t.id) && "bg-muted/50")}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    aria-label={`Select ${t.description}`}
                    checked={selected.has(t.id)}
                    onCheckedChange={() => toggle(t.id)}
                  />
                </TableCell>
                <TableCell>{t.date}</TableCell>
                <TableCell className="max-w-64 truncate">{t.description}</TableCell>
                <TableCell className="text-right">{formatCurrency(t.amount, 2)}</TableCell>
                <TableCell className="text-muted-foreground">{t.bank}</TableCell>
                <TableCell className="text-muted-foreground">
                  <CategorySwatch category={t.category} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
