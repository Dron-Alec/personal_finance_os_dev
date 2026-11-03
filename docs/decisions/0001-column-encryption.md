# 0001 — No column-level encryption for financial data; Vault for secrets only

**Status:** Accepted, 2026-11-03

## Context

Candid stores account names, balances, net-worth snapshots, goals, and
transaction descriptions/amounts. The question was whether to encrypt
these columns in the database (pgsodium / Transparent Column Encryption, or
Supabase Vault) on top of what Supabase already does.

What's already in place:

- **At rest:** Supabase encrypts the database disk and backups (AES-256).
- **In transit:** TLS everywhere (browser ↔ Vercel ↔ Supabase).
- **Access:** RLS forced on every table, household-scoped; MFA (aal2)
  required at the data layer (0024); no service-role key in app code.
- **Backups we make ourselves** (`scripts/backup-db.sh`, nightly workflow)
  are age-encrypted to a key that never touches GitHub.

## Decision

1. **Don't encrypt balances, transactions, snapshots, or goals.**
2. **Use Supabase Vault for secrets** we hold on a user's behalf — first
   one: Plaid access tokens (Phase 7). Never store those in a plain column.
3. Revisit if a contract (e.g. a school DPA) or regulator explicitly
   requires field-level encryption.

## Why

- **The threat it would address is narrow.** Column encryption helps when
  someone reads the raw database but can't reach the key. On Supabase the
  key lives in the same project, so anyone with that level of access (a
  leaked DB password, the dashboard) can decrypt anyway. The realistic
  threats — a user reading another household's rows, a session without MFA
  — are handled by RLS + aal2, which encryption doesn't replace.
- **It would break the product.** Spending summaries, net-worth charts,
  the Combined view's pre-aggregated household summaries, dedupe on
  `(household_id, date, description, amount)`, and category-rule
  re-categorization all need to `sum`, `group by`, compare, and match on
  these values inside Postgres.
- **pgsodium is on its way out** — Supabase no longer recommends new use of
  it, so building on it means a migration later.
- **Plaid tokens are different:** they're credentials, not data we query,
  and a leak lets someone pull fresh data from the bank. Vault is the right
  fit: we only ever read one by id, server-side.

## Consequences

- A database-level compromise exposes financial data in plaintext. The
  mitigations are keeping that access tight: DB password in a password
  manager and GitHub secret only, dashboard behind MFA, no service-role key
  in app code, and rotation per the runbook (6.4).
- Plaid work must include a `SECURITY DEFINER` function that reads a token
  from Vault by id, callable only server-side.
