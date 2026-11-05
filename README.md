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
- **Email/password + mandatory MFA** — every account enrolls a TOTP authenticator app right after signup, and the database itself refuses data to any session that hasn't passed MFA; self-serve password reset, "log out everywhere", and account deletion
- **Audit log** — changes to accounts, balances, snapshots, goals, household links, and transaction edits/deletes are recorded (who, what, when) in `audit_log`
- **Interactive product tour, light/dark theme** — a guided first-run walkthrough and a theme toggle that follows system preference by default

## Stack

Next.js (App Router, TypeScript) · Tailwind + shadcn/ui · Recharts · Supabase (Postgres, Auth) · deployed on Vercel.

## Setup

1. Create a Supabase project.
2. Apply every file in [supabase/migrations/](supabase/migrations/) in order (they're numbered — `0001_init.sql`, `0002_seed_trigger.sql`, … through the latest) via the Supabase SQL Editor or CLI. Schema changes always land as a new numbered migration rather than editing an old one. The SQL Editor will warn about "destructive operations" on migrations that drop or replace policies — that's expected.
3. Copy `.env.local.example` to `.env.local` and fill in your project's URL and anon key (Supabase dashboard → Project Settings → API).
4. Install dependencies and run the dev server:
   ```bash
   npm install
   npm run dev
   ```

The app runs locally at `http://localhost:3000`.

## Deploying

Connect the repo to Vercel and set the app's environment variables. There's no service-role key or server secret in the app.

| Variable | Where | Public? | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel + `.env.local` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel + `.env.local` | Yes (RLS protects data) | Supabase anon key |
| `DATABASE_URL` | GitHub Actions secret | **No** | Session pooler URI used by the nightly backup |
| `BACKUP_AGE_RECIPIENT` | GitHub Actions secret | Yes (public key) | Encrypts nightly backups |
| `NEXT_PUBLIC_SENTRY_DSN` | Vercel | Yes | Turns on error reporting (unset = Sentry off) |
| `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | Vercel | **No** (token) | Optional: upload source maps so Sentry stack traces are readable |

Every push to `main` deploys to production; every pull request gets a Vercel preview and runs CI (see [Testing](#testing)).

## Data

All data lives in your Supabase project's Postgres database, scoped per-household via Row Level Security. Uploaded CSVs are parsed in memory and never stored. Financial columns aren't separately encrypted beyond Supabase's at-rest encryption — see [docs/decisions/0001-column-encryption.md](docs/decisions/0001-column-encryption.md) for why.

### Monitoring

- **Errors → Sentry** (`@sentry/nextjs`, config in [lib/sentry.ts](lib/sentry.ts)): client, server, and server-action errors, sent through the same-origin `/monitoring` tunnel. Errors only — no tracing, no session replay — and request bodies, cookies, headers, and query strings are stripped before sending. Off until `NEXT_PUBLIC_SENTRY_DSN` is set.
- **Logs:** `log(level, event, fields)` in [lib/log.ts](lib/log.ts) writes one JSON line per event to Vercel's runtime logs; `warn`/`error` also go to Sentry with the fields as tags. Events: `import.completed`, `import.failed`, `parse.no_rows` (a statement that parsed to nothing — usually a bank changing its export), `parse.failed`, `custom_format.created`, `auth.signout_everywhere`, `account.deleted`. Fields are ids, counts, and format names only — never transaction data. Login/MFA happen in the browser against Supabase Auth, so those events live in Supabase → Logs → Auth.
- **Error pages:** [app/(app)/error.tsx](app/(app)/error.tsx) (in-app, keeps the nav), [app/global-error.tsx](app/global-error.tsx), [app/not-found.tsx](app/not-found.tsx).
- **Uptime:** `GET /api/health` returns 200 when the app can reach Supabase Auth, 503 otherwise — point an uptime monitor at it.

### Backups

The Supabase Free plan keeps no restorable backups, so the repo makes its own:

- **Nightly:** [.github/workflows/backup.yml](.github/workflows/backup.yml) runs [scripts/backup-db.sh](scripts/backup-db.sh) (`pg_dump` of `public`, `private`, `auth`), encrypts it with [age](https://age-encryption.org) to `BACKUP_AGE_RECIPIENT`, and keeps it as a workflow artifact for 14 days. A failed run emails you. Run it on demand from **Actions → Nightly DB backup → Run workflow**.
- **On demand, locally:** `scripts/backup-db.sh` (prompts for the Session pooler URI; writes to `~/Documents/candid-backups/`).
- **Restore:** download the artifact, `age -d -i <private key> file.dump.age > file.dump`, then `pg_restore`. Keep the age private key outside GitHub — without it the backups can't be decrypted.

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
   `public.custom_bank_formats`. The format is usable right away by whoever
   created it, but stays **pending** — invisible to everyone else — until
   it's approved by hand (SQL at the top of
   [0025_custom_format_review.sql](supabase/migrations/0025_custom_format_review.sql)).
   Approved formats are shared with every user (a column mapping carries no
   financial data). Names are unique ignoring case and punctuation,
   built-in format names are reserved, and mappings whose debit/credit
   headers look swapped are flagged for the reviewer. A `low`-confidence or
   missing-required-fields detection blocks confirmation entirely rather
   than guessing.
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
npm test               # unit tests (CSV parsing, header matching, upload limits, …)
npm run lint
npx next typegen && npx tsc --noEmit
npm run build
```

**CI** ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs all of the above on every pull request and push to `main`, plus a `migrations` job that applies every migration to a fresh local Supabase database and runs the SQL behavior tests in [supabase/tests/](supabase/tests/) (two fake users; checks RLS, the custom-format review rules, and the audit log, then rolls back). Dependabot opens weekly dependency PRs.

To run the database tests locally (needs Docker): `npx supabase db start`, then `psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f supabase/tests/review_and_audit.sql`.
