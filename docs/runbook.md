# Runbook

For whoever is on call (today: Alec). Every section is something you can do
in under 15 minutes with only the dashboards and this repo.

**Where things live**

| What | Where |
|---|---|
| App hosting, deploys, env vars | Vercel → project `personal_finance_os_dev` |
| Database, auth, Edge Functions, function secrets | Supabase → project `ycvxvdtigwkjpwgoiqhz` (ca-central-1) |
| Code, CI, nightly backups, backup secrets | GitHub → `Dron-Alec/personal_finance_os_dev` |
| Bank connections | Plaid dashboard |
| Backup decryption key | `~/candid-backup-key.txt` + password manager (never in GitHub) |
| Health check | `GET /api/health` (200 = app up and reaching Supabase) |

---

## 1. Roll back a bad deploy

**App code:** Vercel → Deployments → pick the last good production
deployment → **⋯ → Promote to Production** (or **Instant Rollback**). Takes
effect in seconds. Then `git revert` the bad commit on `main` so the next
push doesn't redeploy it.

**Edge Function (`plaid`):** redeploy the previous version from git:
check out the last good commit and redeploy `supabase/functions/plaid`
(see CLAUDE.md for the exact command), or disable bank connections fast by
removing `PLAID_SECRET` in Supabase → Edge Functions → Secrets (every Plaid
call then fails closed; nothing else in the app is affected).

**Database:** migrations only roll **forward**. Write a new numbered
migration that undoes the change, push it (CI proves it applies to a fresh
database), then apply it in the SQL editor and record it:
`insert into supabase_migrations.schema_migrations (version, name) values (...)`.
If data was damaged, see §2.

## 2. Restore from backup

Backups: nightly, encrypted, 14 days, in GitHub → Actions → *Nightly DB
backup* → a run → **Artifacts** (`candid-YYYY-MM-DD-HHMM.dump.age`). Manual
ones from `scripts/backup-db.sh` live in `~/Documents/candid-backups/`.

1. **Rehearse first (and quarterly):** `scripts/test-restore.sh <file>` loads
   the backup into a throwaway local Postgres and prints row counts. Compare
   them to production.
2. **Decrypt:** `age -d -i ~/candid-backup-key.txt -o candid.dump candid-….dump.age`
3. **Prefer restoring to a new Supabase project**, then pointing the app at
   it (Vercel env `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   redeploy), rather than overwriting the live database in place:
   - create the project, apply `supabase/migrations/` in order;
   - `pg_restore --data-only --disable-triggers -d "<new project URI>" candid.dump`;
   - re-add Edge Function secrets and redeploy the `plaid` function;
   - Plaid access tokens are in Vault, which is **not** in the dump —
     connected banks must be reconnected (users see "Reconnect").
4. **Partial restore** (one household's rows): restore into the throwaway
   container from step 1 and copy the needed rows across with `psql \copy`.

## 3. Rotate keys

| Secret | Rotate when | How |
|---|---|---|
| Supabase DB password | leaked, staff change, yearly | Supabase → Project Settings → Database → Reset password. Update GitHub secret `DATABASE_URL`. |
| Supabase JWT secret / API keys | suspected session or key compromise | Supabase → Project Settings → API (JWT keys). **Signs everyone out.** Update `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel + `.env.local`, redeploy. |
| Plaid secret | leaked, staff change | Plaid dashboard → Developers → Keys → rotate. Update `PLAID_SECRET` in Supabase Edge Function secrets. Access tokens keep working. |
| A user's Plaid access token | that user's item is suspected compromised | Disconnect it in the app (calls `/item/remove`), user reconnects. |
| Backup age key | key file exposed | `age-keygen -o ~/candid-backup-key.txt`, update `BACKUP_AGE_RECIPIENT` in GitHub. Keep the old private key until its backups expire (14 days). |
| Sentry DSN / auth token | leaked | Sentry → project settings; update Vercel env. |
| GitHub / Vercel / Supabase / Plaid account passwords | yearly, or any doubt | Each has MFA on — keep it on. |

## 4. Security incident

Anything that might expose user data: a leaked secret, unexpected access in
logs, a bug that shows one household another's data, a Plaid or provider
breach notice.

1. **Contain (first 30 minutes)**
   - Rotate whatever leaked (§3).
   - Bank data at risk → remove `PLAID_SECRET` (stops all Plaid calls).
   - Sessions at risk → rotate the Supabase JWT secret (signs everyone out).
   - A bad deploy → roll back (§1).
2. **Preserve evidence:** export Supabase logs (Logs Explorer — auth, API,
   Postgres, function logs), Vercel runtime logs, and the `audit_log` rows
   for the window. Don't delete anything yet.
3. **Assess:** which users, which data, what time window. `audit_log` shows
   who changed what; Supabase API logs show who read what.
4. **Notify**
   - Affected users by email, within 72 hours of confirming: what
     happened, what data, what we did, what they should do.
   - **Plaid**, if Plaid data or credentials were involved — per the
     production agreement, promptly via the dashboard / security contact.
   - Regulators if required by state breach-notification law (counsel).
5. **Fix and write it up:** root cause, the fix, the test that now covers
   it (`supabase/tests/` for anything data-access related). Keep the
   write-up in `docs/incidents/YYYY-MM-DD.md`.

## 5. Everyday checks

- A red ✗ on `main` or a failed *Nightly DB backup* email → look the same day.
- Dependabot PRs weekly; security alerts within a week (high: 48 hours).
- Pending custom bank formats: `select id, name, review_flags from public.custom_bank_formats where status = 'pending';`
- Plaid connections in trouble: `select status, error_code, count(*) from public.plaid_items group by 1, 2;`
- Retention ran: `select status, start_time from cron.job_run_details order by start_time desc limit 5;`
