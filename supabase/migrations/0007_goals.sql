-- Purpose-built goals: a target amount + target date, scoped either to
-- aggregate net worth or a single account. Multiple concurrent goals are
-- supported (resolves the "single goal vs many" open question in
-- Backlog.md in favor of many — nothing about the model requires just one).
--
-- starting_amount/start_date are captured once at creation and never
-- recomputed — they're the fixed baseline the pace/variance line is drawn
-- from, so a goal's "on track" reading doesn't retroactively shift if
-- historical snapshots are edited later.
create table public.goals (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  scope_type text not null check (scope_type in ('net_worth', 'account')),
  account_id bigint references public.accounts (id) on delete cascade,
  starting_amount numeric(14, 2) not null default 0,
  target_amount numeric(14, 2) not null check (target_amount > 0),
  target_date date not null,
  created_at timestamptz not null default now(),
  constraint goals_account_scope_check check (
    (scope_type = 'account' and account_id is not null)
    or (scope_type = 'net_worth' and account_id is null)
  )
);

alter table public.goals enable row level security;
alter table public.goals force row level security;

create policy "select own" on public.goals
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "insert own" on public.goals
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "update own" on public.goals
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "delete own" on public.goals
  for delete to authenticated using ((select auth.uid()) = user_id);
