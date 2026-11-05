@AGENTS.md

# Candid ("Your money, honestly.") — Project Context

Formerly "Personal Finance OS" — renamed to Candid. The repo directory,
Supabase project name, and package.json name are unchanged (internal
identifiers only); this is a user-facing brand rename.

## What this is
A Next.js app for tracking personal finances: net worth over time, spending
habits from bank/credit card statements, and account balances. Deployed on
Vercel, backed by Supabase (Postgres + Auth with mandatory TOTP MFA).

Each household has its own private data (RLS-scoped, `accounts`/`transactions`
by `household_id`, everything else by `user_id`). Every user starts in their
own solo household. Two users can link households (Settings → invite by
email → recipient accepts at `/invite/[token]`) to unlock a **Combined** tab
showing aggregated net worth, cash flow, and spending — see the README's
"Combined / Household View" section for the full flow and the privacy
boundary (linked households only ever see pre-aggregated summary views,
never each other's transactions).

## Stack
- Next.js 16 (App Router, TypeScript, React 19), Tailwind + shadcn/ui (Base UI
  primitives), Recharts for charts
- Supabase: Postgres with RLS, Supabase Auth (email/password + mandatory TOTP
  MFA enrollment right after signup — see `proxy.ts` / `lib/supabase/proxy.ts`)
- No service-role key anywhere in app code — every read/write goes through
  the RLS-scoped client

## Accounts (Alec) — historical reference from the old Streamlit app

| Account | Type |
|---|---|
| Taxable Brokerage | Brokerage / Stocks |
| Roth IRA | Roth IRA |
| Roth 401k | 401k |
| Axos Savings | Savings |
| Axos Checking | Checking |
| Citi Checking | Checking |
| Coinbase | Crypto |
| Other Investments | Other |

**Note:** "Stocks / Brokerage" is an old name — consolidated into "Taxable Brokerage".
Alec has a Roth 401k only (no traditional 401k).

### May 12, 2026 balances (baseline, partially estimated, total = $50,912.33)

| Account | Balance |
|---|---|
| Taxable Brokerage | $21,112.33 |
| Axos Checking | $8,300.00 |
| Roth 401k | $7,000.00 |
| Roth IRA | $4,700.00 |
| Axos Savings | $3,000.00 |
| Citi Checking | $2,500.00 |
| Other Investments | $3,100.00 |
| Coinbase | $1,200.00 |

This was migrated into the live Supabase backend from the old Streamlit
database (`lfqezqcymxcdseqcsbfh`, `person='alec'` rows) — Alec's account no
longer needs manual re-entry. Haley's (`person='haley'`) data has not been
fully migrated the same way; only ad hoc pieces have been moved over so far.

## Data entry workflow
- **Month-end balances** → Data Entry tab → updates accounts + creates net worth snapshot
- **Spending** → Data Entry tab → upload CSV statements as they arrive
- The month-end form's "Suggested accounts" checklist is backed by the
  `account_templates` table, not a hardcoded list — each suggestion has an
  ✕ (with confirm) to remove it, and there's an inline "Add a suggested
  account" control (name + searchable type dropdown) to add your own.
  Removing/adding a suggestion only edits the checklist; it doesn't touch
  real `accounts` rows. Account `type` fields (here and on the Accounts tab)
  use a searchable combobox (`components/accounts/account-type-select.tsx`)
  over the fixed `ACCOUNT_TYPES` catalog — "Other" is the existing catch-all
  type, not freeform text.

## Supabase
- Live project: **Personal_Finances_OS** (ref `ycvxvdtigwkjpwgoiqhz`, region
  ca-central-1) — separate from the old Streamlit-era `AlecHaleyFinances` /
  `lfqezqcymxcdseqcsbfh` project, which is no longer used.
- Schema lives in `supabase/migrations/`, all applied in order to the live
  project (currently `0001` through `0026` — always check the directory for
  the actual latest, this note goes stale fast). New schema changes always
  land as a new numbered migration, never an edit to an old one.
- **Applying a migration to live:** the Supabase MCP connector auto-declines
  anything it deems destructive (`drop policy`, `revoke`, `delete`) because
  its confirmation prompt can't be shown in this session — don't split the
  SQL or route it through `execute_sql` to get around that. Instead: push
  first so CI proves it applies to a fresh DB, have Alec paste the file into
  the Dashboard SQL Editor, then verify via `execute_sql` and record it with
  `insert into supabase_migrations.schema_migrations (version, name)`. Never
  use `supabase db push` — live history uses timestamp versions that don't
  match the local `00NN_` filenames, so it would re-run old migrations.
- Tables: `accounts`, `account_balance_history`, `account_templates`,
  `transactions`, `nw_snapshots`, `category_rules`, `goals`, `households`,
  `household_members`, `household_invites`, `household_links`,
  `user_settings`, `custom_bank_formats`, `audit_log` — RLS enabled + forced
  on every table. `accounts` and `transactions` are scoped by `household_id`
  (migrated off `user_id` in `0009`–`0013`); everything else by `user_id`.
- **MFA is enforced in the database, not just `proxy.ts`** (`0024`): every
  table has a restrictive `require aal2` policy, and the household helpers /
  SECURITY DEFINER RPCs check `aal` too. Any new table needs the same policy.
  `household_links` is revoke-only for clients (links are created only by
  `accept_household_invite`). Rows referencing an `account_id` must point at
  an account the caller can see (restrictive `own account only` policies).
- **`custom_bank_formats` review** (`0025`): new formats are forced to
  `pending` by a trigger and visible only to their creator until approved by
  hand in the SQL editor (queries at the top of `0025`). Names are unique
  ignoring case/punctuation and built-in names are reserved — that SQL list
  must match `BANK_FORMATS` (enforced by
  `lib/__tests__/custom-format-review.test.ts`). Swapped-looking
  debit/credit mappings get `review_flags`.
- **`audit_log`** (`0026`): written only by the `private.audit_row()`
  trigger (accounts, balances, snapshots, goals, household tables, custom
  formats, transaction updates/deletes — not transaction inserts). Updates
  store only changed columns. `delete_own_account()` sets
  `candid.skip_audit` and purges the user's history; keep that if the RPC
  is ever rewritten. Deleting an account removes that user's own household
  and all its data; a household link cascades away, so the other person is
  back to solo (Combined tab gone, Settings offers "invite" again) with
  their data untouched. Households only ever have one member — linking
  joins households, never adds members — keep it that way or revisit this.
  `supabase/tests/account_deletion.sql` sweeps every public table for
  leftovers.
- **Don't accept the advisor's "Security Definer View" fix** for
  `household_spending_summary`, `household_income_summary`,
  `household_account_balances`, `household_account_balance_history`. They
  must run as owner — access is enforced in their WHERE clause — and with
  `security_invoker=on` the Combined tab silently loses the partner's data.
  That happened on live once (fixed in `0027`); `supabase/tests/cross_household.sql`
  fails if a migration ever does it. The `rls_auto_enable()` function is
  Supabase's own "auto-enable RLS" event trigger, not ours.
- Database behavior tests live in `supabase/tests/*.sql` (plain psql, two
  fake users, rolled back) and run in CI after all migrations apply to a
  fresh local database.
- `accounts` has a unique constraint on `(household_id, name)`; account
  `type` is set at creation only — the app never updates it once created.
  `transactions` has a unique constraint on
  `(household_id, date, description, amount)` so re-importing the same
  statement is a no-op. `account_templates` has a `(user_id, name)`
  uniqueness but is fully editable (it's just suggestions, not real
  balances).
- `handle_new_user()` trigger seeds `category_rules` and `account_templates`
  for every new signup (default keyword map, and starter suggestions:
  Checking, Savings, Coinbase/Crypto, 401k, Roth IRA, Taxable Brokerage,
  Other Investments). `nw_targets` (a quarterly target curve) was dropped in
  migration `0017_drop_nw_targets.sql` — superseded by Goals, which cover
  the same "target amount by date" job with contribution plans and chart
  overlays.
- Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (see
  `.env.local.example`) — already set in `.env.local` for the live project.

## Statement formats supported
The source of truth is `BANK_FORMATS` in `lib/constants.ts` (20 built-ins:
Ally, Amex, Apple Card, Axos ×2, BofA ×2, Capital One ×2, Chase ×2, Citi ×2,
Discover, PayPal, PNC, US Bank, Venmo, Wells Fargo ×2) plus approved rows in
`custom_bank_formats`. Adding a built-in also means reserving its name in a
new migration (see the review note above). CSV uploads are capped in
`readCsvFiles()` / `csvFilesError()` (`lib/csv-parsing.ts`): `.csv` only,
≤ 12 files, ≤ 900 KB total (Next's server-action body limit is 1 MB),
≤ 20k rows — always read uploads through those, never `file.text()`.

## Security, CI, and ops
- Headers (CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy,
  Permissions-Policy) are set in `next.config.ts`; a new third-party script
  or API (Sentry, Plaid Link) needs a CSP entry there.
- Post-auth redirects go through `safeRedirect()` (`lib/utils.ts`).
- Settings has "Log out everywhere" (`signOutEverywhere`, global scope); a
  password reset signs out other sessions.
- Decisions are recorded in `docs/decisions/` — `0001`: no column-level
  encryption for financial data; Supabase Vault only for secrets (Plaid
  tokens).
- CI (`.github/workflows/ci.yml`): lint → `next typegen` (needed for the
  `LayoutProps`/`PageProps` globals on a fresh checkout) → `tsc` → tests →
  build, plus a `migrations` job (all migrations on a fresh DB +
  `supabase/tests`). Dependabot runs weekly; `@types/node` majors are
  ignored so the types track the Node 22 runtime. TypeScript 7 is on hold
  until typescript-eslint supports it.
- `npm audit` has no high findings; `overrides` pins `systeminformation`
  (pulled in via the shadcn CLI). Local npm 10.9.0 crashes on some installs
  (`edgesOut`) — use `npx npm@11 install` if it does.
- **Backups (Free plan = no Supabase backups):**
  `.github/workflows/backup.yml` runs `scripts/backup-db.sh` nightly,
  age-encrypts the dump to the `BACKUP_AGE_RECIPIENT` public key, and keeps
  14 days of artifacts. Secrets `DATABASE_URL` + `BACKUP_AGE_RECIPIENT` live
  on the `personal_finance_os_dev` repo (not the older `personal-finance-os`
  repo). The private key is Alec's, kept outside GitHub. A restore has not
  been tested yet.
- **Monitoring:** Sentry via `instrumentation.ts` / `instrumentation-client.ts`
  / `lib/sentry.ts` (errors only, request data scrubbed, off without
  `NEXT_PUBLIC_SENTRY_DSN`). In Sentry v11, `withSentryConfig` imports from
  `@sentry/nextjs/config`. Error-page props in Next 16 are
  `{ error: unknown, retry }` — not `reset`. Server-side events go through
  `log()` in `lib/log.ts` (never put descriptions/amounts/emails in fields).
  `/monitoring` (Sentry tunnel) and `/api/health` are excluded from the
  `proxy.ts` matcher; any future public endpoint (e.g. a Plaid webhook)
  needs the same.
- **Plaid (sandbox):** one Edge Function `supabase/functions/plaid/`
  (deployed with `verify_jwt: false` — it checks the user JWT + aal2 itself,
  and Plaid's ES256 signature on `/webhook`). Redeploy via the MCP
  `deploy_edge_function` with `import_map_path: "deno.json"` (omitting it
  fails on redeploy); typecheck with
  `npx deno@2.5.6 check --config supabase/functions/plaid/deno.json supabase/functions/plaid/index.ts`.
  `supabase/functions` is excluded from the Next tsconfig. Tokens live in
  Vault via `plaid_store_item` / `plaid_access_token` (service_role only);
  the `delete_plaid_secret` trigger removes the secret whenever a
  `plaid_items` row goes. Pure mapping logic is in `mapping.ts`, unit-tested
  from `lib/__tests__/plaid-mapping.test.ts`. Access is per-user via the
  `plaid_access` table (`0030`; clients read-only, grant by SQL) — the UI
  and the function's `link_token`/`exchange` both check it. OAuth returns
  land on `/accounts?oauth_state_id=…` and resume from localStorage;
  allowed return URLs come from the `PLAID_REDIRECT_URIS` secret. Transactions dedupe on
  `(household_id, date, description, amount, plaid_transaction_id)`
  NULLS NOT DISTINCT — CSV upserts must name all five columns.
- Retention: `private.run_retention()` via pg_cron nightly (`0030`) — invites
  30 days, audit_log 1 year, runs with `candid.skip_audit`.
- Ops docs: `docs/runbook.md`, `docs/plaid-security-questionnaire.md`,
  `docs/legal/privacy-policy-draft.md` (draft — the live /privacy page still
  says Candid never connects to banks; replace it before Plaid goes beyond
  testers). `scripts/test-restore.sh` rehearses a backup restore.
- Production plan + status: `docs/production-plan.md`.
