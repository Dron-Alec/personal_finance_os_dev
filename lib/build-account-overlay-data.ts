import { format } from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";

export type OverlayAccount = { id: number; name: string };
export type OverlayRow = { date: string; label: string } & Record<string, number | string | null>;

/**
 * One row per distinct as_of_date across all accounts, each account's
 * balance carried forward from its last known value (not left as a gap) —
 * comparing trajectories needs continuous lines, not sparse dots that only
 * line up on the rare date every account happens to share.
 */
export function buildAccountOverlayData(
  accounts: OverlayAccount[],
  history: { account_id: number; balance: number; as_of_date: string }[],
): OverlayRow[] {
  const dates = Array.from(new Set(history.map((h) => h.as_of_date))).sort();
  if (dates.length === 0) return [];

  const byAccount = new Map<number, { date: string; balance: number }[]>();
  for (const a of accounts) byAccount.set(a.id, []);
  for (const h of history) {
    const list = byAccount.get(h.account_id);
    if (list) list.push({ date: h.as_of_date, balance: Number(h.balance) });
  }
  for (const list of byAccount.values()) list.sort((a, b) => (a.date < b.date ? -1 : 1));

  const cursors = new Map<number, number>();
  for (const a of accounts) cursors.set(a.id, -1);

  return dates.map((date) => {
    const row: OverlayRow = { date, label: format(parseLocalDate(date), "MMM d, yyyy") };
    for (const a of accounts) {
      const list = byAccount.get(a.id) ?? [];
      let idx = cursors.get(a.id) ?? -1;
      while (idx + 1 < list.length && list[idx + 1].date <= date) idx++;
      cursors.set(a.id, idx);
      row[String(a.id)] = idx >= 0 ? list[idx].balance : null;
    }
    return row;
  });
}
