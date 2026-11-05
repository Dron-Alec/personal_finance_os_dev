\set ON_ERROR_STOP on
-- 0028/0029: Plaid tokens only in Vault and only for service_role; users
-- see connection status, never the secret; deleting a connection (or the
-- whole account) deletes the secret; CSV dedupe unchanged; identical Plaid
-- transactions both kept.
begin;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@test.dev', '{}', '{}', now(), now()),
  ('bbbbbbbb-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@test.dev', '{}', '{}', now(), now());

create function pg_temp.as_user(uid text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', 'aal2')::text, true);
$$;
create function pg_temp.check(label text, ok boolean) returns void language plpgsql as $$
begin
  if not ok then raise exception 'FAIL: %', label; end if;
  raise notice 'ok   %', label;
end $$;
create function pg_temp.expect_error(label text, stmt text, code text) returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    if sqlstate = code then raise notice 'ok   % (%)', label, sqlstate; return; end if;
    raise exception 'FAIL: % — got % %', label, sqlstate, sqlerrm;
  end;
  raise exception 'FAIL: % — no error', label;
end $$;
grant execute on all functions in schema pg_temp to authenticated, service_role;

create temp table ids as
select (select household_id from public.household_members where user_id = 'aaaaaaaa-0000-0000-0000-000000000001') a_hh;
grant select on ids to authenticated, service_role;

-- The Edge Function's path: service_role stores and reads the token.
set local role service_role;
select public.plaid_store_item((select a_hh from ids), 'item-sandbox-1', 'First Platypus Bank',
  'access-sandbox-SECRET', '2026-10-01', 'aaaaaaaa-0000-0000-0000-000000000001');
select pg_temp.check('service_role reads the token back',
  public.plaid_access_token((select id from public.plaid_items where plaid_item_id = 'item-sandbox-1')) = 'access-sandbox-SECRET');
reset role;

select pg_temp.check('token is not stored in any plaid_items column',
  not exists (select 1 from public.plaid_items p where p::text like '%access-sandbox-SECRET%'));
select pg_temp.check('token is encrypted in vault.secrets',
  not exists (select 1 from vault.secrets s where s.secret like '%access-sandbox-SECRET%'));

-- Signed-in users: status yes, secret no.
set local role authenticated;
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select pg_temp.check('owner sees connection status',
  (select status from public.plaid_items where institution_name = 'First Platypus Bank') = 'active');
select pg_temp.expect_error('owner cannot read the vault secret id',
  'select access_token_secret_id from public.plaid_items', '42501');
select pg_temp.expect_error('owner cannot call plaid_access_token',
  $$select public.plaid_access_token(gen_random_uuid())$$, '42501');
select pg_temp.expect_error('owner cannot call plaid_store_item',
  $$select public.plaid_store_item(gen_random_uuid(), 'x', 'x', 'x', current_date, gen_random_uuid())$$, '42501');
select pg_temp.expect_error('owner cannot write plaid_items',
  $$update public.plaid_items set status = 'active'$$, '42501');
select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select pg_temp.check('other household sees no connection',
  not exists (select 1 from public.plaid_items));

-- CSV dedupe unchanged (old + new keys both present until 0029).
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
insert into public.transactions (household_id, date, description, amount, bank, category)
  select a_hh, '2026-11-01', 'COFFEE', -4.5, 'Chase Checking', 'Dining' from ids;
insert into public.transactions (household_id, date, description, amount, bank, category)
  select a_hh, '2026-11-01', 'COFFEE', -4.5, 'Chase Checking', 'Dining' from ids
  on conflict (household_id, date, description, amount, plaid_transaction_id) do nothing;
select pg_temp.check('re-importing the same CSV row is a no-op',
  (select count(*) from public.transactions where description = 'COFFEE' and source = 'csv') = 1);
reset role;

-- After 0029: two identical Plaid transactions are both kept.
alter table public.transactions drop constraint if exists transactions_household_id_date_description_amount_key;
insert into public.transactions (household_id, date, description, amount, bank, category, source, plaid_transaction_id)
  select a_hh, '2026-11-02', 'Blue Bottle', -4.5, 'Plaid Checking', 'Dining', 'plaid', p from ids, unnest(array['tx-1', 'tx-2']) p;
select pg_temp.check('identical same-day Plaid transactions both stored',
  (select count(*) from public.transactions where description = 'Blue Bottle') = 2);
select pg_temp.expect_error('a Plaid transaction id is stored once',
  $$insert into public.transactions (household_id, date, description, amount, bank, category, source, plaid_transaction_id)
    select a_hh, '2026-11-03', 'X', -1, 'P', 'Other', 'plaid', 'tx-1' from ids$$, '23505');

-- Disconnect deletes the secret.
delete from public.plaid_items where plaid_item_id = 'item-sandbox-1';
select pg_temp.check('disconnect deletes the vault secret',
  not exists (select 1 from vault.decrypted_secrets where decrypted_secret = 'access-sandbox-SECRET'));

-- Account deletion (households cascade) deletes the secret too.
set local role service_role;
select public.plaid_store_item((select a_hh from ids), 'item-sandbox-2', 'Bank', 'access-sandbox-OTHER', current_date, 'aaaaaaaa-0000-0000-0000-000000000001');
reset role;
set local role authenticated;
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select public.delete_own_account();
reset role;
select pg_temp.check('account deletion deletes the vault secret',
  not exists (select 1 from vault.decrypted_secrets where decrypted_secret = 'access-sandbox-OTHER')
  and not exists (select 1 from public.plaid_items));

rollback;
\echo ALL_PASSED
