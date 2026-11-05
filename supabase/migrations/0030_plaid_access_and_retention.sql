-- 1. Who may use Plaid while access is limited (sandbox now, then Limited
-- Production). The app shows "Connected banks" only to these users, and the
-- plaid Edge Function refuses everyone else. Clients can read their own row
-- and never write; grant by hand in the SQL editor:
--   insert into public.plaid_access (user_id) select id from auth.users where email = '...';
--   delete from public.plaid_access where user_id = (select id from auth.users where email = '...');
create table public.plaid_access (
  user_id uuid primary key references auth.users (id) on delete cascade,
  granted_at timestamptz not null default now()
);

alter table public.plaid_access enable row level security;
alter table public.plaid_access force row level security;
create policy "select own" on public.plaid_access
  for select to authenticated using (user_id = (select auth.uid()));
create policy "require aal2" on public.plaid_access as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2')
  with check ((select auth.jwt() ->> 'aal') = 'aal2');
revoke all on public.plaid_access from anon, authenticated;
grant select on public.plaid_access to authenticated;

-- 2. Retention, run nightly by pg_cron:
--   - household invites (they hold the invitee's email) 30 days after
--     creation — by then every invite is accepted, revoked, or expired (7-day
--     expiry);
--   - audit_log rows older than a year.
-- Raw CSVs need nothing here: they're parsed in memory and never stored.
-- Deleting invites would otherwise copy each invitee email into audit_log,
-- defeating the point, so this skips auditing like delete_own_account does.
create function private.run_retention()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('candid.skip_audit', 'on', true);
  delete from public.household_invites where created_at < now() - interval '30 days';
  delete from public.audit_log where at < now() - interval '1 year';
end;
$$;

revoke execute on function private.run_retention() from public;

create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('candid-retention', '23 9 * * *', 'select private.run_retention()');
