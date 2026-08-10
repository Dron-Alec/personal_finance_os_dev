-- accounts/transactions: household_id replaces user_id as the ownership
-- boundary. account_balance_history is deliberately left untouched — its
-- household_id is resolved via a join to accounts at query time (0015's
-- household_account_balance_history view) rather than a second backfill;
-- neither Tier 2 summary view needs it directly, since current balances
-- come from accounts itself.
--
-- household_id has no default (unlike user_id's `default auth.uid()` — a
-- Postgres column default can't express "the current user's household").
-- Every accounts/transactions insert site in the app must explicitly set
-- household_id from here on (lib/actions/accounts.ts, lib/actions/
-- data-entry.ts's CSV import path) — this ships together with this
-- migration, not as a later cleanup, or the app breaks between migrations.

alter table public.accounts add column household_id uuid references public.households (id);

update public.accounts a
set household_id = hm.household_id
from public.household_members hm
where hm.user_id = a.user_id;

alter table public.accounts alter column household_id set not null;

alter table public.accounts drop constraint accounts_user_id_name_key;
alter table public.accounts add constraint accounts_household_id_name_key unique (household_id, name);
create index accounts_household_id_idx on public.accounts (household_id);

-- transactions: same pattern. The unique constraint backs CSV-import
-- ON CONFLICT DO NOTHING dedup — moving it to household scope means two
-- members of the same household importing overlapping statements still
-- dedup correctly (moot today since household == 1 user in this task's
-- scope, but it's the correct long-term semantics and costs nothing now).
alter table public.transactions add column household_id uuid references public.households (id);

update public.transactions t
set household_id = hm.household_id
from public.household_members hm
where hm.user_id = t.user_id;

alter table public.transactions alter column household_id set not null;

alter table public.transactions drop constraint transactions_user_id_date_description_amount_key;
alter table public.transactions add constraint transactions_household_id_date_description_amount_key
  unique (household_id, date, description, amount);

drop index transactions_user_date_idx;
drop index transactions_user_category_idx;
create index transactions_household_date_idx on public.transactions (household_id, date desc);
create index transactions_household_category_idx on public.transactions (household_id, category);
