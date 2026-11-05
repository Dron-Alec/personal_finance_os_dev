-- Second half of 0028's key change. Apply only once the app that upserts
-- on (household_id, date, description, amount, plaid_transaction_id) is
-- deployed. Until this lands, two identical same-day Plaid transactions
-- can't both be stored.
alter table public.transactions drop constraint transactions_household_id_date_description_amount_key;
