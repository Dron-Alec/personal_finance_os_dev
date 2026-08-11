"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { completeOnboarding, skipOnboarding } from "@/lib/actions/onboarding";
import { AccountTypeSelect } from "@/components/accounts/account-type-select";
import { AccountBankSelect } from "@/components/accounts/account-bank-select";
import { ACCOUNT_TYPES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type OnboardingTemplate = {
  id: number;
  name: string;
  type: string;
  bank_format: string | null;
};

type NewRow = { key: number; name: string; type: string; bank: string };

export function OnboardingForm({
  templates,
  redirectTo,
}: {
  templates: OnboardingTemplate[];
  redirectTo?: string;
}) {
  const [state, formAction, pending] = useActionState(completeOnboarding, {});
  const prevPending = useRef(pending);

  const [banks, setBanks] = useState<Record<number, string>>(() =>
    Object.fromEntries(templates.map((t) => [t.id, t.bank_format ?? ""])),
  );
  const [newRows, setNewRows] = useState<NewRow[]>([]);
  const nextKey = useRef(0);

  useEffect(() => {
    if (prevPending.current && !pending && state.error) {
      toast.error(state.error);
    }
    prevPending.current = pending;
  }, [pending, state]);

  function addRow() {
    setNewRows((rows) => [...rows, { key: nextKey.current++, name: "", type: ACCOUNT_TYPES[0], bank: "" }]);
  }

  function updateRow(key: number, patch: Partial<NewRow>) {
    setNewRows((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function removeRow(key: number) {
    setNewRows((rows) => rows.filter((r) => r.key !== key));
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}

      {templates.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">Which of these do you have?</p>
          {templates.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center gap-3 rounded-md border p-3">
              <label className="flex flex-1 items-center gap-2 text-sm">
                <input type="checkbox" name="keep" value={t.id} defaultChecked className="size-4" />
                <span className="font-medium">{t.name}</span>
                <span className="text-xs text-muted-foreground">({t.type})</span>
              </label>
              <div className="flex flex-col gap-1 sm:w-56">
                <Label htmlFor={`bank-${t.id}`} className="text-xs text-muted-foreground">
                  Bank / card (optional)
                </Label>
                <AccountBankSelect
                  id={`bank-${t.id}`}
                  name={`bank_${t.id}`}
                  value={banks[t.id] ?? ""}
                  onChange={(v) => setBanks((b) => ({ ...b, [t.id]: v }))}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium">Anything else?</p>
        {newRows.map((row, idx) => (
          <div key={row.key} className="flex flex-wrap items-end gap-3 rounded-md border border-dashed p-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor={`new-name-${row.key}`} className="text-xs text-muted-foreground">
                Account name
              </Label>
              <Input
                id={`new-name-${row.key}`}
                name={`new_name_${idx}`}
                value={row.name}
                onChange={(e) => updateRow(row.key, { name: e.target.value })}
                placeholder="e.g. Fidelity 401k"
                className="w-44"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor={`new-type-${row.key}`} className="text-xs text-muted-foreground">
                Type
              </Label>
              <AccountTypeSelect
                id={`new-type-${row.key}`}
                name={`new_type_${idx}`}
                value={row.type}
                onChange={(v) => updateRow(row.key, { type: v })}
              />
            </div>
            <div className="flex flex-col gap-1 sm:w-56">
              <Label htmlFor={`new-bank-${row.key}`} className="text-xs text-muted-foreground">
                Bank / card (optional)
              </Label>
              <AccountBankSelect
                id={`new-bank-${row.key}`}
                name={`new_bank_${idx}`}
                value={row.bank}
                onChange={(v) => updateRow(row.key, { bank: v })}
              />
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => removeRow(row.key)}>
              Remove
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" className="w-fit" onClick={addRow}>
          + Add an account
        </Button>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Continue"}
        </Button>
        <Button type="submit" formAction={skipOnboarding} variant="ghost" disabled={pending}>
          Skip for now
        </Button>
      </div>
    </form>
  );
}
