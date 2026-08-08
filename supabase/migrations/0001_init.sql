-- Personal Finance OS — initial schema
-- Every table is scoped to auth.uid() via RLS. No service-role access from
-- the app; the anon/authenticated client key is the only key ever used.

-- ── accounts ──────────────────────────────────────────────────────────────
create table public.accounts (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  type text not null check (type in (
    'Checking', 'Savings', 'Credit Card',
    'Brokerage / Stocks', '401k', 'Roth IRA', 'Traditional IRA',
    'Crypto', 'Real Estate', 'Other'
  )),
  balance numeric(14, 2) not null default 0,
  as_of_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

comment on table public.accounts is
  'One row per account (checking, savings, brokerage, etc). ''type'' is set '
  'at creation only — the app never updates it, preserving a locked account '
  'type once created.';

-- ── account_balance_history ──────────────────────────────────────────────
-- Normalized (not a JSONB array on accounts) so per-account history can be
-- range-queried and indexed for the balance-history chart.
create table public.account_balance_history (
  id bigint generated always as identity primary key,
  account_id bigint not null references public.accounts (id) on delete cascade,
  -- Denormalized from accounts.user_id so RLS is a flat column check
  -- instead of an EXISTS subquery against accounts on every row.
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  balance numeric(14, 2) not null,
  as_of_date date not null,
  created_at timestamptz not null default now()
);

create index account_balance_history_user_account_date_idx
  on public.account_balance_history (user_id, account_id, as_of_date);

-- ── transactions ──────────────────────────────────────────────────────────
create table public.transactions (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  description text not null,
  amount numeric(14, 2) not null,
  bank text not null,
  category text not null default 'Other',
  created_at timestamptz not null default now(),
  unique (user_id, date, description, amount)
);

create index transactions_user_date_idx on public.transactions (user_id, date desc);
create index transactions_user_category_idx on public.transactions (user_id, category);

comment on constraint transactions_user_id_date_description_amount_key on public.transactions is
  'Backs CSV-import dedup: ON CONFLICT (user_id, date, description, amount) DO NOTHING.';

-- ── nw_snapshots ─────────────────────────────────────────────────────────
create table public.nw_snapshots (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  net_worth numeric(14, 2) not null,
  note text,
  created_at timestamptz not null default now()
);

create index nw_snapshots_user_date_idx on public.nw_snapshots (user_id, date);

-- ── category_rules ───────────────────────────────────────────────────────
-- One document per user: an ordered JSON array of {category, keywords[]}.
-- Order matters (first keyword match wins), which is why this is a single
-- ordered array rather than N normalized rows with a synthetic rank column.
create table public.category_rules (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  rules jsonb not null,
  updated_at timestamptz not null default now()
);

-- ── nw_targets ───────────────────────────────────────────────────────────
create table public.nw_targets (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  quarter text not null check (quarter ~ '^\d{4}-Q[1-4]$'),
  target_net_worth numeric(14, 2) not null,
  primary key (user_id, quarter)
);

-- ── Row Level Security ───────────────────────────────────────────────────
alter table public.accounts enable row level security;
alter table public.accounts force row level security;
alter table public.account_balance_history enable row level security;
alter table public.account_balance_history force row level security;
alter table public.transactions enable row level security;
alter table public.transactions force row level security;
alter table public.nw_snapshots enable row level security;
alter table public.nw_snapshots force row level security;
alter table public.category_rules enable row level security;
alter table public.category_rules force row level security;
alter table public.nw_targets enable row level security;
alter table public.nw_targets force row level security;

-- One select/insert/update/delete policy set per table, each scoped to
-- (select auth.uid()) so the function is evaluated once per statement
-- (cached), not once per row.
do $$
declare
  t text;
begin
  foreach t in array array[
    'accounts', 'account_balance_history', 'transactions',
    'nw_snapshots', 'category_rules', 'nw_targets'
  ]
  loop
    execute format(
      'create policy "select own" on public.%I for select to authenticated using ((select auth.uid()) = user_id)',
      t
    );
    execute format(
      'create policy "insert own" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)',
      t
    );
    execute format(
      'create policy "update own" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      t
    );
    execute format(
      'create policy "delete own" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)',
      t
    );
  end loop;
end $$;

-- account_balance_history rows are immutable once written (append-only
-- ledger) — no update policy needed; select/insert/delete cover the app's
-- needs (delete only via account removal cascade or reset-all-data).
drop policy "update own" on public.account_balance_history;
