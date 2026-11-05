// Plaid → Candid translation. No imports, so the Edge Function (Deno) and
// vitest (lib/__tests__/plaid-mapping.test.ts) share this file as-is.

export type CategoryRule = { category: string; keywords: string[] };

export type PlaidTransaction = {
  transaction_id: string;
  account_id: string;
  date: string; // yyyy-MM-dd, posted date
  amount: number; // Plaid: positive = money out
  name: string;
  merchant_name?: string | null;
  pending: boolean;
  personal_finance_category?: { primary: string; detailed: string } | null;
};

export type PlaidAccount = {
  account_id: string;
  name: string;
  mask?: string | null;
  type: string;
  subtype?: string | null;
  balances: { current: number | null; available?: number | null };
};

// Same rule as lib/categorize.ts (first case-insensitive keyword substring
// match wins). The user's own rules beat Plaid's category.
function matchRule(description: string, rules: CategoryRule[]): string | null {
  const d = description.toUpperCase();
  for (const rule of rules) {
    if (rule.keywords.some((kw) => d.includes(kw.toUpperCase()))) return rule.category;
  }
  return null;
}

// Plaid personal_finance_category → Candid's category names (the ones in
// DEFAULT_CATEGORY_RULES, lib/constants.ts). Detailed codes first, then primary.
const DETAILED: Record<string, string> = {
  FOOD_AND_DRINK_GROCERIES: "Groceries",
  RENT_AND_UTILITIES_RENT: "Rent / Housing",
  LOAN_PAYMENTS_MORTGAGE_PAYMENT: "Rent / Housing",
  LOAN_PAYMENTS_CREDIT_CARD_PAYMENT: "Internal Transfer",
  TRANSFER_IN_ACCOUNT_TRANSFER: "Internal Transfer",
  TRANSFER_OUT_ACCOUNT_TRANSFER: "Internal Transfer",
  TRANSFER_IN_INVESTMENT_AND_RETIREMENT_FUNDS: "Investments",
  TRANSFER_OUT_INVESTMENT_AND_RETIREMENT_FUNDS: "Investments",
  ENTERTAINMENT_TV_AND_MOVIES: "Subscriptions",
  ENTERTAINMENT_MUSIC_AND_AUDIO: "Subscriptions",
};
const PRIMARY: Record<string, string> = {
  INCOME: "Income",
  FOOD_AND_DRINK: "Dining",
  GENERAL_MERCHANDISE: "Shopping",
  TRANSPORTATION: "Transportation",
  TRAVEL: "Transportation",
  RENT_AND_UTILITIES: "Utilities",
  HOME_IMPROVEMENT: "Rent / Housing",
  MEDICAL: "Health & Fitness",
  PERSONAL_CARE: "Health & Fitness",
  TRANSFER_IN: "Transfers",
  TRANSFER_OUT: "Transfers",
  LOAN_PAYMENTS: "Transfers",
};

export function candidCategory(t: PlaidTransaction, rules: CategoryRule[]): string {
  const ruled = matchRule(describe(t), rules);
  if (ruled) return ruled;
  const pfc = t.personal_finance_category;
  if (!pfc) return "Other";
  return DETAILED[pfc.detailed] ?? PRIMARY[pfc.primary] ?? "Other";
}

export function describe(t: PlaidTransaction): string {
  return (t.merchant_name || t.name).trim();
}

/** Candid's ACCOUNT_TYPES (lib/constants.ts) for a Plaid account. */
export function candidAccountType(a: Pick<PlaidAccount, "type" | "subtype">): string {
  const sub = (a.subtype ?? "").toLowerCase();
  switch (a.type) {
    case "depository":
      return ["savings", "money market", "cd", "hsa"].includes(sub) ? "Savings" : "Checking";
    case "credit":
      return "Credit Card";
    case "loan":
      return "Loan";
    case "investment":
      if (["401k", "401a", "403b", "457b", "roth 401k"].includes(sub)) return "401k";
      if (sub === "roth") return "Roth IRA";
      if (sub === "ira") return "Traditional IRA";
      if (sub === "crypto exchange") return "Crypto";
      return "Brokerage / Stocks";
    default:
      return "Other";
  }
}

/**
 * Balance as Candid stores it: liabilities negative (same convention as
 * signedBalance in lib/constants.ts). Plaid reports what's owed on credit
 * and loan accounts as a positive `current`.
 */
export function candidBalance(a: PlaidAccount): number {
  const current = a.balances.current ?? 0;
  return a.type === "credit" || a.type === "loan" ? -Math.abs(current) : current;
}

export type TransactionRow = {
  household_id: string;
  date: string;
  description: string;
  amount: number;
  bank: string;
  category: string;
  source: "plaid";
  plaid_transaction_id: string;
};

/**
 * null = skip: pending (Plaid sends the posted version later as a new
 * transaction), dated before the item's import_from (already covered by
 * CSV history), or on an account the user chose not to track.
 */
export function toTransactionRow(
  t: PlaidTransaction,
  ctx: { householdId: string; importFrom: string; accountNames: Map<string, string>; rules: CategoryRule[] },
): TransactionRow | null {
  if (t.pending || t.date < ctx.importFrom) return null;
  const bank = ctx.accountNames.get(t.account_id);
  if (!bank) return null;
  return {
    household_id: ctx.householdId,
    date: t.date,
    description: describe(t),
    amount: -t.amount, // Candid: negative = money out
    bank,
    category: candidCategory(t, ctx.rules),
    source: "plaid",
    plaid_transaction_id: t.transaction_id,
  };
}
