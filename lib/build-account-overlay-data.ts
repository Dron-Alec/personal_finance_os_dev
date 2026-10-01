import { format } from "date-fns";
import { compareDateStrings, parseLocalDate } from "@/lib/date-utils";

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
  for (const list of byAccount.values()) list.sort((a, b) => compareDateStrings(a.date, b.date));

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

export type AccountBalanceAsOf = { id: number; name: string; balance: number | null };

/**
 * Each account's last known balance on or before `date` — the breakdown
 * behind a net worth snapshot, reconstructed from account_balance_history
 * rather than stored at snapshot time, so it works for snapshots entered
 * before this feature existed too. `date` doesn't need to be one of the
 * dates in `history` (a snapshot is often entered on a different day than
 * any account update) — same carry-forward rule as buildAccountOverlayData,
 * evaluated at one arbitrary target date instead of every date in history.
 */
export function getAccountBalancesAsOf(
  accounts: OverlayAccount[],
  history: { account_id: number; balance: number; as_of_date: string }[],
  date: string,
): AccountBalanceAsOf[] {
  return accounts.map((a) => {
    const last = history
      .filter((h) => h.account_id === a.id && h.as_of_date <= date)
      .sort((x, y) => compareDateStrings(x.as_of_date, y.as_of_date))
      .at(-1);
    return { id: a.id, name: a.name, balance: last ? Number(last.balance) : null };
  });
}
