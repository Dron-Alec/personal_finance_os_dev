-- Drop the now-vestigial user_id column from accounts/transactions. Kept as
-- its own migration, applied only after 0009-0012 are verified clean on a
-- branch: no CASCADE is passed, so if anything still references the
-- column, this fails loudly at apply time instead of silently succeeding.
alter table public.accounts drop column user_id;
alter table public.transactions drop column user_id;
