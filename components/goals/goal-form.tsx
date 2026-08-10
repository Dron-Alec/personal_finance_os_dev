"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { saveGoal } from "@/lib/actions/goals";
import { reverseSolveFlat, monthsBetween, type ContributionModel } from "@/lib/goals";
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

const STRATEGY_ITEMS: { value: ContributionModel; label: string }[] = [
  { value: "flat", label: "Flat monthly amount" },
  { value: "growing", label: "Growing monthly amount (annual step)" },
  { value: "lump_flat", label: "Lump sum + flat monthly" },
];

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

  const [planOpen, setPlanOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [strategy, setStrategy] = useState<ContributionModel>("flat");
  const [monthlyAmount, setMonthlyAmount] = useState("");
  const [annualStepPercent, setAnnualStepPercent] = useState("");
  const [lumpAmount, setLumpAmount] = useState("");
  const [lumpMonth, setLumpMonth] = useState("1");
  const [growthRateAnnual, setGrowthRateAnnual] = useState("");

  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  // Remounts the uncontrolled inputs (and the Selects, so they reinitialize
  // cleanly against reset state) after a successful save — deliberately not
  // formRef.current?.reset(): calling a native form reset on a form
  // containing a React-controlled Select desyncs its displayed label from
  // its value (shows the raw value instead of the item's text).
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
  const growthRate = advancedOpen ? (parseFloat(growthRateAnnual) || 0) : 0;
  const requiredMonthly =
    !Number.isNaN(targetAmount) && targetAmount > 0 && monthsRemaining !== null
      ? reverseSolveFlat(currentValue, targetAmount, monthsRemaining, growthRate)
      : null;

  function resetForm() {
    setScope(NET_WORTH);
    setAmountStr("");
    setDateStr("");
    setPlanOpen(false);
    setAdvancedOpen(false);
    setStrategy("flat");
    setMonthlyAmount("");
    setAnnualStepPercent("");
    setLumpAmount("");
    setLumpMonth("1");
    setGrowthRateAnnual("");
    setFormGeneration((g) => g + 1);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const formData = new FormData(formRef.current ?? undefined);

    startTransition(async () => {
      const result = await saveGoal({}, formData);
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Goal saved.");
        resetForm();
      }
    });
  }

  return (
    <form key={formGeneration} ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input type="hidden" name="scopeType" value={isAccount ? "account" : "net_worth"} />
      {isAccount && <input type="hidden" name="accountId" value={scope} />}
      {planOpen && <input type="hidden" name="contributionModel" value={strategy} />}
      {planOpen && advancedOpen && growthRateAnnual && (
        <input type="hidden" name="growthRateAnnual" value={growthRateAnnual} />
      )}

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

      {!planOpen ? (
        <Button type="button" variant="link" size="sm" className="w-fit px-0" onClick={() => setPlanOpen(true)}>
          + Add a contribution plan (optional)
        </Button>
      ) : (
        <div className="flex flex-col gap-3 rounded-lg border p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="grid flex-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5 sm:col-span-3 sm:max-w-xs">
                <Label>Strategy</Label>
                <Select
                  items={STRATEGY_ITEMS}
                  value={strategy}
                  onValueChange={(v) => setStrategy((v as ContributionModel) ?? "flat")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STRATEGY_ITEMS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="goal-monthly">Monthly amount ($)</Label>
                <Input
                  id="goal-monthly"
                  name="monthlyAmount"
                  type="number"
                  step="0.01"
                  value={monthlyAmount}
                  onChange={(e) => setMonthlyAmount(e.target.value)}
                />
              </div>

              {strategy === "growing" && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="goal-step">Annual increase (%)</Label>
                  <Input
                    id="goal-step"
                    name="annualStepPercent"
                    type="number"
                    step="0.1"
                    value={annualStepPercent}
                    onChange={(e) => setAnnualStepPercent(e.target.value)}
                  />
                </div>
              )}

              {strategy === "lump_flat" && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="goal-lump">Lump sum ($)</Label>
                    <Input
                      id="goal-lump"
                      name="lumpAmount"
                      type="number"
                      step="0.01"
                      value={lumpAmount}
                      onChange={(e) => setLumpAmount(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="goal-lump-month">Arrives in month #</Label>
                    <Input
                      id="goal-lump-month"
                      name="lumpMonth"
                      type="number"
                      step="1"
                      min="1"
                      value={lumpMonth}
                      onChange={(e) => setLumpMonth(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>
            <Button type="button" variant="ghost" size="icon-xs" onClick={() => setPlanOpen(false)}>
              ✕
            </Button>
          </div>

          {!advancedOpen ? (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="w-fit px-0"
              onClick={() => setAdvancedOpen(true)}
            >
              Advanced: assume a growth rate
            </Button>
          ) : (
            <div className="flex flex-col gap-1.5 sm:max-w-xs">
              <Label htmlFor="goal-growth-rate">Expected annual growth rate (%)</Label>
              <Input
                id="goal-growth-rate"
                type="number"
                step="0.1"
                placeholder="e.g. 7 for an average market return"
                value={growthRateAnnual}
                onChange={(e) => setGrowthRateAnnual(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Compounds monthly on the balance, on top of contributions — this is what lets the projected line on
                the chart curve rather than run straight.
              </p>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            This plan draws a projected benchmark line on the net worth / account chart, in addition to the flat
            target line.
          </p>
        </div>
      )}

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Saving…" : "Add Goal"}
      </Button>
    </form>
  );
}
