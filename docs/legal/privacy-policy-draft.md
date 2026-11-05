# Candid Privacy Policy — DRAFT for counsel review

> **Status:** draft, not published. Facts below are checked against the code
> as of 2026-11-05 (file references in brackets are for the reviewer and get
> removed before publishing). Items marked **[DECIDE]** need a business
> decision; items marked **[COUNSEL]** need legal judgment. The live
> `/privacy` page stays as-is until this is approved — and it currently says
> Candid never connects to a bank, so it **must** be replaced before Plaid is
> enabled for anyone beyond internal testers.

Last updated: [DATE]

Candid ("we", "us") is a personal-finance app operated by [LEGAL ENTITY NAME
— DECIDE], [ADDRESS]. This policy explains what we collect, why, who helps us
process it, how long we keep it, and what you can do about it.

## What we collect

**Account information.** Your email address; your password, stored only as
a salted hash by our authentication provider; and your authenticator-app
(TOTP) setup, which every account must complete.

**Financial information you enter or upload.** Account names, types and
balances; net-worth snapshots; goals; category labels and the keyword rules
you write; and transactions parsed from statement files (CSV) you upload.
Uploaded files are read in memory to extract transactions and are **not
stored** [lib/csv-parsing.ts, lib/actions/transactions.ts].

**Information from connected banks (optional).** If you choose to connect a
bank, we use **Plaid Inc.** to retrieve, read-only: account names, types,
last four digits, balances, and transactions (date, merchant or description,
amount, category) from the date you choose onward. You sign in to your bank
inside Plaid's window; **we never receive your bank username or password.**
Plaid gives us an access token for the connection, which we store encrypted
and use only to fetch updates [supabase/migrations/0028_plaid.sql]. Plaid's
handling of your data is described in the [Plaid End User Privacy
Policy](https://plaid.com/legal/#end-user-privacy-policy). We cannot move
money or make changes at your bank.

**Household linking.** If you invite someone to link households, we store
the email you invited and the link's status. A linked household sees only
**category-level monthly totals and account balances**, never your
individual transactions [supabase/migrations/0015, 0022, 0027;
supabase/tests/cross_household.sql].

**Technical information.** Server and security logs kept by our hosting and
database providers (IP address, browser, timestamps, request paths). Our own
application logs record events such as "import completed" with counts and
statement format names — never transaction descriptions, amounts, or email
addresses [lib/log.ts]. **[DECIDE: if Sentry is enabled]** Error reports
include the page and technical details of the error; request contents,
cookies and form data are removed before sending [lib/sentry.ts].

We do not use advertising or analytics trackers.

## How we use it

Only to provide the service: authenticate you, store and show your data,
compute charts, goals and summaries, sync connected banks, keep the service
secure, and fix problems. **We do not sell your data, share it for
advertising, or use your financial data to train models.** **[COUNSEL:
confirm wording for CCPA "sale/share" disclosures.]**

## Who processes it for us

| Provider | Purpose | Data | Location |
|---|---|---|---|
| Supabase, Inc. | Database, authentication, encrypted secret storage, background functions | All account and financial data | Canada (AWS ca-central-1) |
| Vercel Inc. | Application hosting | Requests passing through; short-lived logs | United States |
| Plaid Inc. | Bank connections (only if you connect a bank) | Bank data you authorize | United States |
| GitHub, Inc. | Encrypted nightly backups (14 days) | Encrypted database copy — unreadable without our key | United States |
| [Sentry — if enabled] | Error reports | Technical error details, no request contents | United States |
| [Email provider — DECIDE: Resend / Postmark] | Account emails | Your email address | United States |

We'll update this list before adding a provider. **[COUNSEL: whether to
promise advance notice.]**

## Security

Mandatory multi-factor authentication, enforced in the database itself (data
is not returned to a session that hasn't completed MFA); per-household data
isolation enforced by the database and tested automatically; encryption in
transit and at rest; bank access tokens encrypted in a separate secret store
and never sent to your browser; an audit log of changes to your accounts,
balances, goals and household links. No system is perfectly secure; if we
learn of a breach affecting your data we will notify you as required by law.
**[COUNSEL: breach-notice commitment wording.]**

## How long we keep it

| Data | Kept for |
|---|---|
| Your account and financial data | Until you delete it or your account |
| Uploaded statement files | Not stored |
| Household invites | 30 days |
| Audit log of changes | 1 year |
| Encrypted backups | 14 days |
| Provider logs | Per provider (typically up to 90 days) **[verify]** |

## Your choices and rights

- **See, correct, export:** everything is visible and editable in the app.
  **[DECIDE: a "download my data" export is planned — keep this line only
  once it ships.]**
- **Disconnect a bank:** Accounts → Connected banks → Disconnect. We revoke
  our access at Plaid and delete our access token; data already imported
  stays until you delete it.
- **Delete your account:** Settings → Delete account. This permanently
  deletes your accounts, transactions, snapshots, goals, household links,
  audit history and bank connections, and revokes Plaid access. It's
  immediate and irreversible. Encrypted backups containing your data expire
  within 14 days.
- Depending on where you live (e.g. California), you may have additional
  rights. Contact us to exercise them. **[COUNSEL]**

## Children

Candid is not for anyone under 18. **[COUNSEL: revisit before any school or
student program — FERPA/COPPA review is a prerequisite.]**

## Changes

We'll update the date above and, for material changes, tell you in the app
or by email.

## Contact

[privacy@yourdomain — DECIDE; currently alecdron@gmail.com]
