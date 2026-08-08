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

export const BANK_FORMATS = [
  "Citi Checking",
  "Citi Credit",
  "Discover",
  "Axos Checking",
  "Axos Savings",
  "Wells Fargo Checking",
  "Wells Fargo Credit",
  "Chase Checking",
  "Chase Credit",
  "Bank of America Checking",
  "Bank of America Credit",
] as const;

export type BankFormat = (typeof BANK_FORMATS)[number];

// Standard account checklist offered during month-end backfill entry for
// accounts the user hasn't set up yet. [name, type]
export const STANDARD_ACCOUNTS: [string, AccountType][] = [
  ["Citi Checking", "Checking"],
  ["Axos Checking", "Checking"],
  ["Axos Savings", "Savings"],
  ["Coinbase", "Crypto"],
  ["Roth 401k", "401k"],
  ["Roth IRA", "Roth IRA"],
  ["Taxable Brokerage", "Brokerage / Stocks"],
  ["Other Investments", "Other"],
];

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

// Ported from targets.csv — seeded per-user on signup into nw_targets.
export const DEFAULT_NW_TARGETS: { quarter: string; target_net_worth: number }[] = [
  { quarter: "2025-Q3", target_net_worth: 37572.5 },
  { quarter: "2025-Q4", target_net_worth: 45000.0 },
  { quarter: "2026-Q1", target_net_worth: 55000.0 },
  { quarter: "2026-Q2", target_net_worth: 68000.0 },
  { quarter: "2026-Q3", target_net_worth: 85000.0 },
  { quarter: "2026-Q4", target_net_worth: 105000.0 },
  { quarter: "2027-Q1", target_net_worth: 135000.0 },
  { quarter: "2027-Q2", target_net_worth: 175000.0 },
  { quarter: "2027-Q3", target_net_worth: 225000.0 },
  { quarter: "2027-Q4", target_net_worth: 290000.0 },
  { quarter: "2028-Q1", target_net_worth: 375000.0 },
  { quarter: "2028-Q2", target_net_worth: 475000.0 },
  { quarter: "2028-Q3", target_net_worth: 595000.0 },
  { quarter: "2028-Q4", target_net_worth: 735000.0 },
  { quarter: "2029-Q1", target_net_worth: 890000.0 },
  { quarter: "2029-Q2", target_net_worth: 1050000.0 },
  { quarter: "2029-Q3", target_net_worth: 1190000.0 },
  { quarter: "2029-Q4", target_net_worth: 1312500.0 },
];
