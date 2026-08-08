"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { XIcon } from "lucide-react";
import { toast } from "sonner";
import { addAccountTemplate, removeAccountTemplate } from "@/lib/actions/account-templates";
import { AccountTypeSelect } from "@/components/accounts/account-type-select";
import { saveMonthlyBalances } from "@/lib/actions/data-entry";
import { ACCOUNT_TYPES } from "@/lib/constants";
import { lastDayOfPreviousMonth, toDateInputValue } from "@/lib/date-utils";
import { formatCurrency } from "@/lib/format";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type ExistingAccount = { id: number; name: string; balance: number };
export type AccountTemplate = { id: number; name: string; type: string };

export function BalanceEntryForm({
  accounts,
  templates,
}: {
  accounts: ExistingAccount[];
  templates: AccountTemplate[];
}) {
  const [state, formAction, pending] = useActionState(saveMonthlyBalances, {});
  const prevPending = useRef(pending);

  const missingTemplates = useMemo(
    () => templates.filter((t) => !accounts.some((a) => a.name === t.name)),
    [accounts, templates],
  );

  const [existingValues, setExistingValues] = useState<Record<number, number>>(() =>
    Object.fromEntries(accounts.map((a) => [a.id, a.balance])),
  );
  const [templateValues, setTemplateValues] = useState<Record<number, number>>({});

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
    Object.values(templateValues).reduce((s, v) => s + (v || 0), 0);

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
          No accounts set up yet — add them in the Accounts tab first, or use the suggestions
          below.
        </p>
      )}

      {missingTemplates.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">
            Suggested accounts <span className="font-normal text-muted-foreground">(leave at 0 to skip)</span>
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {missingTemplates.map((t) => (
              <div key={t.id} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor={`template_${t.id}`}>
                    {t.name} <span className="text-xs text-muted-foreground">({t.type})</span>
                  </Label>
                  <ConfirmActionButton
                    label={<XIcon className="size-3.5" />}
                    title={`Remove "${t.name}" suggestion?`}
                    description="This just removes it from the suggestion list — it won't affect any accounts you've already created."
                    confirmLabel="Remove"
                    onConfirm={() => removeAccountTemplate(t.id)}
                    variant="ghost"
                    size="icon-xs"
                  />
                </div>
                <Input
                  id={`template_${t.id}`}
                  name={`template_${t.id}`}
                  type="number"
                  step="0.01"
                  defaultValue={0}
                  onChange={(e) =>
                    setTemplateValues((prev) => ({ ...prev, [t.id]: Number(e.target.value) || 0 }))
                  }
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <AddTemplateForm />

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

// Not a <form>: it renders inside the outer balance-entry <form>, and HTML
// doesn't allow nested forms. Submits via a direct server action call
// instead of useActionState's form-action wiring.
function AddTemplateForm() {
  const [name, setName] = useState("");
  const [type, setType] = useState<string>(ACCOUNT_TYPES[0]);
  const [pending, startTransition] = useTransition();

  function handleAdd() {
    if (!name.trim()) {
      toast.error("Name is required.");
      return;
    }
    startTransition(async () => {
      const formData = new FormData();
      formData.set("name", name);
      formData.set("type", type);
      const result = await addAccountTemplate({}, formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Suggestion added.");
        setName("");
        setType(ACCOUNT_TYPES[0]);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-md border border-dashed p-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-template-name">Add a suggested account</Label>
        <Input
          id="new-template-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Fidelity 401k"
          className="w-48"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-template-type">Type</Label>
        <AccountTypeSelect id="new-template-type" value={type} onChange={setType} />
      </div>
      <Button type="button" variant="outline" disabled={pending} onClick={handleAdd}>
        {pending ? "Adding…" : "Add"}
      </Button>
    </div>
  );
}
