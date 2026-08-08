"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { saveCategoryRules } from "@/lib/actions/settings";
import type { CategoryRule } from "@/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const NEW_CATEGORY = "__new__";

export function CategoryRulesForm({ rules }: { rules: CategoryRule[] }) {
  const [selected, setSelected] = useState(rules[0]?.category ?? NEW_CATEGORY);
  const [newName, setNewName] = useState("");
  const [state, formAction, pending] = useActionState(saveCategoryRules, {});
  const prevPending = useRef(pending);

  useEffect(() => {
    if (prevPending.current && !pending) {
      if (state.error) toast.error(state.error);
      else toast.success("Saved and re-categorized!");
    }
    prevPending.current = pending;
  }, [pending, state]);

  const isNew = selected === NEW_CATEGORY;
  const current = rules.find((r) => r.category === selected);
  const resolvedName = isNew ? newName.trim() : selected;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="category" value={resolvedName} />

      <div className="flex flex-col gap-1.5 sm:max-w-xs">
        <Label>Category</Label>
        <Select value={selected} onValueChange={(v) => setSelected(v ?? NEW_CATEGORY)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {rules.map((r) => (
              <SelectItem key={r.category} value={r.category}>
                {r.category}
              </SelectItem>
            ))}
            <SelectItem value={NEW_CATEGORY}>＋ New Category</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isNew && (
        <div className="flex flex-col gap-1.5 sm:max-w-xs">
          <Label htmlFor="new-category-name">New category name</Label>
          <Input
            id="new-category-name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="keywords">Keywords (comma-separated)</Label>
        <Textarea
          id="keywords"
          name="keywords"
          rows={3}
          key={selected}
          defaultValue={current?.keywords.join(", ") ?? ""}
        />
        <p className="text-xs text-muted-foreground">
          Keywords match case-insensitively. Saving re-categorizes all your transactions.
        </p>
      </div>

      <Button type="submit" disabled={pending || !resolvedName} className="w-fit">
        {pending ? "Saving…" : "Save Rules"}
      </Button>
    </form>
  );
}
