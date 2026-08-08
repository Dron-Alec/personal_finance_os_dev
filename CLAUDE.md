@AGENTS.md

# Personal Finance OS — Project Context

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

## Supabase
- New project (separate from the old Streamlit-era `AlecHaleyFinances` /
  `lfqezqcymxcdseqcsbfh` project, which is no longer used).
- Schema lives in `supabase/migrations/` — apply `0001_init.sql` then
  `0002_seed_trigger.sql` to a fresh project.
- Tables: `accounts`, `account_balance_history`, `transactions`,
  `nw_snapshots`, `category_rules`, `nw_targets` — all scoped by `user_id`,
  RLS enabled + forced on every table.
- `accounts` has a unique constraint on `(user_id, name)`; account `type` is
  set at creation only — the app never updates it once created.
- `handle_new_user()` trigger seeds `category_rules` and `nw_targets` for
  every new signup (default keyword map + the historical target curve).
- Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (see
  `.env.local.example`).

## Statement formats supported
Citi Checking, Citi Credit, Discover, Axos Checking, Axos Savings,
Wells Fargo Checking, Wells Fargo Credit, Chase Checking, Chase Credit,
Bank of America Checking, Bank of America Credit
