"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { XIcon } from "lucide-react";
import { ALL } from "@/lib/spending-utils";
import { getCategoryColor } from "@/lib/chart-colors";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export function SpendingFilters({
  months,
  categories,
  banks,
}: {
  months: string[];
  categories: string[];
  banks: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === ALL) params.delete(key);
    else params.set(key, value);
    router.push(`/spending?${params.toString()}`);
  }

  const month = searchParams.get("month") ?? ALL;
  const category = searchParams.get("category") ?? ALL;
  const bank = searchParams.get("bank") ?? ALL;
  const excluded = new Set(
    (searchParams.get("exclude") ?? "").split(",").filter(Boolean),
  );

  function toggleExcluded(cat: string) {
    const next = new Set(excluded);
    if (next.has(cat)) next.delete(cat);
    else next.add(cat);
    const params = new URLSearchParams(searchParams.toString());
    if (next.size === 0) params.delete("exclude");
    else params.set("exclude", Array.from(next).join(","));
    router.push(`/spending?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Month</Label>
          <Select value={month} onValueChange={(v) => setParam("month", v ?? ALL)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All</SelectItem>
              {months.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Category</Label>
          <Select value={category} onValueChange={(v) => setParam("category", v ?? ALL)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Account</Label>
          <Select value={bank} onValueChange={(v) => setParam("bank", v ?? ALL)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All</SelectItem>
              {banks.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Exclude categories (click to toggle out of totals &amp; charts)</Label>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((c) => {
            const isExcluded = excluded.has(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggleExcluded(c)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  isExcluded
                    ? "border-transparent bg-muted text-muted-foreground line-through"
                    : "border-border hover:bg-muted",
                )}
              >
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: isExcluded ? "var(--chart-other)" : getCategoryColor(c) }}
                  aria-hidden
                />
                {c}
                {isExcluded && <XIcon className="size-3" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
