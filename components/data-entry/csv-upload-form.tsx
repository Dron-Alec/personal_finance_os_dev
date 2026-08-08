"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { importCsv } from "@/lib/actions/transactions";
import { BANK_FORMATS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function CsvUploadForm() {
  const [state, formAction, pending] = useActionState(importCsv, {});
  const formRef = useRef<HTMLFormElement>(null);
  const prevPending = useRef(pending);

  useEffect(() => {
    if (prevPending.current && !pending) {
      if (state.error) {
        toast.error(state.error);
      } else if ("imported" in state && state.imported !== undefined) {
        toast.success(
          `Imported ${state.imported} transaction${state.imported === 1 ? "" : "s"} (${state.duplicates} duplicate${state.duplicates === 1 ? "" : "s"} skipped).`,
        );
        formRef.current?.reset();
      }
    }
    prevPending.current = pending;
  }, [pending, state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4 sm:flex-row sm:items-end">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="bankFormat">Statement Format</Label>
        <select
          id="bankFormat"
          name="bankFormat"
          className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
          defaultValue={BANK_FORMATS[0]}
        >
          {BANK_FORMATS.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-1 flex-col gap-1.5">
        <Label htmlFor="files">CSV files (multiple OK)</Label>
        <input
          id="files"
          name="files"
          type="file"
          accept=".csv"
          multiple
          className="border-input rounded-md border bg-transparent text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm"
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Importing…" : "Import Transactions"}
      </Button>
    </form>
  );
}
