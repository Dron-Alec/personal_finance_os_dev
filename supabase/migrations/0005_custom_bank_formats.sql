-- Shared (NOT per-user) table of community-confirmed CSV column mappings
-- for banks not in the built-in BANK_FORMATS list. Deliberately breaks from
-- this schema's usual per-user RLS isolation: a column-name mapping carries
-- no financial data (just header names + a sign/format convention), so once
-- one user confirms a format it's useful to every user who banks there —
-- e.g. Haley benefits from a format Alec discovers, and vice versa.
create table public.custom_bank_formats (
  id bigint generated always as identity primary key,
  name text not null unique,
  date_column text not null,
  secondary_date_column text,
  description_column text not null,
  amount_type text not null check (amount_type in (
    'single_signed', 'split_debit_credit', 'single_unsigned_with_type_column'
  )),
  amount_column text,
  debit_column text,
  credit_column text,
  type_column text,
  category_column text,
  balance_column text,
  number_format text check (number_format in ('US', 'European')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.custom_bank_formats is
  'Shared across all users by design — column-name mappings only, no '
  'financial data. Populated when a user runs an unrecognized statement '
  'through Tier 2 detection and confirms the result.';

alter table public.custom_bank_formats enable row level security;
alter table public.custom_bank_formats force row level security;

-- Every authenticated user can read every row (that's the point — shared).
create policy "select all authenticated" on public.custom_bank_formats
  for select to authenticated using (true);

-- Anyone can contribute a new format, but only attributed to themselves.
-- No update/delete policy for v1 — contributions are immutable once added.
create policy "insert own contribution" on public.custom_bank_formats
  for insert to authenticated with check ((select auth.uid()) = created_by);
