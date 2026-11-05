\set ON_ERROR_STOP on
-- delete_own_account() between two LINKED households: the deleter's data is
-- gone from every table, the link dissolves (survivor is back to solo —
-- Settings offers "invite" again), and the survivor's data is untouched.
-- Households only ever have one member (linking joins households, it never
-- adds members), so "the household disappears" = the link row cascades away.
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
grant execute on all functions in schema pg_temp to authenticated;

create temp table ids as
select
  (select household_id from public.household_members where user_id = 'aaaaaaaa-0000-0000-0000-000000000001') a_hh,
  (select household_id from public.household_members where user_id = 'bbbbbbbb-0000-0000-0000-000000000002') b_hh;
grant select on ids to authenticated;

-- Both users get data in every user/household-scoped table.
set local role authenticated;
do $$
declare
  u text;
begin
  foreach u in array array['aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002'] loop
    perform pg_temp.as_user(u);
    insert into public.accounts (household_id, name, type, balance, as_of_date)
      select household_id, 'Checking ' || u, 'Checking', 100, current_date from public.household_members where user_id = u::uuid;
    insert into public.account_balance_history (account_id, user_id, as_of_date, balance)
      select id, u::uuid, current_date, 100 from public.accounts where name = 'Checking ' || u;
    insert into public.transactions (household_id, date, description, amount, bank, category)
      select household_id, current_date, 'COFFEE ' || u, -4.5, 'Chase Checking', 'Food' from public.household_members where user_id = u::uuid;
    insert into public.nw_snapshots (user_id, date, net_worth) values (u::uuid, current_date, 100);
    insert into public.goals (user_id, name, scope_type, target_amount, target_date)
      values (u::uuid, 'Goal ' || u, 'net_worth', 1000, current_date + 365);
    update public.accounts set balance = 200 where name = 'Checking ' || u; -- creates audit rows
  end loop;
end $$;

-- A invites B; B accepts -> linked.
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
insert into public.household_invites (household_id, invited_email, invited_by, token)
select a_hh, 'b@test.dev', 'aaaaaaaa-0000-0000-0000-000000000001', 'test-token' from ids;
select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select pg_temp.check('B accepts the invite', public.accept_household_invite('test-token'));
select pg_temp.check('households are linked',
  exists (select 1 from public.household_links where status = 'active'));

-- A deletes their account.
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select public.delete_own_account();
reset role;

select pg_temp.check('A''s auth user is gone',
  not exists (select 1 from auth.users where id = 'aaaaaaaa-0000-0000-0000-000000000001'));
select pg_temp.check('link dissolved (B is back to solo)',
  not exists (select 1 from public.household_links));

-- Sweep every public table for any column that could point at A.
do $$
declare
  col record;
  n bigint;
  a_uid uuid := 'aaaaaaaa-0000-0000-0000-000000000001';
  a_hh uuid := (select a_hh from ids);
begin
  for col in
    select c.table_name, c.column_name
    from information_schema.columns c
    join information_schema.tables t using (table_schema, table_name)
    where c.table_schema = 'public' and t.table_type = 'BASE TABLE'
      and c.column_name in ('user_id', 'household_id', 'household_a_id', 'household_b_id',
                            'created_by', 'invited_by', 'actor', 'id')
      and c.data_type = 'uuid'
  loop
    execute format('select count(*) from public.%I where %I in ($1, $2)', col.table_name, col.column_name)
      into n using a_uid, a_hh;
    if n > 0 then
      raise exception 'FAIL: % row(s) in %.% still reference A', n, col.table_name, col.column_name;
    end if;
  end loop;
  raise notice 'ok   no public table references A''s user or household';
end $$;

select pg_temp.check('B''s household still exists',
  exists (select 1 from public.households where id = (select b_hh from ids)));
select pg_temp.check('B''s accounts/transactions/snapshots/goals intact',
  (select count(*) from public.accounts where household_id = (select b_hh from ids)) = 1
  and (select count(*) from public.transactions where household_id = (select b_hh from ids)) = 1
  and (select count(*) from public.nw_snapshots where user_id = 'bbbbbbbb-0000-0000-0000-000000000002') = 1
  and (select count(*) from public.goals where user_id = 'bbbbbbbb-0000-0000-0000-000000000002') = 1);
select pg_temp.check('B''s own audit history kept',
  exists (select 1 from public.audit_log where user_id = 'bbbbbbbb-0000-0000-0000-000000000002' or household_id = (select b_hh from ids)));

rollback;
\echo ALL_PASSED
