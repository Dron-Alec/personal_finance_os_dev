import { SPENDING_EXCLUDE_CATEGORIES } from "@/lib/constants";

export type SpendingTransaction = {
  id: number;
  date: string;
  description: string;
  amount: number;
  bank: string;
  category: string;
};

export const ALL = "All";

export type SpendingFilters = {
  month: string;
  category: string;
  bank: string;
  excludeCategories: string[];
  search: string;
};

export function applyFilters(
  transactions: SpendingTransaction[],
  filters: SpendingFilters,
): SpendingTransaction[] {
  const excluded = new Set(filters.excludeCategories);
  const search = filters.search.trim().toLowerCase();
  return transactions.filter((t) => {
    if (filters.month !== ALL && t.date.slice(0, 7) !== filters.month) return false;
    if (filters.category !== ALL && t.category !== filters.category) return false;
    if (filters.bank !== ALL && t.bank !== filters.bank) return false;
    if (excluded.has(t.category)) return false;
    if (search && !t.description.toLowerCase().includes(search)) return false;
    return true;
  });
}

export function computeSpendingMetrics(filtered: SpendingTransaction[]) {
  // Internal Transfer / Income never count as spending, even if the user
  // explicitly filters down to one of those categories -- matches the
  // Combined page's unconditional exclusion (lib/actions/household-summaries.ts).
  // The transaction table below still shows them; only the totals/graphs don't.
  const spendingRows = filtered.filter((t) => !SPENDING_EXCLUDE_CATEGORIES.has(t.category));

  const totalSpending = spendingRows
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  // Inflows from your own accounts aren't income either -- mirrors
  // household_income_summary (0023).
  const totalIncome = filtered
    .filter((t) => t.amount > 0 && t.category !== "Internal Transfer")
    .reduce((sum, t) => sum + t.amount, 0);

  return {
    totalSpending,
    totalIncome,
    netCashFlow: totalIncome - totalSpending,
    spendingRows: spendingRows.filter((t) => t.amount < 0),
  };
}

export function buildCategoryTotals(expenseRows: SpendingTransaction[]): { name: string; value: number }[] {
  const totals = new Map<string, number>();
  for (const t of expenseRows) {
    totals.set(t.category, (totals.get(t.category) ?? 0) + Math.abs(t.amount));
  }
  return Array.from(totals.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function buildMonthlyCategoryData(expenseRows: SpendingTransaction[]) {
  const months = new Map<string, Map<string, number>>();
  const categories = new Set<string>();
  for (const t of expenseRows) {
    const month = t.date.slice(0, 7);
    categories.add(t.category);
    if (!months.has(month)) months.set(month, new Map());
    const catMap = months.get(month)!;
    catMap.set(t.category, (catMap.get(t.category) ?? 0) + Math.abs(t.amount));
  }
  const sortedMonths = Array.from(months.keys()).sort();
  const rows = sortedMonths.map((month) => {
    const row = { month } as { month: string } & Record<string, number | string>;
    for (const cat of categories) {
      row[cat] = months.get(month)!.get(cat) ?? 0;
    }
    return row;
  });
  return { rows, categories: Array.from(categories) };
}
