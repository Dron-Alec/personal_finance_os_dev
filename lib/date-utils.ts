import { lastDayOfMonth, subMonths } from "date-fns";

/** Ascending comparator for YYYY-MM-DD strings — `a < b ? -1 : 1` (seen
 * copy-pasted across this codebase) returns 1 for equal dates instead of 0,
 * breaking Array.sort's stability guarantee for same-date rows (re-saved
 * entries, migrated duplicates). */
export function compareDateStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Last day of the previous calendar month — default for month-end balance entry. */
export function lastDayOfPreviousMonth(date: Date = new Date()): Date {
  return lastDayOfMonth(subMonths(date, 1));
}

/** Local YYYY-MM-DD (avoids UTC off-by-one from toISOString()). */
export function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * `new Date("2026-07-01")` parses an ISO-shaped string as UTC midnight, but
 * formatting it back out (date-fns `format()`, `toLocaleDateString()`, etc.)
 * renders in the local timezone — a server/browser behind UTC (any US
 * timezone) rolls the date back a day. Slash-formatted dates ("7/1/2026")
 * don't have this problem — those already parse as local time — so only
 * the ISO shape needs the explicit local-components constructor.
 */
export function parseLocalDate(raw: string): Date {
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  return new Date(raw);
}
