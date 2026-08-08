"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { saveMonthlyBalances } from "@/lib/actions/data-entry";
import { STANDARD_ACCOUNTS } from "@/lib/constants";
import { lastDayOfPreviousMonth, toDateInputValue } from "@/lib/date-utils";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type ExistingAccount = { id: number; name: string; balance: number };

export function BalanceEntryForm({ accounts }: { accounts: ExistingAccount[] }) {
  const [state, formAction, pending] = useActionState(saveMonthlyBalances, {});
  const prevPending = useRef(pending);

  const missingStandards = useMemo(
    () => STANDARD_ACCOUNTS.filter(([name]) => !accounts.some((a) => a.name === name)),
    [accounts],
  );

  const [existingValues, setExistingValues] = useState<Record<number, number>>(() =>
    Object.fromEntries(accounts.map((a) => [a.id, a.balance])),
  );
  const [standardValues, setStandardValues] = useState<Record<number, number>>({});

  useEffect(() => {
    if (prevPending.current && !pending) {
      if (state.error) {
        toast.error(state.error);
      } else if ("totalNetWorth" in state && state.totalNetWorth !== undefined) {
        toast.success(`Saved! Net worth snapshot of ${formatCurrency(state.totalNetWorth, 2)} recorded.`);
      }
    }
    prevPending.current = pending;
  }, [pending, state]);

  const total =
    Object.values(existingValues).reduce((s, v) => s + (v || 0), 0) +
    Object.values(standardValues).reduce((s, v) => s + (v || 0), 0);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5 sm:max-w-xs">
        <Label htmlFor="entryDate">Balance Date (month-end)</Label>
        <Input
          id="entryDate"
          name="entryDate"
          type="date"
          defaultValue={toDateInputValue(lastDayOfPreviousMonth())}
          required
        />
      </div>

      {accounts.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Your accounts</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {accounts.map((a) => (
              <div key={a.id} className="flex flex-col gap-1.5">
                <Label htmlFor={`existing_${a.id}`}>{a.name}</Label>
                <Input
                  id={`existing_${a.id}`}
                  name={`existing_${a.id}`}
                  type="number"
                  step="0.01"
                  defaultValue={a.balance}
                  onChange={(e) =>
                    setExistingValues((prev) => ({ ...prev, [a.id]: Number(e.target.value) || 0 }))
                  }
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {accounts.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No accounts set up yet — add them in the Accounts tab first, or use the standard list
          below.
        </p>
      )}

      {missingStandards.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Standard accounts <span className="font-normal text-muted-foreground">(leave at 0 to skip)</span></p>
          <div className="grid gap-3 sm:grid-cols-2">
            {STANDARD_ACCOUNTS.map(([name, type], index) => {
              if (accounts.some((a) => a.name === name)) return null;
              return (
                <div key={name} className="flex flex-col gap-1.5">
                  <Label htmlFor={`standard_${index}`}>
                    {name} <span className="text-xs text-muted-foreground">({type})</span>
                  </Label>
                  <Input
                    id={`standard_${index}`}
                    name={`standard_${index}`}
                    type="number"
                    step="0.01"
                    defaultValue={0}
                    onChange={(e) =>
                      setStandardValues((prev) => ({ ...prev, [index]: Number(e.target.value) || 0 }))
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-4">
        <span className="text-sm text-muted-foreground">Total Net Worth (this entry)</span>
        <span className="text-2xl font-semibold">{formatCurrency(total, 2)}</span>
      </div>

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Saving…" : "Save Balances & Snapshot"}
      </Button>
    </form>
  );
}
