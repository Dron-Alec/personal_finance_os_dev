# Plaid production application — prefilled answers

Paste-ready answers for Plaid's security questionnaire, each backed by
something in this repo. Plaid's exact questions change; map these onto
whatever the form asks. **✅ true today · ⚠️ partly / needs you · ❌ not yet.**

## Company and application

- **Use case:** Personal finance tracking. Users connect checking, savings,
  credit card and loan accounts so balances and transactions import
  automatically instead of uploading statement files. Read-only; no money
  movement. Product requested: **Transactions** only.
- **Users:** Individuals in the US; currently a small closed group.
- **Data from Plaid:** account metadata, balances, transactions. No Auth
  (account/routing numbers), Identity, or Income products.
- ⚠️ **Legal entity, website, privacy policy URL** — you (see "Gaps").

## Governance

- ⚠️ **Information security policy:** this repo's `docs/` (runbook,
  decisions, production plan) plus `CLAUDE.md` constraints. A one-page
  written policy summarizing them would strengthen the answer.
- ✅ **Security contact / incident response:** `docs/runbook.md` §4 —
  contain, preserve evidence, assess, notify users within 72h and Plaid
  promptly, write up.
- ⚠️ **Background checks / training:** single developer; say so.

## Identity and access

- ✅ **Consumer MFA:** mandatory TOTP enrollment at signup; enforced in the
  database — every table has a restrictive policy requiring an `aal2`
  session (`supabase/migrations/0024_security_hardening.sql`), so a
  password-only session reads nothing.
- ⚠️ **MFA on internal systems:** turn on (and screenshot) MFA for GitHub,
  Vercel, Supabase, Plaid, domain registrar, email.
- ✅ **Least privilege:** the web app uses only the public anon key and the
  user's own session; there is no service-role key in app code. Only the
  `plaid` Edge Function runs privileged, and it re-checks the user's
  session, MFA level and household on every call
  (`supabase/functions/plaid/index.ts`).
- ✅ **Session revocation:** "Log out everywhere" (global sign-out); password
  reset signs out other sessions.
- ✅ **Access reviews:** single operator; production access is GitHub +
  Vercel + Supabase + Plaid accounts only.

## Data protection

- ✅ **Encryption in transit:** TLS everywhere; HSTS with preload
  (`next.config.ts`).
- ✅ **Encryption at rest:** Supabase (AES-256 disk + backups). Plaid access
  tokens additionally encrypted in Supabase Vault; the table stores only a
  reference, readable solely by the Edge Function's role
  (`0028_plaid.sql`, tested in `supabase/tests/plaid.sql`).
- ✅ **Tokens never reach the client:** link-token creation and public-token
  exchange happen server-side in the Edge Function.
- ✅ **Tenant isolation:** row-level security forced on every table; a
  cross-household test suite runs in CI on every change
  (`supabase/tests/cross_household.sql`).
- ✅ **Data minimization:** uploaded statements are parsed in memory and not
  stored; logs carry ids/counts only (`lib/log.ts`); error reports scrub
  request bodies, cookies and headers (`lib/sentry.ts`).
- ✅ **Decision record:** `docs/decisions/0001-column-encryption.md`.

## Application security

- ✅ **Secure SDLC:** all changes through git; CI runs lint, typecheck, unit
  tests, build, and database security tests on a fresh database for every
  PR (`.github/workflows/ci.yml`).
- ✅ **Dependency management:** Dependabot weekly; `npm audit` has no high
  findings. ⚠️ Turn on GitHub secret scanning + push protection.
- ✅ **Web hardening:** CSP, X-Frame-Options DENY, nosniff, Referrer-Policy,
  Permissions-Policy; same-origin-only redirects; CSV upload type/size/row
  limits checked before reading.
- ✅ **Webhook verification:** Plaid webhooks are rejected unless the
  `Plaid-Verification` ES256 JWT verifies against Plaid's key, is under 5
  minutes old, and its body hash matches.
- ⚠️ **Penetration test:** none. Answer honestly; Limited Production usually
  doesn't require one.

## Monitoring and logging

- ✅ **Audit trail:** database-trigger audit log of changes to accounts,
  balances, snapshots, goals, household links, and transaction
  edits/deletes (`0026_audit_log.sql`); kept 1 year.
- ✅ **Application logs:** structured JSON events for imports, parse
  failures, sign-outs, account deletion, and every Plaid action.
- ⚠️ **Alerting:** Sentry wired but not yet enabled; uptime monitor on
  `/api/health` to create.

## Resilience

- ✅ **Backups:** nightly `pg_dump`, age-encrypted to an offline key, 14-day
  retention (`.github/workflows/backup.yml`).
- ⚠️ **Restore tested:** run `scripts/test-restore.sh` and record the date.
- ✅ **Rollback / key rotation:** `docs/runbook.md` §1, §3.

## Consumer consent, retention, deletion

- ✅ **Consent:** a screen before Plaid Link explains what's pulled, how it's
  stored, and how to stop (`components/accounts/plaid-connections.tsx`).
- ✅ **Deletion:** account deletion removes all user data and calls Plaid
  `/item/remove` for every connection first; disconnect does the same per
  bank; the Vault secret is deleted with the connection
  (`supabase/tests/account_deletion.sql`, `plaid.sql`).
- ✅ **Retention:** nightly job purges invites after 30 days and audit rows
  after 1 year (`0030_plaid_access_and_retention.sql`).
- ❌ **Privacy policy mentioning Plaid:** draft at
  `docs/legal/privacy-policy-draft.md` — needs counsel and publishing.

## Gaps to close before submitting

1. Publish the reviewed privacy policy (with the Plaid section and the
   subprocessor list) and terms.
2. Legal entity + domain + business email (optional for Limited Production,
   expected for full Production).
3. MFA on every internal account; GitHub secret scanning on.
4. Run `scripts/test-restore.sh` once; note the date here: ______.
5. Employment / IP check (production plan 5.4) before your name and company
   go on the application.
