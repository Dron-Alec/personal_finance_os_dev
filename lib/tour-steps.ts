export type TourStep = {
  id: string;
  path: string;
  // data-tour attribute value to highlight; omitted for centered, un-anchored steps.
  target?: string;
  title: string;
  body: string;
};

export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    path: "/data-entry",
    title: "Welcome to Candid",
    body: "Your money, honestly. No auto-sync smoothing over the details, no dashboard you glance at and forget — Candid asks you to actually look, because that's the part that works. This is a quick tour of every tab; use Next/Back to move around, or Skip at any time — you can always restart this from the ? in the header.",
  },
  {
    id: "balances",
    path: "/data-entry",
    target: "balances-card",
    title: "Month-End Balances",
    body: "Enter a balance date and a balance per account. Saving updates each account, appends to its balance history, and creates a net worth snapshot for that date.",
  },
  {
    id: "suggested-accounts",
    path: "/data-entry",
    target: "suggested-accounts",
    title: "Add an Account",
    body: "Expand this to see a checklist of account names/types you haven't created yet — enter a balance to create one, or leave it at $0 to skip. Remove a checklist item with the ✕ (asks to confirm) without touching any real account, or add your own with a name and a searchable type dropdown. Accounts typed \"Other\" get a checkbox here to mark them as debt.",
  },
  {
    id: "get-a-csv",
    path: "/data-entry",
    target: "csv-upload",
    title: "Getting a CSV From Your Bank",
    body: "Every bank labels this a little differently, but the pattern holds almost everywhere: log into your bank or card issuer's website — not the mobile app, export is usually desktop-only — and look for \"Statements,\" \"Documents,\" or \"Activity.\" Pick a date range, then look for a \"Download\" or \"Export\" option. Choose CSV specifically if there's a choice — not PDF or QFX. Save the file, then come back here to upload it.",
  },
  {
    id: "csv-upload",
    path: "/data-entry",
    target: "csv-upload",
    title: "Upload Statements",
    body: "Pick your bank/card format, then upload one or more CSV exports. Transactions are parsed, auto-categorized by keyword, and deduplicated — re-uploading an overlapping statement won't create duplicates.",
  },
  {
    id: "transactions-panel",
    path: "/data-entry",
    target: "transactions-panel",
    title: "Transactions on File",
    body: "Every imported transaction, newest first, with a one-click CSV export of everything currently loaded.",
  },
  {
    id: "snapshot-form",
    path: "/net-worth",
    target: "snapshot-form",
    title: "Manual Snapshot",
    body: "Record a net worth figure directly — date, amount, optional note — without going through the Data Entry balance form.",
  },
  {
    id: "nw-chart",
    path: "/net-worth",
    target: "nw-chart",
    title: "Net Worth Chart",
    body: "Your net worth over time. Filter by date range or by which accounts count toward the line, and any goal with a contribution plan overlays its projected trajectory automatically. Appears once you have at least one snapshot.",
  },
  {
    id: "goals",
    path: "/net-worth",
    target: "goals",
    title: "Goals",
    body: "Set a target amount and date, scoped to your overall net worth or a single account. Each goal shows a progress ring, whether you're ahead or behind the pace needed to hit it, and a projected completion date at your current rate.",
  },
  {
    id: "account-overlay",
    path: "/net-worth",
    target: "account-overlay",
    title: "Accounts Compared",
    body: "Every account's balance over time on one chart, each colored to match its slice on the Accounts page — appears once at least one account has balance history.",
  },
  {
    id: "spending",
    path: "/spending",
    target: "spending-page",
    title: "Spending Analysis",
    body: "Once transactions exist, filter by month/category/account, see a category breakdown pie and monthly bar chart, and bulk re-categorize by description. “Internal Transfer” and “Income” are excluded from spending totals by design, so transfers between your own accounts don't inflate what you actually spent.",
  },
  {
    id: "account-form",
    path: "/accounts",
    target: "account-form",
    title: "Add / Update Account",
    body: "Set a name, type, balance, and as-of date. The type is locked once an account is created — editing an existing account only ever updates its balance.",
  },
  {
    id: "accounts-table",
    path: "/accounts",
    target: "accounts-table",
    title: "Your Accounts",
    body: "Every account you've created, with a ✕ (confirm required) to remove one along with its balance history. Past net worth snapshots aren't retroactively changed.",
  },
  {
    id: "portfolio-breakdown",
    path: "/accounts",
    target: "portfolio-breakdown",
    title: "Portfolio Breakdown",
    body: "Once you have accounts, see your total balance broken down by account and by account type.",
  },
  {
    id: "balance-history",
    path: "/accounts",
    target: "balance-history",
    title: "Balance History",
    body: "Pick any account to chart its balance over time, colored to match its slice in the Portfolio Breakdown above.",
  },
  {
    id: "category-rules",
    path: "/settings",
    target: "category-rules",
    title: 'Category Rules (the "buckets")',
    body: "Each category has an ordered list of comma-separated keywords — the first keyword that matches a transaction's description (case-insensitive) wins. Saving re-categorizes every existing transaction against the updated rules.",
  },
  {
    id: "household",
    path: "/settings",
    target: "household",
    title: "Invite a Household Member",
    body: "Enter their email and send an invite — there's no email service wired up yet, so you'll get a link back to copy and send yourself. Once they sign up (or sign in) and accept, a Combined tab appears for both of you with shared category-level spending and net worth. Your individual transactions are never shared, even once linked, and either of you can revoke the link anytime from here.",
  },
  {
    id: "danger-zone",
    path: "/settings",
    target: "danger-zone",
    title: "Danger Zone",
    body: '"Clear All Transactions" wipes transactions only. "Reset ALL Data" wipes transactions, accounts, and snapshots. Both require confirming first and can\'t be undone.',
  },
  {
    id: "about",
    path: "/settings",
    target: "about",
    title: "About Candid",
    body: "The full case for why Candid makes you look at your own transactions instead of syncing quietly in the background — read it anytime here.",
  },
  {
    id: "wrap-up",
    path: "/settings",
    title: "You're all set",
    body: "Every account requires TOTP two-factor sign-in, and your data is private by design (Row Level Security) — no other user can ever see it. Switch light/dark/system from the header, and reopen this tour anytime with the ? icon.",
  },
];
