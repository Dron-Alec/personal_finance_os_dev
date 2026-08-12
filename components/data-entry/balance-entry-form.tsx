"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ChevronDownIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { addAccountTemplate, removeAccountTemplate } from "@/lib/actions/account-templates";
import { AccountTypeSelect } from "@/components/accounts/account-type-select";
import { saveMonthlyBalances } from "@/lib/actions/data-entry";
import { ACCOUNT_TYPES, signedBalance } from "@/lib/constants";
import { lastDayOfPreviousMonth, toDateInputValue } from "@/lib/date-utils";
import { formatCurrency } from "@/lib/format";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type ExistingAccount = { id: number; name: string; balance: number; type: string; is_liability: boolean };
export type AccountTemplate = { id: number; name: string; type: string };

// Stored balances are already signed (negative for Credit Card / liability
// accounts, see signedBalance) — inputs always show/accept the positive
// amount, matching how everyone actually thinks about what they owe.
function isNegativeType(type: string, isLiability: boolean): boolean {
  return type === "Credit Card" || isLiability;
}

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

  // Keyed by account id, holds the positive "as displayed/typed" amount —
  // negated at total-calculation time below, not here.
  const [existingValues, setExistingValues] = useState<Record<number, number>>(() =>
    Object.fromEntries(
      accounts.map((a) => [a.id, isNegativeType(a.type, a.is_liability) ? Math.abs(a.balance) : a.balance]),
    ),
  );
  const [templateValues, setTemplateValues] = useState<Record<number, number>>({});
  const [templateLiability, setTemplateLiability] = useState<Record<number, boolean>>({});

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
    accounts.reduce((s, a) => s + signedBalance(a.type, existingValues[a.id] || 0, a.is_liability), 0) +
    missingTemplates.reduce(
      (s, t) => s + signedBalance(t.type, templateValues[t.id] || 0, templateLiability[t.id] ?? false),
      0,
    );

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
            {accounts.map((a) => {
              const negative = isNegativeType(a.type, a.is_liability);
              return (
                <div key={a.id} className="flex flex-col gap-1.5">
                  <Label htmlFor={`existing_${a.id}`}>
                    {a.name}
                    {negative && <span className="text-xs text-muted-foreground"> (debt)</span>}
                  </Label>
                  <Input
                    id={`existing_${a.id}`}
                    name={`existing_${a.id}`}
                    type="number"
                    step="0.01"
                    defaultValue={negative ? Math.abs(a.balance) : a.balance}
                    onChange={(e) =>
                      setExistingValues((prev) => ({ ...prev, [a.id]: Number(e.target.value) || 0 }))
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {accounts.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No accounts set up yet — add them in the Accounts tab first, or use &quot;Add an
          account&quot; below.
        </p>
      )}

      <Collapsible defaultOpen={missingTemplates.length > 0} data-tour="suggested-accounts">
        <CollapsibleTrigger>
          <ChevronDownIcon className="size-4 transition-transform group-data-panel-open:rotate-180" />
          Add an account
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          <div className="flex flex-col gap-4">
            {missingTemplates.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground">
                  Accounts on your checklist you haven&apos;t created yet — enter a balance to
                  create one, or leave at 0 to skip.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {missingTemplates.map((t) => {
                    const isOther = t.type === "Other";
                    return (
                      <div key={t.id} className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <Label htmlFor={`template_${t.id}`}>
                            {t.name}{" "}
                            <span className="text-xs text-muted-foreground">
                              ({t.type}
                              {t.type === "Credit Card" ? ", debt" : ""})
                            </span>
                          </Label>
                          <ConfirmActionButton
                            label={<XIcon className="size-3.5" />}
                            title={`Remove "${t.name}"?`}
                            description="This removes it from your account checklist — it won't affect any accounts you've already created."
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
                        {isOther && (
                          <Label htmlFor={`template_${t.id}_liability`} className="font-normal">
                            <Checkbox
                              id={`template_${t.id}_liability`}
                              name={`template_${t.id}_liability`}
                              onCheckedChange={(checked) =>
                                setTemplateLiability((prev) => ({ ...prev, [t.id]: checked }))
                              }
                            />
                            This is a debt (subtracts from net worth)
                          </Label>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <AddTemplateForm />
          </div>
        </CollapsibleContent>
      </Collapsible>

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
        toast.success("Added to your checklist.");
        setName("");
        setType(ACCOUNT_TYPES[0]);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-md border border-dashed p-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-template-name">Account name</Label>
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
