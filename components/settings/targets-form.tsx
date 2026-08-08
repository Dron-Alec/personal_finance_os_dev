"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { saveTargets } from "@/lib/actions/settings";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export function TargetsForm({ csv }: { csv: string }) {
  const [state, formAction, pending] = useActionState(saveTargets, {});
  const prevPending = useRef(pending);

  useEffect(() => {
    if (prevPending.current && !pending) {
      if (state.error) toast.error(state.error);
      else toast.success("Targets saved!");
    }
    prevPending.current = pending;
  }, [pending, state]);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Textarea
        name="targetsCsv"
        rows={8}
        defaultValue={csv}
        className="font-mono text-sm"
      />
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Saving…" : "Save Targets"}
      </Button>
    </form>
  );
}
