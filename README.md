# Candid

*Your money, honestly.*

A personal finance dashboard built with Next.js and Supabase. Track net worth over time, import bank/credit card statements, monitor spending by category, and manage account balances — all in one place.

## Features

- **Transaction import** — upload CSV exports from Citi, Discover, Axos, Wells Fargo, Chase, Bank of America, and more
- **Spending analysis** — automatic categorization, pie/bar charts, monthly breakdowns, and re-categorization tools
- **Net worth tracking** — snapshot-based history with a chart, filterable by account
- **Goals** — target-amount-by-date goals (net worth or a single account) with contribution-pace plans and a chart overlay showing projected vs. actual
- **Account balances** — track checking, savings, credit cards, loans, crypto, 401k, Roth/Traditional IRA, real estate, and more; liabilities are signed correctly in net worth
- **Manual balance entry** — backfill missed months by entering all account balances for a specific date in one form
- **Household / Combined view** — invite a partner to link households and see combined net worth, cash flow, and spending, without merging or exposing either person's individual transactions (see [Combined / Household View](#combined--household-view) below)
- **Private per-user data** — each household's data is isolated via Postgres Row Level Security; a linked household only ever sees pre-aggregated summaries, never raw transactions
- **Email/password + mandatory MFA** — every account enrolls a TOTP authenticator app right after signup; self-serve password reset and account deletion
- **Interactive product tour, light/dark theme** — a guided first-run walkthrough and a theme toggle that follows system preference by default

## Stack

Next.js (App Router, TypeScript) · Tailwind + shadcn/ui · Recharts · Supabase (Postgres, Auth) · deployed on Vercel.

## Setup

1. Create a Supabase project.
2. Apply every file in [supabase/migrations/](supabase/migrations/) in order (they're numbered — `0001_init.sql`, `0002_seed_trigger.sql`, … through the latest) via the Supabase SQL Editor or CLI. Schema changes always land as a new numbered migration rather than editing an old one.
3. Copy `.env.local.example` to `.env.local` and fill in your project's URL and anon key (Supabase dashboard → Project Settings → API).
4. Install dependencies and run the dev server:
   ```bash
   npm install
   npm run dev
   ```

The app runs locally at `http://localhost:3000`.

## Deploying

Connect the repo to Vercel and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as project environment variables. No other configuration is required — there's no service-role key or server secret to manage.

## Data

All data lives in your Supabase project's Postgres database, scoped per-user via Row Level Security. Nothing is stored locally.

## Importing Transactions

1. Export a CSV from your bank's website
2. Go to **Data Entry** → **Upload Statements** → select the matching statement format → upload the file(s)
3. Duplicate transactions (same date, description, and amount) are automatically skipped on re-import

### Statement format fallback chain

When you pick a bank from the **Statement Format** dropdown and import fails
to find any transactions, the import falls back through tiers rather than
just erroring out:

1. **Tier 0 — file sniffing.** `findHeaderRow()` in
   [lib/csv-parsing.ts](lib/csv-parsing.ts) skips preamble rows (account
   summaries, disclaimers) to find the real header line.
2. **Tier 1 — known bank format.** `parseCsvForBank()` looks for the fixed
   column names for the selected `BankFormat` (e.g. Citi's `Debit`/`Credit`
   split, Discover's sign convention).
3. **Tier 2 — deterministic header matching.** If Tier 1 finds nothing,
   [lib/import/csv-header-matcher.ts](lib/import/csv-header-matcher.ts)'s
   `matchHeaders()` tries to recognize the columns anyway: exact synonym
   lookup, then fuzzy (Levenshtein) matching, then value-sampling to detect
   number format and negative-value convention. It's 100% local/regex-based
   — no network calls, no AI, and it never sees full transaction data (only
   headers and a handful of sample cell values). It returns a confidence
   (`high`/`medium`/`low`). When a *known* format is picked and Tier 1 finds
   nothing, `importCsv()` only *describes* a medium/high-confidence guess in
   the error message — it never auto-imports on it.
4. **Tier 3 — one-tap confirmation, for statements from a bank not in the
   dropdown at all.** Pick **"Other (add a new format)"** in the Statement
   Format picker, name the bank, and click **Detect columns from file** —
   this runs the same Tier 2 matcher client-side
   ([components/data-entry/csv-upload-form.tsx](components/data-entry/csv-upload-form.tsx))
   and shows the detected date/description/amount columns plus a few sample
   parsed rows before anything imports. Confirming calls
   `confirmCustomFormatAndImport()`
   ([lib/actions/custom-bank-formats.ts](lib/actions/custom-bank-formats.ts)),
   which imports the transactions *and* saves the mapping to
   `public.custom_bank_formats` — a table shared across every user (by
   design: a column-mapping carries no financial data), so the format is a
   normal dropdown entry for anyone from then on, not just whoever confirmed
   it. A `low`-confidence or missing-required-fields detection blocks
   confirmation entirely rather than guessing.
5. **Tier 4 — fully manual.** Still not built: if Tier 2's detection can't
   confidently map a genuinely unrecognized layout, there's no UI yet to
   hand-assign columns yourself.

**Adding a new synonym** (e.g. a confirmed bank uses `"Trans Amt"` for
amount): add the normalized form (lowercase, no spaces/punctuation) to that
field's `primary` list in `SYNONYMS` in `lib/import/csv-header-matcher.ts`,
then add a test case in `lib/__tests__/csv-header-matcher.test.ts` using
that bank's real header row. Keep normalized forms — `normalizeHeader()`
strips everything but lowercase letters and digits before comparing.

Only use a field's `secondary` list for a term that's genuinely ambiguous
— i.e. it means that field on *some* exports but something else on others
(American Express's "Reference" column is a transaction ID, not a
description, even though "reference" is a legitimate description synonym
elsewhere). `matchField()` tries every header against `primary` first,
across the whole row, before it ever looks at `secondary`, so an
unambiguous term always wins regardless of column order. Most fields don't
need a `secondary` list at all — leave it `[]`.

**Coverage so far**: Chase (checking + credit), Citi (checking + credit),
Capital One (credit + 360), Bank of America, Apple Card, Discover, Wells
Fargo, PNC, Venmo, American Express, US Bank, Ally, PayPal — sourcing
confidence for each is noted in its test case. Axos, Navy Federal, USAA, TD
Bank, Truist, Regions, Charles Schwab, Fidelity, SoFi, Marcus, Chime, Cash
App, and Robinhood are known to exist but have no verified header sample
yet (`it.todo` placeholders mark them) — real samples welcome.

## Combined / Household View

Every user starts in their own solo household — their accounts, transactions, and balances stay private, scoped by Postgres RLS, exactly as if the feature didn't exist.

To see a shared picture with a partner:

1. **Invite.** From **Settings → Household**, invite a partner by email (`inviteToHousehold` in [lib/actions/households.ts](lib/actions/households.ts)). This creates a `household_invites` row with a token, not a household merge.
2. **Accept.** The invited partner opens the link (`/invite/[token]`), which links the two *households* via a `household_links` row — each household keeps its own accounts and transactions, owned and editable only by its own members. Nothing is transferred or merged.
3. **Combined tab.** Once linked, a **Combined** tab appears for both people with a **Combined / View by person** toggle ([components/combined/view-toggle.tsx](components/combined/view-toggle.tsx)), showing three sections:
   - **Net Worth** — [components/combined/combined-net-worth-section.tsx](components/combined/combined-net-worth-section.tsx)
   - **Cash Flow** — Total Spending / Total Income / Net Cash Flow, combined or per-household ([components/combined/combined-cashflow-section.tsx](components/combined/combined-cashflow-section.tsx))
   - **Spending** — category pie chart plus a monthly stacked-bar breakdown ([components/combined/combined-spending-section.tsx](components/combined/combined-spending-section.tsx))
4. **Revoke.** Either person can revoke the link from Settings at any time — this immediately removes the Combined tab for both sides and doesn't touch either household's own data.

**Privacy boundary:** the combined views never read transaction-level data from a linked household. They query Postgres views — `household_spending_summary` and `household_income_summary` (`supabase/migrations/0015_household_summary_views.sql`, `0022_household_income_summary.sql`) — that pre-aggregate to category/month totals *inside* the view definition, are declared `security_barrier` (so Postgres can't push a caller predicate underneath the aggregation to leak row-level values), and gate access via `private.is_household_member()` / `private.is_linked_household()` in their `WHERE` clause. A linked partner can see "you spent $340 on Groceries in July," never the individual line items behind that number.

All `lib/actions/household-summaries.ts` functions (`getCombinedNetWorth`, `getCombinedCashFlow`, `getCombinedSpendingSummary`) follow the same shape: fetch the caller's `household_id`, query the summary view (which self-filters to "my household OR actively linked households"), and group into `combined` + `perHousehold` results for the toggle.

## Backfilling Missing Months

Go to **Data Entry** → **Month-End Balances**, pick the date (e.g. end of a past month), enter balances for each account, and click **Save Balances & Snapshot**. This updates account balances and records a net worth snapshot for that date.

## Testing

```bash
npm test    # CSV parsing unit tests
npm run lint
npm run build
```
