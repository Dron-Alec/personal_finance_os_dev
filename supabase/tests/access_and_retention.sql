\set ON_ERROR_STOP on
-- 0030: plaid_access is read-own / never client-writable; the nightly
-- retention job purges old invites and audit rows without re-logging them.
begin;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
values ('aaaaaaaa-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@test.dev', '{}', '{}', now(), now()),
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
grant execute on all functions in schema pg_temp to authenticated;

insert into public.plaid_access (user_id) values ('aaaaaaaa-0000-0000-0000-000000000001');

set local role authenticated;
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select pg_temp.check('granted user sees their access', exists (select 1 from public.plaid_access));
select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select pg_temp.check('other user sees nothing', not exists (select 1 from public.plaid_access));
select pg_temp.expect_error('users cannot grant themselves access',
  $$insert into public.plaid_access (user_id) values ('bbbbbbbb-0000-0000-0000-000000000002')$$, '42501');
reset role;

select pg_temp.check('retention job is scheduled',
  exists (select 1 from cron.job where jobname = 'candid-retention'));

insert into public.household_invites (household_id, invited_email, invited_by, token, created_at)
select household_id, x.email, 'aaaaaaaa-0000-0000-0000-000000000001', x.token, x.created
from public.household_members, (values ('old@test.dev', 'old', now() - interval '31 days'), ('new@test.dev', 'new', now())) x(email, token, created)
where user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
insert into public.audit_log (table_name, op, at) values ('x', 'INSERT', now() - interval '13 months'), ('y', 'INSERT', now());
delete from public.audit_log where table_name = 'household_invites';

select private.run_retention();
select pg_temp.check('invite older than 30 days purged, recent one kept',
  not exists (select 1 from public.household_invites where token = 'old')
  and exists (select 1 from public.household_invites where token = 'new'));
select pg_temp.check('audit rows older than a year purged, recent kept',
  not exists (select 1 from public.audit_log where table_name = 'x')
  and exists (select 1 from public.audit_log where table_name = 'y'));
select pg_temp.check('purge did not copy the invitee email into the audit log',
  not exists (select 1 from public.audit_log where old::text like '%old@test.dev%'));

rollback;
\echo ALL_PASSED
