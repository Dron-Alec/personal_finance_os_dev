@AGENTS.md

# Candid ("Your money, honestly.") — Project Context

Formerly "Personal Finance OS" — renamed to Candid. The repo directory,
Supabase project name, and package.json name are unchanged (internal
identifiers only); this is a user-facing brand rename.

## What this is
A Next.js app for tracking personal finances: net worth over time, spending
habits from bank/credit card statements, and account balances. Deployed on
Vercel, backed by Supabase (Postgres + Auth with mandatory TOTP MFA).

Each user has their own private data (RLS-scoped by `auth.uid()`). There's no
shared household/combined view yet — Alec and Haley each get their own
account and see only their own tab. A "join finances" combined view is a
possible future feature, deliberately not built yet.

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

This data was never migrated into the new Supabase backend (the rewrite
started fresh) — re-enter it via Data Entry once each account exists.

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
- Schema lives in `supabase/migrations/`, applied in order: `0001_init.sql`,
  `0002_seed_trigger.sql`, `0003_account_templates.sql`,
  `0004_account_template_defaults.sql`. All four are already applied to the
  live project — run them in order against any fresh project.
- Tables: `accounts`, `account_balance_history`, `account_templates`,
  `transactions`, `nw_snapshots`, `category_rules`, `goals` — all scoped by
  `user_id`, RLS enabled + forced on every table.
- `accounts` has a unique constraint on `(user_id, name)`; account `type` is
  set at creation only — the app never updates it once created.
  `account_templates` has the same `(user_id, name)` uniqueness but is
  fully editable (it's just suggestions, not real balances).
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
Citi Checking, Citi Credit, Discover, Axos Checking, Axos Savings,
Wells Fargo Checking, Wells Fargo Credit, Chase Checking, Chase Credit,
Bank of America Checking, Bank of America Credit
