# Production plan

Status as of 2026-11-03. `[x]` done, `[~]` partly done, `[ ]` not started.

## Phase 1 — Security baseline
- [x] Security headers (CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy) — `next.config.ts`
- [~] Auth rate limits — check Supabase Dashboard → Auth → Rate Limits by hand. CAPTCHA (Turnstile) deferred.
- [x] Log out everywhere; password reset signs out other sessions
- [x] CSV caps: `.csv` only, ≤ 12 files / 900 KB / 20k rows, checked before reading
- [x] Custom bank format review: pending until approved, no name squatting, swapped debit/credit flagged — `0025`
- [x] Column encryption decision — `docs/decisions/0001-column-encryption.md`
- [x] Audit log — `0026`
- [x] npm audit (no highs) + Dependabot
- [~] Secrets: none committed (manual history check); env vars documented in README. Full `gitleaks` scan not run.
- [x] MFA (aal2) enforced at the data layer, revoke-only household links, cross-household FK checks — `0024`
- [ ] GitHub: Dependabot alerts, secret scanning + push protection, required checks on `main` (repo settings)

## Phase 2 — Observability and reliability
- [~] Sentry (client + server), request data scrubbed — code done; needs a Sentry project + `NEXT_PUBLIC_SENTRY_DSN` in Vercel
- [x] Structured JSON logs for imports, parse failures, auth events — `lib/log.ts` (login/MFA are client-side → Supabase Auth logs)
- [~] Parse-failure alerts per bank format — `parse.no_rows` / `parse.failed` go to Sentry tagged by `format`; alert rule to create in Sentry
- [x] Error boundaries + user-facing error pages
- [~] Uptime monitoring — `/api/health` endpoint done; monitor to create (UptimeRobot / Better Stack)

## Phase 3 — Testing and CI
- [x] GitHub Actions: lint, typecheck, tests, build on every PR
- [ ] Regression fixtures for every bank adapter (incl. Citi Credit payments, `2e047c1`)
- [x] Database tests — `supabase/tests/`: cross-household privacy matrix (linked / unlinked / no-MFA / anon), custom-format review, audit log, account deletion
- [x] Account deletion test — `supabase/tests/account_deletion.sql`: linked pair, deleter's data gone from every table, link dissolves, survivor intact
- [ ] End-to-end tests (signup, email verification, MFA, CSV import, net worth)
- [x] All migrations apply cleanly to a fresh database (CI `migrations` job)

## Phase 4 — Data and scalability
- [ ] Indexes + EXPLAIN on a realistic dataset
- [ ] Household RLS helper per-row cost
- [~] Backups: nightly encrypted dump (14 days, GitHub artifacts). Free plan has no PITR. Test restore not done; no off-GitHub copy.
- [ ] Download-your-data export
- [~] Retention: raw CSVs are never stored. Still to do: purge expired invites and old `audit_log` rows.

## Phase 5 — Legal and compliance
- [ ] Final /privacy and /terms text (counsel)
- [ ] Subprocessor list
- [ ] School DPA template
- [ ] Employment/IP check before any school deal
- [ ] FERPA review before any student account

## Phase 6 — Operations and launch
- [ ] Staging environment (separate Supabase + Plaid sandbox)
- [ ] Transactional email via Resend/Postmark (also lifts Supabase's email rate limit)
- [ ] Vercel Pro before charging anyone
- [ ] Runbook: rollback, restore, key rotation
- [ ] Stripe — only if the paid tier is happening

## Phase 7 — Plaid
- [ ] Not started. Decisions already made: access tokens in Vault (`docs/decisions/0001`); each account is fed by either CSV or Plaid, not both.
