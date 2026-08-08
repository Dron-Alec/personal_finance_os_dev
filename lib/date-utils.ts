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
