\set ON_ERROR_STOP on
-- RLS / trigger behavior for 0025 (custom format review) and 0026 (audit
-- log), run by CI against a fresh local database. Two users, everything
-- rolled back at the end.
begin;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@test.dev', '{}', '{}', now(), now()),
  ('bbbbbbbb-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@test.dev', '{}', '{}', now(), now());

create function pg_temp.as_user(uid text, aal text default 'aal2') returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', aal)::text, true);
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
grant execute on all functions in schema pg_temp to authenticated;

-- ===== 0025 custom format review =====
set local role authenticated;
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');

insert into public.custom_bank_formats (name, date_column, description_column, amount_type, amount_column, created_by, status)
values ('My Credit Union', 'Date', 'Memo', 'single_signed', 'Amount', 'aaaaaaaa-0000-0000-0000-000000000001', 'approved');
select pg_temp.check('client cannot self-approve (forced pending)',
  (select status from public.custom_bank_formats where name = 'My Credit Union') = 'pending');
select pg_temp.check('creator sees own pending format',
  exists (select 1 from public.custom_bank_formats where name = 'My Credit Union'));

insert into public.custom_bank_formats (name, date_column, description_column, amount_type, debit_column, credit_column, created_by)
values ('Swapped Bank', 'Date', 'Memo', 'split_debit_credit', 'Credit Amount', 'Debit Amount', 'aaaaaaaa-0000-0000-0000-000000000001');
select pg_temp.check('swapped debit/credit is flagged',
  (select review_flags from public.custom_bank_formats where name = 'Swapped Bank') = '{debit_credit_maybe_swapped}');

select pg_temp.expect_error('built-in name is reserved (punctuation/case ignored)',
  $$insert into public.custom_bank_formats (name, date_column, description_column, amount_type, amount_column, created_by)
    values ('chase-CHECKING', 'D', 'M', 'single_signed', 'A', 'aaaaaaaa-0000-0000-0000-000000000001')$$, '23514');

select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select pg_temp.check('other user cannot see a pending format',
  not exists (select 1 from public.custom_bank_formats where name = 'My Credit Union'));
select pg_temp.expect_error('name squatting: same name, different case/spacing',
  $$insert into public.custom_bank_formats (name, date_column, description_column, amount_type, amount_column, created_by)
    values ('my credit-union', 'D', 'M', 'single_signed', 'A', 'bbbbbbbb-0000-0000-0000-000000000002')$$, '23505');

reset role;
update public.custom_bank_formats set status = 'approved' where name = 'My Credit Union';
set local role authenticated;
select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select pg_temp.check('approved format is shared',
  exists (select 1 from public.custom_bank_formats where name = 'My Credit Union'));

-- ===== 0026 audit log =====
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
insert into public.accounts (household_id, name, type, balance, as_of_date)
select household_id, 'Test Checking', 'Checking', 100, current_date from public.household_members
where user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
update public.accounts set name = 'Renamed Checking' where name = 'Test Checking';
update public.accounts set name = 'Renamed Checking' where name = 'Renamed Checking'; -- no-op

select pg_temp.check('insert + update logged, no-op update skipped',
  (select count(*) from public.audit_log where table_name = 'accounts') = 2);
select pg_temp.check('update stores only changed columns',
  (select new from public.audit_log where table_name = 'accounts' and op = 'UPDATE') = '{"name": "Renamed Checking"}'
  and (select old from public.audit_log where table_name = 'accounts' and op = 'UPDATE') = '{"name": "Test Checking"}');
select pg_temp.check('actor recorded',
  (select bool_and(actor = 'aaaaaaaa-0000-0000-0000-000000000001') from public.audit_log where table_name = 'accounts'));

insert into public.transactions (household_id, date, description, amount, bank, category)
select household_id, '2026-11-01', 'COFFEE', -4.5, 'Chase Checking', 'Food' from public.household_members
where user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
select pg_temp.check('transaction insert not logged',
  not exists (select 1 from public.audit_log where table_name = 'transactions'));
delete from public.transactions where description = 'COFFEE';
select pg_temp.check('transaction delete logged',
  exists (select 1 from public.audit_log where table_name = 'transactions' and op = 'DELETE'));

select pg_temp.expect_error('clients cannot write the audit log',
  $$insert into public.audit_log (table_name, op) values ('x', 'INSERT')$$, '42501');

select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select pg_temp.check('other household sees none of A''s audit rows',
  not exists (select 1 from public.audit_log where actor = 'aaaaaaaa-0000-0000-0000-000000000001'));

select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001', 'aal1');
select pg_temp.check('aal1 session sees nothing', not exists (select 1 from public.audit_log));

-- ===== delete_own_account leaves nothing behind =====
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select public.delete_own_account();
reset role;
select pg_temp.check('no audit rows left for deleted user',
  not exists (select 1 from public.audit_log
              where actor = 'aaaaaaaa-0000-0000-0000-000000000001' or user_id = 'aaaaaaaa-0000-0000-0000-000000000001'));
select pg_temp.check('no accounts/transactions left',
  not exists (select 1 from public.accounts where name = 'Renamed Checking'));
select pg_temp.check('user B untouched',
  exists (select 1 from auth.users where id = 'bbbbbbbb-0000-0000-0000-000000000002'));

rollback;
\echo ALL_PASSED
