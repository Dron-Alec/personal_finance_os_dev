# Personal Finance OS

A personal finance dashboard built with Next.js and Supabase. Track net worth over time, import bank/credit card statements, monitor spending by category, and manage account balances — all in one place.

## Features

- **Transaction import** — upload CSV exports from Citi, Discover, Axos, Wells Fargo, Chase, Bank of America, and more
- **Spending analysis** — automatic categorization, pie/bar charts, monthly breakdowns, and re-categorization tools
- **Net worth tracking** — snapshot-based history with a chart and quarterly targets
- **Account balances** — track checking, savings, crypto, 401k, Roth IRA, taxable brokerage, and more
- **Manual balance entry** — backfill missed months by entering all account balances for a specific date in one form
- **Private per-user data** — each account's data is isolated via Postgres Row Level Security; nobody else can see it
- **Email/password + mandatory MFA** — every account enrolls a TOTP authenticator app right after signup

## Stack

Next.js (App Router, TypeScript) · Tailwind + shadcn/ui · Recharts · Supabase (Postgres, Auth) · deployed on Vercel.

## Setup

1. Create a Supabase project.
2. Apply the migrations in order via the Supabase SQL Editor or CLI:
   ```bash
   supabase/migrations/0001_init.sql
   supabase/migrations/0002_seed_trigger.sql
   ```
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

## Backfilling Missing Months

Go to **Data Entry** → **Month-End Balances**, pick the date (e.g. end of a past month), enter balances for each account, and click **Save Balances & Snapshot**. This updates account balances and records a net worth snapshot for that date.

## Testing

```bash
npm test    # CSV parsing unit tests
npm run lint
npm run build
```
