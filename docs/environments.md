# Environments: dev and prod

| | Prod | Dev |
|---|---|---|
| Git branch | `main` | `dev` |
| Vercel | Production deployment (current URL) | `dev` branch domain (e.g. `candid-dev.vercel.app`) |
| Supabase | `Personal_Finances_OS` (`ycvxvdtigwkjpwgoiqhz`), real data | `Candid-dev` (`fsymcrjlpfzsetulutbx`, us-east-2), test data only |
| MCP server (`.mcp.json`) | `supabase-prod` | `supabase` (the default) |

Prod is the existing live project, which already has all the real data, so
nothing needs to be copied there. Dev starts empty: sign up fresh on the dev
URL and use fake or sandbox data. Never copy prod data into dev.

## Daily work

1. Work on `dev` (or feature branches merged into `dev`).
2. New schema = a new numbered migration in `supabase/migrations/`, applied
   to **dev only**.
3. Pushing `dev` runs CI and deploys the dev URL.

## Promoting to prod (only when Alec chooses)

1. Open a PR `dev → main`. CI proves every migration applies to a fresh DB.
2. Before merging, apply each migration that's new on this PR to **prod**:
   paste it into the prod Dashboard SQL Editor, then record it:
   `insert into supabase_migrations.schema_migrations (version, name) values ('00NN', '00NN_name');`
   (Additive migrations can go through the `supabase-prod` MCP instead.)
   Apply migrations before merging, because the new code may need the new
   columns.
3. Merge. Vercel deploys prod.
4. If the Plaid Edge Function changed, redeploy it to prod too.

**Rule: a migration on `main` = applied to prod.** To see what's pending:
`git diff --name-only main dev -- supabase/migrations`.

## One-time setup

### Supabase
1. Pause the old Streamlit project (`lfqezqcymxcdseqcsbfh`) to free a Free-plan
   slot. Its data, including Haley's unmigrated rows, is kept while paused.
2. Create project `Candid-dev` (done: `fsymcrjlpfzsetulutbx`, us-east-2, which
   is fine because it holds no real data).
3. Auth → Sign In / Providers: match prod (email + password, confirm email).
   Auth → Multi-Factor: enable TOTP.
   Auth → URL Configuration: Site URL = the dev Vercel URL, plus
   `http://localhost:3000/**` in the redirect list.
4. Apply every migration in order (SQL Editor, one bundled script, or the
   `supabase` MCP once repointed at dev).
5. Plaid (optional for dev): deploy `supabase/functions/plaid` with the
   sandbox secrets, and grant yourself `plaid_access`.

### Vercel (same project)
1. Settings → Environment Variables (project level, not team "Shared"): set
   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the
   **dev** values for **Development** and **Preview**. Only **Production**
   holds the prod values, so a preview build can never reach prod data.
2. Settings → Domains: add `candid-dev.vercel.app` (or similar) and assign it
   to the `dev` git branch.
3. Optionally leave `NEXT_PUBLIC_SENTRY_DSN` unset on dev, or set
   `environment` to keep its errors out of prod alerts.

### Local
`.env.local` points at dev. Keep prod keys out of local env files.

### Backups
`backup.yml` backs up prod (`DATABASE_URL`). Dev isn't backed up, which is
fine because it only holds test data.
