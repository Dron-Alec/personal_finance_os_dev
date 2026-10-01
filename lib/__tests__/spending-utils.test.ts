import { describe, expect, it } from "vitest";
import { computeSpendingMetrics, type SpendingTransaction } from "@/lib/spending-utils";

const tx = (amount: number, category: string): SpendingTransaction => ({
  id: 0, date: "2026-09-01", description: "", amount, bank: "Axos Checking", category,
});

describe("computeSpendingMetrics", () => {
  it("excludes Internal Transfer from both income and spending", () => {
    const m = computeSpendingMetrics([
      tx(2000, "Income"),
      tx(800, "Internal Transfer"),
      tx(-800, "Internal Transfer"),
      tx(-500, "Groceries"),
    ]);
    expect(m.totalIncome).toBe(2000);
    expect(m.totalSpending).toBe(500);
    expect(m.netCashFlow).toBe(1500);
  });
});
