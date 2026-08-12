"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { saveAccount } from "@/lib/actions/accounts";
import { ACCOUNT_TYPES, LIABILITY_TYPES } from "@/lib/constants";
import { toDateInputValue } from "@/lib/date-utils";
import { AccountTypeSelect } from "@/components/accounts/account-type-select";
import { AccountBankSelect } from "@/components/accounts/account-bank-select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ADD_NEW = "__new__";

export type AccountOption = {
  id: number;
  name: string;
  type: string;
  balance: number;
  bank_format: string | null;
  is_liability: boolean;
};

// Remounts (via `key`) when the selected account changes, so its bank
// picker resets to that account's saved value — same trick the Balance
// input uses instead of an effect-based resync.
function BankField({ defaultValue }: { defaultValue: string }) {
  const [value, setValue] = useState(defaultValue);
  return <AccountBankSelect id="acct-bank" name="bankFormat" value={value} onChange={setValue} />;
}

export function AccountForm({ accounts }: { accounts: AccountOption[] }) {
  const [selected, setSelected] = useState<string>(accounts.length ? String(accounts[0].id) : ADD_NEW);
  const [type, setType] = useState<string>(ACCOUNT_TYPES[0]);
  const [state, formAction, pending] = useActionState(saveAccount, {});
  const formRef = useRef<HTMLFormElement>(null);
  const prevPending = useRef(pending);

  useEffect(() => {
    if (prevPending.current && !pending) {
      if (state.error) {
        toast.error(state.error);
      } else {
        toast.success("Account saved.");
      }
    }
    prevPending.current = pending;
  }, [pending, state]);

  const isNew = selected === ADD_NEW;
  const existing = !isNew ? accounts.find((a) => String(a.id) === selected) : undefined;
  const effectiveType = isNew ? type : (existing?.type ?? "");
  const isUnambiguousDebt = LIABILITY_TYPES.has(effectiveType);
  const isOther = effectiveType === "Other";
  // Credit Card / Loan balances — and any "Other" account flagged as a
  // liability — are stored negative (see signedBalance) so they subtract
  // from net worth. Always show/accept the positive amount owed here,
  // matching how everyone actually thinks about a balance they owe.
  const storedAsNegative = isUnambiguousDebt || (existing?.is_liability ?? false);
  const displayBalance = existing ? (storedAsNegative ? Math.abs(existing.balance) : existing.balance) : 0;

  // Base UI's Select only renders the selected item's *label* in the
  // trigger (instead of the raw value) when given an explicit items map.
  const accountItems = [
    ...accounts.map((a) => ({ value: String(a.id), label: a.name })),
    { value: ADD_NEW, label: "＋ Add new account" },
  ];

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="mode" value={isNew ? "create" : "update"} />
      {!isNew && existing && (
        <>
          <input type="hidden" name="accountId" value={existing.id} />
          <input type="hidden" name="type" value={existing.type} />
        </>
      )}

      <div className="flex flex-col gap-1.5 sm:max-w-xs">
        <Label>Account</Label>
        <Select items={accountItems} value={selected} onValueChange={(v) => setSelected(v ?? ADD_NEW)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={String(a.id)}>
                {a.name}
              </SelectItem>
            ))}
            <SelectItem value={ADD_NEW}>＋ Add new account</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {isNew ? (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="acct-name">Account Name</Label>
              <Input id="acct-name" name="name" placeholder="e.g. Fidelity 401k" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="acct-type">Type</Label>
              <AccountTypeSelect id="acct-type" name="type" value={type} onChange={setType} />
            </div>
          </>
        ) : (
          existing && (
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <p className="flex h-9 items-center text-sm text-muted-foreground">
                {existing.type} <span className="ml-1 text-xs">(locked)</span>
              </p>
            </div>
          )
        )}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="acct-balance">{isUnambiguousDebt ? "Debt ($)" : "Balance ($)"}</Label>
          <Input
            id="acct-balance"
            name="balance"
            type="number"
            step="0.01"
            defaultValue={displayBalance}
            key={selected}
          />
          {isUnambiguousDebt && (
            <p className="text-xs text-muted-foreground">Counts against net worth, not toward it.</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="acct-date">As of Date</Label>
          <Input id="acct-date" name="asOfDate" type="date" defaultValue={toDateInputValue(new Date())} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="acct-bank">Bank (optional)</Label>
          <BankField key={selected} defaultValue={existing?.bank_format ?? ""} />
        </div>
        {isOther && (
          <div className="flex flex-col justify-end gap-1.5 pb-1.5">
            <Label htmlFor="acct-is-liability" className="font-normal">
              <Checkbox
                id="acct-is-liability"
                name="isLiability"
                defaultChecked={existing?.is_liability ?? false}
                key={selected}
              />
              This is a debt (subtracts from net worth)
            </Label>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Setting a bank narrows the Statement Format choices when you upload CSVs later — opening
        another account is always a chance to add a new one.
      </p>

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Saving…" : "Save Account"}
      </Button>
    </form>
  );
}
