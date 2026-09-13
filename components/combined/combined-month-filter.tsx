"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const ALL = "All";

// Applies to Cash Flow and Spending only — Net Worth is a balance-over-time
// trend, not a per-month total, so filtering it down to one month wouldn't
// mean anything.
export function CombinedMonthFilter({ months }: { months: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const month = searchParams.get("month") ?? ALL;

  function setMonth(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === ALL) params.delete("month");
    else params.set("month", value);
    router.push(`/combined?${params.toString()}`);
  }

  if (months.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <Label>Month (Cash Flow &amp; Spending)</Label>
      <Select value={month} onValueChange={(v) => setMonth(v ?? ALL)}>
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
  );
}
