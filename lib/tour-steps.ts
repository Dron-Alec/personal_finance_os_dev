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
    title: "Your Accounts Checklist",
    body: "Alongside accounts you've already created, this list starts with common account types you haven't set up yet — give one a balance to create it (or leave it at $0 to skip), or remove it with the ✕ (asks to confirm, doesn't touch any real account). Use \"Add an account\" below to add your own; it'll join this list once added. Accounts typed \"Other\" get a checkbox here to mark them as debt.",
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

// In-depth walkthrough of the Spending tab, offered from "Complete your
// profile" and the Learn page. Steps whose target isn't on screen (e.g. no
// transactions yet) fall back to a centered card, so the copy has to make
// sense either way.
export const SPENDING_TOUR_STEPS: TourStep[] = [
  {
    id: "sp-intro",
    path: "/data-entry",
    title: "Where is your money going?",
    body: "This walkthrough covers the whole loop: getting your statements in, reading the Spending tab, fixing categories so the numbers are right, and making it a monthly habit. It takes about two minutes. Skip anytime with ✕.",
  },
  {
    id: "sp-upload",
    path: "/data-entry",
    target: "csv-upload",
    title: "Step 1: Get your transactions in",
    body: "Download a CSV from each bank and card you spend from (log into the website, look under Statements or Activity, and choose CSV, not PDF). Pick the matching format here and upload. Grab every account you spend from, because a card you leave out makes the totals look better than they are. Overlapping uploads are deduplicated, so re-uploading is safe.",
  },
  {
    id: "sp-filters",
    path: "/spending",
    target: "spending-filters",
    title: "Step 2: Narrow it down",
    body: "Search matches transaction descriptions (try \"amazon\" or \"uber\"). Month, Category, and Account narrow everything below them: totals, both charts, and the table. A good first pass is the most recent full month with Category set to All, to see the whole picture.",
  },
  {
    id: "sp-exclude",
    path: "/spending",
    target: "spending-exclude",
    title: "Exclude what you can't change",
    body: "Click a category to drop it from the totals and charts, and click again to bring it back. Excluding fixed costs like Rent or Insurance leaves your discretionary spending, which is where the cuts are. Internal Transfer and Income are never counted as spending, so moving money between your own accounts doesn't inflate the numbers.",
  },
  {
    id: "sp-totals",
    path: "/spending",
    target: "spending-totals",
    title: "Step 3: Read the totals",
    body: "Total Spending is money out, and Total Income / Credits is money in (paychecks, refunds, interest). Net Cash Flow is the difference. Green means you kept money that month, and red means you spent more than came in. If it's red most months, start with the biggest slice in the pie next.",
  },
  {
    id: "sp-pie",
    path: "/spending",
    target: "spending-pie",
    title: "Spending by Category",
    body: "Each slice is a category's share of the filtered spending. Look at the two or three biggest slices. Cutting 10% from a big category usually beats cutting a small one entirely. A big \"Other\" slice means categories need fixing (Step 4).",
  },
  {
    id: "sp-monthly",
    path: "/spending",
    target: "spending-monthly",
    title: "Month over month",
    body: "Stacked bars show each month's total split by category. Switch to the line view to follow single categories over time, and click a legend entry to hide one. A category that keeps rising, like dining or subscriptions, is often spending creeping up without anyone deciding it should.",
  },
  {
    id: "sp-table",
    path: "/spending",
    target: "spending-table",
    title: "Step 4: Fix categories",
    body: "Every transaction that matches your filters, newest first. If something is in the wrong bucket, check its box (or search for a merchant, then use the header checkbox to select all of them), pick a category, and hit Apply. This changes those transactions only.",
  },
  {
    id: "sp-rules",
    path: "/settings",
    target: "category-rules",
    title: "Make the fix permanent",
    body: "To make a fix stick for future uploads, add the merchant's keyword to a category here. The first matching keyword wins, case-insensitive. Saving re-categorizes everything you've already imported too.",
  },
  {
    id: "sp-habit",
    path: "/spending",
    title: "Step 5: Make it a habit",
    body: "Once a month, upload new statements, scan the pie for surprises, fix any \"Other\" transactions, and check Net Cash Flow. Fifteen minutes of actually looking is what changes spending. You can restart this walkthrough from the Learn tab.",
  },
];

export const TOURS = { main: TOUR_STEPS, spending: SPENDING_TOUR_STEPS } as const;
export type TourName = keyof typeof TOURS;

// Per-account "has dismissed the tour" flag in localStorage (see ProductTour).
export function tourSeenKey(userId: string) {
  return `pfos-tour-seen:${userId}`;
}

export const START_TOUR_EVENT = "candid:start-tour";

export function startTour(name: TourName) {
  window.dispatchEvent(new CustomEvent<TourName>(START_TOUR_EVENT, { detail: name }));
}
