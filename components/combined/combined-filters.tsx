"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const ALL = "All";

// Month applies to Cash Flow (both Total Spending and Total Income) and
// Spending — Net Worth is a balance-over-time trend, not a per-month total,
// so filtering it down to one month wouldn't mean anything. Category only
// narrows Total Spending within Cash Flow (household_income_summary has no
// category column — see getCombinedCashFlow's comment) and the Spending
// section's own breakdown.
export function CombinedFilters({ months, categories }: { months: string[]; categories: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const month = searchParams.get("month") ?? ALL;
  const category = searchParams.get("category") ?? ALL;

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === ALL) params.delete(key);
    else params.set(key, value);
    router.push(`/combined?${params.toString()}`);
  }

  if (months.length === 0 && categories.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-4">
      {months.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Label>Month (Cash Flow &amp; Spending)</Label>
          <Select value={month} onValueChange={(v) => setParam("month", v ?? ALL)}>
            <SelectTrigger className="w-48">
              <SelectValue>{(v: string) => (v === ALL || !v ? "All time" : format(parseLocalDate(v), "MMM yyyy"))}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All time</SelectItem>
              {months.map((m) => (
                <SelectItem key={m} value={m}>
                  {format(parseLocalDate(m), "MMM yyyy")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {categories.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Label>Category (Spending)</Label>
          <Select value={category} onValueChange={(v) => setParam("category", v ?? ALL)}>
            <SelectTrigger className="w-48">
              <SelectValue>{(v: string) => (v === ALL || !v ? "All categories" : v)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
