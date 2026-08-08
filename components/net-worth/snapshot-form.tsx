"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { saveNetWorthSnapshot } from "@/lib/actions/net-worth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toDateInputValue } from "@/lib/date-utils";

export function SnapshotForm() {
  const [state, formAction, pending] = useActionState(saveNetWorthSnapshot, {});
  const formRef = useRef<HTMLFormElement>(null);
  const prevPending = useRef(pending);

  useEffect(() => {
    if (prevPending.current && !pending) {
      if (state.error) {
        toast.error(state.error);
      } else {
        toast.success("Snapshot saved.");
        formRef.current?.reset();
      }
    }
    prevPending.current = pending;
  }, [pending, state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="snapshot-date">Date</Label>
        <Input
          id="snapshot-date"
          name="date"
          type="date"
          defaultValue={toDateInputValue(new Date())}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="snapshot-nw">Net Worth ($)</Label>
        <Input id="snapshot-nw" name="netWorth" type="number" step="0.01" defaultValue={0} />
      </div>
      <div className="flex flex-1 min-w-48 flex-col gap-1.5">
        <Label htmlFor="snapshot-note">Note (optional)</Label>
        <Input id="snapshot-note" name="note" placeholder="e.g. Bonus deposited" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save Snapshot"}
      </Button>
    </form>
  );
}
