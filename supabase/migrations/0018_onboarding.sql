-- New-account onboarding: a one-time "which banks/accounts do you have"
-- step shown right after MFA enrollment. account_templates.bank_format
-- lets a *suggested* account carry a bank/card hint before it becomes a
-- real accounts row (mirrors accounts.bank_format from 0006). user_settings
-- tracks completion (onboarded_at) so the gate in lib/supabase/proxy.ts only
-- fires once per user.
alter table public.account_templates add column bank_format text;

create table public.user_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  onboarded_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;
alter table public.user_settings force row level security;

create policy "select own" on public.user_settings
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "insert own" on public.user_settings
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "update own" on public.user_settings
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
