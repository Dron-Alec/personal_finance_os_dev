"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { saveGoal } from "@/lib/actions/goals";
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

export function GoalForm({ accounts }: { accounts: { id: number; name: string }[] }) {
  const [scope, setScope] = useState<string>(NET_WORTH);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const isAccount = scope !== NET_WORTH;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const formData = new FormData(formRef.current ?? undefined);

    startTransition(async () => {
      const result = await saveGoal({}, formData);
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Goal saved.");
        formRef.current?.reset();
        setScope(NET_WORTH);
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="scopeType" value={isAccount ? "account" : "net_worth"} />
      {isAccount && <input type="hidden" name="accountId" value={scope} />}

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="goal-name">Goal name</Label>
          <Input id="goal-name" name="name" placeholder="e.g. Emergency Fund" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Track</Label>
          <Select value={scope} onValueChange={(v) => setScope(v ?? NET_WORTH)}>
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
          <Input id="goal-amount" name="targetAmount" type="number" step="0.01" min="0.01" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="goal-date">Target date</Label>
          <Input id="goal-date" name="targetDate" type="date" required />
        </div>
      </div>

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Saving…" : "Add Goal"}
      </Button>
    </form>
  );
}
