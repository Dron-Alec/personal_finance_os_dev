"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { recategorizeByDescription } from "@/lib/actions/transactions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function RecategorizePanel({
  descriptions,
  categories,
}: {
  descriptions: string[];
  categories: string[];
}) {
  const [description, setDescription] = useState(descriptions[0] ?? "");
  const [category, setCategory] = useState(categories[0] ?? "Other");
  const [pending, startTransition] = useTransition();

  function apply() {
    if (!description || !category) return;
    startTransition(async () => {
      try {
        await recategorizeByDescription(description, category);
        toast.success("Updated!");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  if (descriptions.length === 0) return null;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex min-w-56 flex-col gap-1.5">
        <Label>Description</Label>
        <Select value={description} onValueChange={(v) => setDescription(v ?? "")}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {descriptions.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex min-w-48 flex-col gap-1.5">
        <Label>New Category</Label>
        <Select value={category} onValueChange={(v) => setCategory(v ?? "Other")}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="button" onClick={apply} disabled={pending}>
        {pending ? "Applying…" : "Apply"}
      </Button>
    </div>
  );
}
