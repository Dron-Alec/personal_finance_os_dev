import { describe, expect, it } from "vitest";
import { ACCOUNT_TYPES, DEFAULT_CATEGORY_RULES } from "@/lib/constants";
import { categorizeTransaction } from "@/lib/categorize";
import {
  candidAccountType,
  candidBalance,
  candidCategory,
  toTransactionRow,
  type PlaidTransaction,
} from "../../supabase/functions/plaid/mapping";

const tx = (over: Partial<PlaidTransaction> = {}): PlaidTransaction => ({
  transaction_id: "t1",
  account_id: "acc1",
  date: "2026-11-01",
  amount: 4.5,
  name: "SQ *BLUE BOTTLE",
  merchant_name: "Blue Bottle Coffee",
  pending: false,
  personal_finance_category: { primary: "FOOD_AND_DRINK", detailed: "FOOD_AND_DRINK_COFFEE" },
  ...over,
});
const ctx = { householdId: "hh", importFrom: "2026-10-01", accountNames: new Map([["acc1", "Chase Checking"]]), rules: [] };

describe("toTransactionRow", () => {
  it("flips Plaid's sign (positive = money out) to Candid's (negative = spending)", () => {
    expect(toTransactionRow(tx({ amount: 4.5 }), ctx)!.amount).toBe(-4.5);
    expect(toTransactionRow(tx({ amount: -2000 }), ctx)!.amount).toBe(2000);
  });
  it("skips pending, pre-import_from, and untracked-account transactions", () => {
    expect(toTransactionRow(tx({ pending: true }), ctx)).toBeNull();
    expect(toTransactionRow(tx({ date: "2026-09-30" }), ctx)).toBeNull();
    expect(toTransactionRow(tx({ account_id: "other" }), ctx)).toBeNull();
    expect(toTransactionRow(tx({ date: "2026-10-01" }), ctx)).not.toBeNull();
  });
  it("uses the merchant name and the mapped account's name", () => {
    const row = toTransactionRow(tx(), ctx)!;
    expect(row.description).toBe("Blue Bottle Coffee");
    expect(row.bank).toBe("Chase Checking");
    expect(row.plaid_transaction_id).toBe("t1");
  });
});

describe("candidCategory", () => {
  it("lets the user's rules win over Plaid's category", () => {
    expect(candidCategory(tx(), [{ category: "Groceries", keywords: ["blue bottle"] }])).toBe("Groceries");
  });
  it("maps detailed codes before primary ones", () => {
    expect(candidCategory(tx({ personal_finance_category: { primary: "FOOD_AND_DRINK", detailed: "FOOD_AND_DRINK_GROCERIES" } }), [])).toBe("Groceries");
    expect(candidCategory(tx(), [])).toBe("Dining");
    expect(candidCategory(tx({ personal_finance_category: { primary: "LOAN_PAYMENTS", detailed: "LOAN_PAYMENTS_CREDIT_CARD_PAYMENT" } }), [])).toBe("Internal Transfer");
    expect(candidCategory(tx({ personal_finance_category: null }), [])).toBe("Other");
  });
  it("only produces categories Candid already uses", () => {
    const known = new Set([...DEFAULT_CATEGORY_RULES.map((r) => r.category), "Other"]);
    for (const [primary, detailed] of [
      ["INCOME", "INCOME_WAGES"], ["TRAVEL", "TRAVEL_FLIGHTS"], ["MEDICAL", "MEDICAL_PHARMACY"],
      ["TRANSFER_OUT", "TRANSFER_OUT_INVESTMENT_AND_RETIREMENT_FUNDS"], ["BANK_FEES", "BANK_FEES_ATM_FEES"],
      ["ENTERTAINMENT", "ENTERTAINMENT_MUSIC_AND_AUDIO"], ["RENT_AND_UTILITIES", "RENT_AND_UTILITIES_RENT"],
    ]) {
      expect(known).toContain(candidCategory(tx({ personal_finance_category: { primary, detailed } }), []));
    }
  });
  it("matches lib/categorize.ts on the same rules", () => {
    for (const name of ["NETFLIX.COM", "WHOLE FOODS #12", "UBER TRIP", "RANDOM THING"]) {
      const fromCsv = categorizeTransaction(name, DEFAULT_CATEGORY_RULES);
      const fromPlaid = candidCategory(tx({ name, merchant_name: null, personal_finance_category: null }), DEFAULT_CATEGORY_RULES);
      expect(fromPlaid).toBe(fromCsv);
    }
  });
});

describe("accounts", () => {
  it("maps Plaid types onto Candid account types", () => {
    expect(candidAccountType({ type: "depository", subtype: "checking" })).toBe("Checking");
    expect(candidAccountType({ type: "depository", subtype: "savings" })).toBe("Savings");
    expect(candidAccountType({ type: "credit", subtype: "credit card" })).toBe("Credit Card");
    expect(candidAccountType({ type: "loan", subtype: "student" })).toBe("Loan");
    expect(candidAccountType({ type: "investment", subtype: "roth" })).toBe("Roth IRA");
    expect(candidAccountType({ type: "investment", subtype: "401k" })).toBe("401k");
    expect(candidAccountType({ type: "investment", subtype: "brokerage" })).toBe("Brokerage / Stocks");
    for (const t of ["depository", "credit", "loan", "investment", "other"]) {
      expect(ACCOUNT_TYPES as readonly string[]).toContain(candidAccountType({ type: t, subtype: null }));
    }
  });
  it("stores liabilities negative, assets positive", () => {
    const acct = (type: string, current: number) => ({ account_id: "a", name: "x", type, balances: { current } });
    expect(candidBalance(acct("credit", 410))).toBe(-410);
    expect(candidBalance(acct("loan", 65000))).toBe(-65000);
    expect(candidBalance(acct("depository", 110))).toBe(110);
  });
});
