"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckIcon } from "lucide-react";
import { PRIORITIES } from "@/lib/learn-modules";
import { saveProfile } from "@/lib/actions/profile";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function PriorityPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {PRIORITIES.map((p) => {
        const on = value.includes(p.id);
        return (
          <button
            key={p.id}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(p.id)}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
              on ? "border-primary bg-primary/10 font-medium" : "hover:bg-muted",
            )}
          >
            <span aria-hidden>{p.emoji}</span>
            <span className="flex-1">{p.label}</span>
            {on && <CheckIcon className="size-4 shrink-0 text-primary" />}
          </button>
        );
      })}
    </div>
  );
}

// Learn page: edit priorities after the first-login prompt.
export function PrioritiesEditor({ initial }: { initial: string[] }) {
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const dirty = value.slice().sort().join() !== initial.slice().sort().join();

  function save() {
    startTransition(async () => {
      try {
        await saveProfile(value);
        toast.success("Saved your goals.");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <PriorityPicker value={value} onChange={setValue} />
      <Button type="button" className="w-fit" onClick={save} disabled={pending || !dirty}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
