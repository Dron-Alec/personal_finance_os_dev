export const ACCOUNT_TYPES = [
  "Checking",
  "Savings",
  "Credit Card",
  "Brokerage / Stocks",
  "401k",
  "Roth IRA",
  "Traditional IRA",
  "Crypto",
  "Real Estate",
  "Other",
] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

// Credit Card is the one ACCOUNT_TYPES value that's unambiguously a
// liability. "Other" is the one ambiguous enough to need an explicit
// per-account choice (isLiability, accounts.is_liability) — everything else
// is unambiguously an asset. The user always enters a positive number
// (nobody thinks of their card balance as "-500"); this is the single place
// that flips it negative before it's stored, so every place that sums
// account balances (net worth snapshots, Total Account Value, per-type
// totals) subtracts liabilities automatically instead of adding them.
// Math.abs guards against a double-negative if someone types a negative
// number themselves.
export function signedBalance(type: string, amount: number, isLiability = false): number {
  return type === "Credit Card" || isLiability ? -Math.abs(amount) : amount;
}

// Alphabetized — order doesn't affect parsing, and the dropdown is
// searchable, but a stable sort makes the unfiltered list easier to scan.
// Only formats with independently sourced/tested header data belong here
// (see lib/__tests__/csv-header-matcher.test.ts) — an entry here implies
// the app can actually parse it, not just that the bank offers CSV export.
export const BANK_FORMATS = [
  "Ally Bank",
  "American Express",
  "Apple Card",
  "Axos Checking",
  "Axos Savings",
  "Bank of America Checking",
  "Bank of America Credit",
  "Capital One 360",
  "Capital One Credit",
  "Chase Checking",
  "Chase Credit",
  "Citi Checking",
  "Citi Credit",
  "Discover",
  "PayPal",
  "PNC",
  "US Bank",
  "Venmo",
  "Wells Fargo Checking",
  "Wells Fargo Credit",
] as const;

export type BankFormat = (typeof BANK_FORMATS)[number];

export const SPENDING_EXCLUDE_CATEGORIES = new Set(["Internal Transfer", "Income"]);

export type CategoryRule = { category: string; keywords: string[] };

// Ordered — first keyword match wins. Ported from the Streamlit app's
// DEFAULT_CATEGORY_MAP; seeded per-user on signup into category_rules.
export const DEFAULT_CATEGORY_RULES: CategoryRule[] = [
  {
    category: "Groceries",
    keywords: [
      "TRADER JOE", "WHOLE FOOD", "WHOLEFDS", "STOP & SHOP", "ALDI",
      "PUBLIX", "WALMART", "WAL-MART", "WM SUPERCENTER", "JERSEY CITY BUY RITE",
      "GROCERY", "KROGER", "COSTCO", "SAFEWAY", "WEGMANS", "SHOPRITE",
      "GIANT", "HARRIS TEETER",
      "WOODMAN", "HY-VEE", "METCALFE", "METRO MARKET",
      "FESTIVAL FOODS", "PICK N SAVE", "WILLY ST", "FRESH MADISON",
      "MEIJER", "SENTRY FOODS", "TARGET",
    ],
  },
  {
    category: "Dining",
    keywords: [
      "RESTAURANT", "CAFE", "COFFEE", "STARBUCKS", "DUNKIN", "PIZZA",
      "SUSHI", " BAR ", "TAVERN", "GRILL", "DINER", "CHIPOTLE", "CHICK-FIL",
      "MCDONALD", "BURGER", "SUBWAY", "PANERA", "PHO", "TACO", "TST*",
      "DOORDASH", "GRUBHUB", "UBEREATS", "SEAMLESS", "HYPPO",
      "IRREGARDLESS", "BREADS BAKERY",
    ],
  },
  {
    category: "Transportation",
    keywords: [
      "MTA*", "MTA ", "PATH TAPP", "UBER", "LYFT", "SUNOCO", "SHELL",
      "EXXON", "PILOT ", "SHEETZ", " GAS ", "AMTRAK", "GREYHOUND",
      "DELTA", "AMERICAN AIR", "UNITED AIR", "SOUTHWEST", "PARKERS",
    ],
  },
  {
    category: "Utilities",
    keywords: [
      "PSEG", "PUBLIC SERVICE", "COMCAST", "XFINITY", "CON ED",
      "NATIONAL GRID", "VERIZON", "AT&T", "T-MOBILE", "SPECTRUM",
    ],
  },
  {
    category: "Rent / Housing",
    keywords: ["BALD COLLECTION", "RENT", "HOUSING", "APARTMENT", "MORTGAGE"],
  },
  {
    category: "Subscriptions",
    keywords: [
      "SPOTIFY", "NETFLIX", "HULU", "DISNEY", "AMAZON PRIME", "HBO",
      "APPLE.COM/BILL", "GOOGLE*", "YOUTUBE", "PATREON", "AUDIBLE",
      "PERPLEXITY", "CHATGPT", "OPENAI", "OURARING", "MEMBERSHIP FEE",
    ],
  },
  {
    category: "Shopping",
    keywords: [
      "AMAZON", "TARGET 000", "CRATE AND BARREL", "NORDSTROM", "MACY",
      "H&M", "ZARA", "WALGREENS", "CVS", "RITE AID", "THE ATTIC",
      "SCHROPP", "KALSHI", "WALMART STORE", "PAPERSOURCE",
    ],
  },
  {
    category: "Health & Fitness",
    keywords: [
      "PHARMACY", "OURA", "GYM", "PELOTON", "FITNESS", "HEALTH",
      "MEDICAL", "DENTAL", "VISION", "DOCTOR", "HOSPITAL",
    ],
  },
  {
    category: "Investments",
    keywords: [
      "COINBASE", "FID BKG SVC", "FIDELITY", "VANGUARD", "SCHWAB",
      "ROBINHOOD", "E*TRADE", "TD AMERITRADE",
    ],
  },
  {
    category: "Income",
    keywords: ["PAYROLL", "DIRECT DEPOSIT", "CROWE LLP", "JEWISHFEDERATION", "MESORAH"],
  },
  {
    category: "Transfers",
    keywords: ["VENMO", "ZELLE", "PAYPAL", "CASHAPP", "HALEY GRINER"],
  },
  {
    category: "Internal Transfer",
    keywords: [
      "TRANSFER FROM", "TRANSFER TO",
      "ONLINE PAYMENT", "BILL PAYMENT", "PAYMENT - THANK YOU", "PAYMENT THANK YOU",
      "AXOS BANK",
    ],
  },
];
