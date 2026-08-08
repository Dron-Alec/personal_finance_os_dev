import { lastDayOfMonth, subMonths } from "date-fns";

/** "YYYY-Qn" for the given date (defaults to now), e.g. "2026-Q1". */
export function currentQuarter(date: Date = new Date()): string {
  const q = Math.floor(date.getMonth() / 3) + 1;
  return `${date.getFullYear()}-Q${q}`;
}

/** "YYYY-Qn" -> the last month of that quarter, day 1 (matches the old
 * Streamlit app's quarter_to_date, used to place quarterly targets on the
 * net-worth chart's x-axis). */
export function quarterToDate(quarterStr: string): Date {
  const [yearStr, qStr] = quarterStr.split("-Q");
  const year = Number(yearStr);
  const quarter = Number(qStr);
  return new Date(year, quarter * 3 - 1, 1);
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
