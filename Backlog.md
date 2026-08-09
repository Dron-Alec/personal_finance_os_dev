# Candid ("Your money, honestly.") — Prod Rebuild Backlog

Formerly "Personal Finance OS."

**Stack:** Next.js (Vercel) + Supabase (Auth/Postgres/Storage) + Stripe
**Positioning:** Manual CSV review by design — not a missing Plaid integration, but a stance: reviewing your own transactions each import is the point (YNAB-style engagement), not passive auto-sync (Monarch/Copilot-style). AI-native interaction with your own data is the long-term technical edge. Plaid auto-sync is a later, opt-in upgrade — not a replacement for the manual mode.

---

## MVP — Must Have

### Auth & Access Security
- [ ] Supabase Auth: email/password + magic link — password auth + **mandatory TOTP MFA** shipped instead (stricter than spec'd); no magic link
- [x] Required email verification before any data entry
- [ ] Password reset flow
- [x] Session handling via supabase-js (JWT, auto-refresh)
- [x] Row-Level Security (RLS) policy on every table, scoped to `auth.uid()`
- [ ] Rate limiting on login/password-reset endpoints
- [ ] Logout-everywhere / session revocation

### Data Model (Postgres, replacing flat JSON)
- [ ] Normalize schema: `users`, `accounts`, `transactions`, `snapshots`, `targets`, `import_batches`
- [ ] Every transaction row tagged with `import_batch_id` (enables safe scoped delete + audit trail)
- [ ] `subscription_tier` column on user for free/paid gating
- [x] Single normalized internal transaction schema (date, description, signed amount, category) — bank-specific parsing stays contained to the import layer only

### CSV Import — Adapters
- [x] Per-bank adapter pattern (config/function mapping bank columns → internal schema), not one universal parser
- [x] Manual bank selection (dropdown) before upload — not auto-detection
- [x] Confirmed adapters to build: Citi, Discover, Axos, Wells Fargo, Chase, Bank of America (carried over from current app)
- [x] New adapters, format confirmed: Capital One (credit card — split Debit/Credit, YYYY-MM-DD), Capital One 360 checking/savings (single signed Amount — different shape from CC), PNC (split Withdrawals/Deposits + running balance), Apple Card (single signed Amount, monthly-only export)
- [ ] Adapters pending real sample (no reliable public format found — wait for ticket queue): NBKC, CIT Bank, Salem Five
- [ ] Confirm before building: Chase United card (likely same as standard Chase), JPMorgan private bank vs. Chase retail (may be PDF-only / relationship-manager mediated, not self-serve CSV)
- [x] Raw uploaded CSV deleted after parsing; only parsed transaction data retained
- [x] "Unsupported bank" path — superseded by something better than a ticket form: picking "Other" runs deterministic header-matching detection client-side, shows the detected mapping for one-tap confirmation, imports immediately, and saves the format to a shared cross-user table so it's a normal dropdown entry for everyone from then on

### Duplicate Detection
Shipped simpler than spec'd: a DB-level unique constraint on
`(user_id, date, description, amount)` + `upsert(..., ignoreDuplicates: true)`
silently skips exact repeats on (re-)import — no bulk/soft-prompt tiers, no
timestamp disambiguation, no background scan. Revisit if silent skipping
turns out to be the wrong call for the "did you mean to have this twice"
case.
- [ ] Bulk pattern check: 3+ identical rows in one import → hard warning before commit (near-certain re-upload of overlapping data)
- [ ] Single repeat check: 2 identical amount+merchant+date → soft prompt ("did you mean to have this twice?"), not a hard block
- [ ] If timestamp present and differs between matches → skip prompt (real disambiguator)
- [ ] Ongoing background scan for one-off duplicate-looking transactions post-import, not just at import time

### Import-Level Undo
- [ ] "Delete this import" scoped to `import_batch_id` — single safe operation, not date-range guessing
- [ ] Confirmation guard before deleting a batch

### Categorization (carried over + extended)
- [x] Manual recategorization (existing feature)
- [x] Keyword-based auto-categorization rules (existing feature — e.g. "trader joe" → Groceries)
- [x] Extend rule engine to new adapters/categories as they're added

### Analytics — Net Worth & Spending
- [x] Aggregate net worth graph (all accounts combined, month-by-month, existing snapshot-based history)
- [x] Per-account drill-down: same graph type, filterable/selectable to a single account (e.g. just Savings, just Brokerage) — plus a multi-account overlay chart (every account on one chart, for comparing trajectories directly) and a Spending-page filter to exclude specific categories from totals/charts
- [x] Spending pie chart with customizable categories (reads off the existing keyword-categorization rule engine — categories aren't fixed/hardcoded)
- [x] Bar/monthly breakdown views (existing feature) carried over and reconciled with new drill-down account filter

### Goals
- [x] Purpose-built (not generic form) goal widget: target amount + target date
- [x] Goal scoped to a specific account (not just aggregate net worth) — e.g. "$100k in Savings" tracks only the Savings account balance
- [x] Progress visualization: progress bar/ring, current vs. target, projected date at current rate
- [x] Variance view: how far actual balance is ahead/behind the pace needed to hit the goal by target date
- [x] v1 scope: net worth (aggregate) OR a specific account balance, selectable per goal — shipped with **multiple concurrent goals**, not just one (resolves the open question below)

### Contribution Projection Chatbot
- [ ] Conversational interface for describing a contribution strategy in plain English (e.g. "same amount every month," "increase contributions by X% per year for Y years")
- [ ] Chatbot translates described strategy into month-by-month expected balance values
- [ ] Projected values plotted alongside actual account/net-worth trajectory on the same graph (goal pace vs. real pace vs. hypothetical strategy)
- [ ] Scoped to a specific account or goal (ties into per-account drill-down and goal variance view above)
- [ ] First concrete instance of the "AI-native, talk to your data" differentiator — worth building with reusable prompt/interaction patterns since this is likely to expand to other conversational features later

### Account Types
- [ ] Add "Money Market" as its own account type (distinct from Taxable Brokerage — reads as liquid/cash-equivalent, not invested risk capital)
- [x] Existing types carried over: Checking, Savings, Crypto, 401k, Roth IRA, Taxable Brokerage

### Payments
- [ ] Stripe Checkout (hosted) for annual-only paid tier
- [ ] Webhook: `checkout.session.completed` → set `subscription_tier` on user
- [ ] Webhook: `customer.subscription.deleted` / `invoice.payment_failed` → downgrade tier
- [ ] Free tier scope: goal-setting + first upload/analysis
- [ ] Paid tier: annual-only commitment

### Hosting & Infra
- [ ] Next.js app deployed on Vercel (Hobby tier at launch)
- [ ] Supabase free tier (Auth/Postgres/Storage) — note: not this app's IP, standard managed service
- [ ] Domain purchase + DNS pointed at Vercel
- [ ] Note: Vercel Hobby ToS restricts commercial use — plan upgrade to Pro ($20/mo) at first paying customer

### Mobile (Web-first, PWA)
- [x] Responsive layout across the app (not Streamlit — full custom Next.js UI)
- [ ] Web app manifest + icons for add-to-homescreen
- [ ] Basic service worker (offline shell only — not full offline data sync)
- [ ] Per-bank CSV export instructions surfaced contextually (selected bank → shown steps), since most banking apps don't expose CSV export on mobile — desktop-site workaround documented per bank

### Legal/Compliance Baseline
- [ ] Privacy Policy (template + AI-assisted drafting)
- [ ] Terms of Service (template + AI-assisted drafting)
- [ ] Explicit account deletion flow (deletes all user data)
- [ ] Stated data retention policy (raw CSV deleted post-parse; what's retained and for how long)

---

## Post-Launch / Fast Follow

### Operational Tooling
- [ ] Transactional email (Resend or Postmark): verification, password reset, payment receipts, failed-payment notices
- [ ] Error monitoring (Sentry) — especially for silent CSV-parsing failures on edge-case bank formats
- [ ] Basic product analytics (PostHog or Plausible): bank usage breakdown, onboarding drop-off, free→paid conversion

### Security Hardening
- [x] ~~Optional~~ **Mandatory** MFA (TOTP) via Supabase Auth — shipped stricter than spec'd, see Auth & Access Security above
- [ ] Column-level encryption (pgsodium/pgcrypto) for sensitive fields beyond RLS coverage
- [ ] Audit log table (who changed what, when)
- [ ] User-initiated data export (download-your-data)

### Growth Surface
- [ ] Standalone marketing/landing page (separate from authenticated app) for ad funnel
- [ ] Referral/invite mechanism for household-style multi-person adoption

### Positioning Reinforcement
- [x] Onboarding copy explicitly frames manual import as a philosophy ("no auto-sync on purpose") rather than a missing feature — brand rename to Candid + positioning copy on signup, an "About Candid" section in Settings, and the guided tour's intro/wrap-up steps
- [ ] Post-import summary view: "what changed since last import" (new categories, biggest spend deltas, anomalies) — makes the manual review step the actual value delivery, not just a chore
- [ ] Recurring transaction / subscription detection (feeds both categorization and net worth projection)

### Future / Not Yet Scoped
- [ ] Plaid integration as opt-in "auto-import mode" — kept alongside manual mode, not a replacement (possible premium-tier gate)
- [ ] Broader AI-native "talk to your data" interaction layer beyond contribution projection (differentiator vs. Monarch/Copilot's fixed dashboards) — worth scoping once core loop is validated
- [ ] Native iOS wrapper (Capacitor/React Native reusing web code) — only if push notifications or App Store distribution/trust becomes a real need
- [ ] SOC 2 — only relevant if/when a bank-data integration (e.g. Plaid) puts the product in scope; not needed for manual-CSV-only model

---

## Open Questions / Decisions Still Needed
- Money market fund: confirmed as own account type — implement as such
- JPMorgan private bank CSV export: confirm actual export path before assuming Chase retail parser applies
- ~~Whether goal v1 supports multiple concurrent goals or just one at launch~~ — resolved: multiple concurrent goals, shipped