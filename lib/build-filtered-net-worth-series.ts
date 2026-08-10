/**
 * A net worth series restricted to a chosen subset of accounts, for the
 * chart's account-filter control. Unlike `nw_snapshots` (a total captured
 * across *all* accounts at snapshot time), this sums each selected
 * account's balance history directly — each account's balance carried
 * forward from its last known value on dates where only some accounts
 * reported, same convention as buildAccountOverlayData.
 */
export function buildFilteredNetWorthSeries(
  accountIds: number[],
  history: { account_id: number; balance: number; as_of_date: string }[],
): { date: string; value: number }[] {
  if (accountIds.length === 0) return [];

  const byAccount = new Map<number, { date: string; balance: number }[]>();
  for (const id of accountIds) byAccount.set(id, []);
  for (const h of history) {
    const list = byAccount.get(h.account_id);
    if (list) list.push({ date: h.as_of_date, balance: Number(h.balance) });
  }
  for (const list of byAccount.values()) list.sort((a, b) => (a.date < b.date ? -1 : 1));

  const dates = Array.from(
    new Set(history.filter((h) => byAccount.has(h.account_id)).map((h) => h.as_of_date)),
  ).sort();

  const cursors = new Map<number, number>();
  for (const id of accountIds) cursors.set(id, -1);

  return dates.map((date) => {
    let total = 0;
    for (const id of accountIds) {
      const list = byAccount.get(id) ?? [];
      let idx = cursors.get(id) ?? -1;
      while (idx + 1 < list.length && list[idx + 1].date <= date) idx++;
      cursors.set(id, idx);
      if (idx >= 0) total += list[idx].balance;
    }
    return { date, value: total };
  });
}
