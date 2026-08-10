"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { saveGoal } from "@/lib/actions/goals";
import { reverseSolveFlat, monthsBetween } from "@/lib/goals";
import { parseLocalDate } from "@/lib/date-utils";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NET_WORTH = "net_worth";

export function GoalForm({
  accounts,
  netWorthCurrent,
}: {
  accounts: { id: number; name: string; balance: number }[];
  netWorthCurrent: number;
}) {
  const [scope, setScope] = useState<string>(NET_WORTH);
  const [amountStr, setAmountStr] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  // Remounts the uncontrolled inputs (and the Select, so it reinitializes
  // cleanly against the reset `scope` state) after a successful save —
  // deliberately not formRef.current?.reset(): calling a native form reset
  // on a form containing a React-controlled Select desyncs its displayed
  // label from its value (shows the raw value instead of the item's text).
  const [formGeneration, setFormGeneration] = useState(0);

  const isAccount = scope !== NET_WORTH;

  // Base UI's Select only renders the selected item's *label* in the
  // trigger (instead of the raw value) when given an explicit items map —
  // it doesn't scan mounted SelectItem children for this.
  const scopeItems = [
    { value: NET_WORTH, label: "Net Worth (aggregate)" },
    ...accounts.map((a) => ({ value: String(a.id), label: a.name })),
  ];

  const currentValue = isAccount
    ? (accounts.find((a) => String(a.id) === scope)?.balance ?? 0)
    : netWorthCurrent;

  const targetAmount = parseFloat(amountStr);
  const monthsRemaining = dateStr ? monthsBetween(new Date(), parseLocalDate(dateStr)) : null;
  const requiredMonthly =
    !Number.isNaN(targetAmount) && targetAmount > 0 && monthsRemaining !== null
      ? reverseSolveFlat(currentValue, targetAmount, monthsRemaining)
      : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const formData = new FormData(formRef.current ?? undefined);

    startTransition(async () => {
      const result = await saveGoal({}, formData);
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Goal saved.");
        setScope(NET_WORTH);
        setAmountStr("");
        setDateStr("");
        setFormGeneration((g) => g + 1);
      }
    });
  }

  return (
    <form key={formGeneration} ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input type="hidden" name="scopeType" value={isAccount ? "account" : "net_worth"} />
      {isAccount && <input type="hidden" name="accountId" value={scope} />}

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="goal-name">Goal name</Label>
          <Input id="goal-name" name="name" placeholder="e.g. Emergency Fund" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Track</Label>
          <Select items={scopeItems} value={scope} onValueChange={(v) => setScope(v ?? NET_WORTH)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NET_WORTH}>Net Worth (aggregate)</SelectItem>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={String(a.id)}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="goal-amount">Target amount ($)</Label>
          <Input
            id="goal-amount"
            name="targetAmount"
            type="number"
            step="0.01"
            min="0.01"
            required
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="goal-date">Target date</Label>
          <Input
            id="goal-date"
            name="targetDate"
            type="date"
            required
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {requiredMonthly !== null
          ? requiredMonthly > 0
            ? `~${formatCurrency(requiredMonthly, 0)}/mo needed to hit this from today's balance of ${formatCurrency(currentValue, 0)}.`
            : "Already there — this target is at or below the current balance."
          : "Enter an amount and date to see the monthly pace needed."}
      </p>

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Saving…" : "Add Goal"}
      </Button>
    </form>
  );
}
