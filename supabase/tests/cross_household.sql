\set ON_ERROR_STOP on
-- The household privacy boundary: a linked household sees only the
-- pre-aggregated summary views of the other — never its rows — and an
-- unlinked user or anon sees nothing at all. Also pins down that the
-- summary views run as their owner (security_invoker off): with it on, the
-- Combined tab silently loses the partner's data (the 0027 regression).
begin;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@test.dev', '{}', '{}', now(), now()),
  ('bbbbbbbb-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@test.dev', '{}', '{}', now(), now()),
  ('cccccccc-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c@test.dev', '{}', '{}', now(), now());

create function pg_temp.as_user(uid text, aal text default 'aal2') returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', aal)::text, true);
$$;
create function pg_temp.check(label text, ok boolean) returns void language plpgsql as $$
begin
  if not ok then raise exception 'FAIL: %', label; end if;
  raise notice 'ok   %', label;
end $$;
grant execute on all functions in schema pg_temp to authenticated, anon;

select pg_temp.check('summary views run as owner (security_invoker off)',
  not exists (
    select 1 from pg_class
    where relname in ('household_spending_summary', 'household_income_summary',
                      'household_account_balances', 'household_account_balance_history')
      and coalesce(reloptions, '{}') && array['security_invoker=on', 'security_invoker=true']));

create temp table ids as
select (select household_id from public.household_members where user_id = 'aaaaaaaa-0000-0000-0000-000000000001') a_hh;
grant select on ids to authenticated, anon;

-- A has an account, balance history, spending, income, a snapshot and a goal.
set local role authenticated;
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
insert into public.accounts (household_id, name, type, balance, as_of_date)
  select a_hh, 'A Checking', 'Checking', 500, current_date from ids;
insert into public.account_balance_history (account_id, user_id, as_of_date, balance)
  select id, 'aaaaaaaa-0000-0000-0000-000000000001', current_date, 500 from public.accounts where name = 'A Checking';
insert into public.transactions (household_id, date, description, amount, bank, category)
  select a_hh, current_date, 'SECRET MERCHANT', -42, 'Chase Checking', 'Food' from ids
  union all
  select a_hh, current_date, 'PAYROLL', 2000, 'Chase Checking', 'Income' from ids;
insert into public.nw_snapshots (user_id, date, net_worth) values ('aaaaaaaa-0000-0000-0000-000000000001', current_date, 500);
insert into public.goals (user_id, name, scope_type, target_amount, target_date)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'A goal', 'net_worth', 1000, current_date + 365);

-- A invites B; B accepts. C stays unlinked.
insert into public.household_invites (household_id, invited_email, invited_by, token)
  select a_hh, 'b@test.dev', 'aaaaaaaa-0000-0000-0000-000000000001', 'tok' from ids;
select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select pg_temp.check('B links with A', public.accept_household_invite('tok'));

-- Linked B: aggregates yes ...
select pg_temp.check('B sees A''s spending summary',
  exists (select 1 from public.household_spending_summary where household_id = (select a_hh from ids)));
select pg_temp.check('B sees A''s income summary',
  exists (select 1 from public.household_income_summary where household_id = (select a_hh from ids)));
select pg_temp.check('B sees A''s account balances',
  exists (select 1 from public.household_account_balances where household_id = (select a_hh from ids)));
select pg_temp.check('B sees A''s balance history',
  exists (select 1 from public.household_account_balance_history where household_id = (select a_hh from ids)));
-- ... rows no.
select pg_temp.check('B cannot read A''s transactions',
  not exists (select 1 from public.transactions where household_id = (select a_hh from ids)));
select pg_temp.check('B cannot read A''s accounts table',
  not exists (select 1 from public.accounts where household_id = (select a_hh from ids)));
select pg_temp.check('B cannot read A''s balance history table',
  not exists (select 1 from public.account_balance_history where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'));
select pg_temp.check('B cannot read A''s snapshots or goals',
  not exists (select 1 from public.nw_snapshots where user_id = 'aaaaaaaa-0000-0000-0000-000000000001')
  and not exists (select 1 from public.goals where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'));
select pg_temp.check('B cannot read A''s audit log',
  not exists (select 1 from public.audit_log where household_id = (select a_hh from ids)));
select pg_temp.check('no transaction description leaks through any summary view',
  not exists (select 1 from public.household_spending_summary s where s::text like '%SECRET MERCHANT%')
  and not exists (select 1 from public.household_income_summary s where s::text like '%PAYROLL%'));

-- Linked but without MFA: nothing.
select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000002', 'aal1');
select pg_temp.check('B without MFA sees no summaries',
  not exists (select 1 from public.household_spending_summary)
  and not exists (select 1 from public.household_account_balances));

-- Unlinked C: nothing of A's, rows or summaries.
select pg_temp.as_user('cccccccc-0000-0000-0000-000000000003');
select pg_temp.check('unlinked C sees none of A''s summaries',
  not exists (select 1 from public.household_spending_summary where household_id = (select a_hh from ids))
  and not exists (select 1 from public.household_income_summary where household_id = (select a_hh from ids))
  and not exists (select 1 from public.household_account_balances where household_id = (select a_hh from ids))
  and not exists (select 1 from public.household_account_balance_history where household_id = (select a_hh from ids)));
select pg_temp.check('unlinked C sees none of A''s rows',
  not exists (select 1 from public.transactions) and not exists (select 1 from public.accounts)
  and not exists (select 1 from public.nw_snapshots) and not exists (select 1 from public.goals));

-- After revoking, B loses the summaries too.
select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000002');
update public.household_links set status = 'revoked';
select pg_temp.check('revoked link hides A''s summaries from B',
  not exists (select 1 from public.household_spending_summary where household_id = (select a_hh from ids)));

-- anon: no access to the views at all.
reset role;
set local role anon;
select pg_temp.check('anon has no SELECT on summary views',
  not has_table_privilege('anon', 'public.household_spending_summary', 'SELECT')
  and not has_table_privilege('anon', 'public.household_account_balances', 'SELECT'));

rollback;
\echo ALL_PASSED
