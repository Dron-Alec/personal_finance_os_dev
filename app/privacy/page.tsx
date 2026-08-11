import Link from "next/link";

export const metadata = { title: "Privacy Policy — Candid" };

// Standard, AI-drafted template — not a substitute for review by an actual
// lawyer before wider launch or any paid tier. Flagged as a starting point,
// not a final legal document.
export default function PrivacyPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-12">
      <div>
        <Link href="/" className="text-sm text-muted-foreground underline">
          ← Back to Candid
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">Last updated: August 2026</p>
      </div>

      <div className="flex flex-col gap-5 text-sm leading-relaxed text-muted-foreground">
        <p>
          Candid (&quot;we,&quot; &quot;us,&quot; &quot;our&quot;) provides a personal finance
          tracking application (the &quot;Service&quot;) that lets you manually upload bank and
          credit card statement exports (CSV files) to track spending, net worth, and financial
          goals. This policy explains what data we collect, how we use it, and the choices you
          have.
        </p>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-medium text-foreground">Information we collect</h2>
          <p>
            <strong className="text-foreground">Account information:</strong> your email address
            and password (stored as a salted hash, never in plain text), and your TOTP
            multi-factor authentication setup, which is mandatory for every account.
          </p>
          <p>
            <strong className="text-foreground">Financial data you provide:</strong> account
            names, types, and balances you enter; transaction data parsed from CSV statement
            files you upload; category labels and the keyword rules you define; net worth
            snapshots; and any goals you create. We do not connect to your bank, brokerage, or
            any financial institution directly — every number in Candid comes from a file you
            chose to upload or a value you typed in.
          </p>
          <p>
            <strong className="text-foreground">Household linking:</strong> if you invite another
            person to link households, we store the invited email address, the resulting link
            status, and category-level spending totals and account balances that become visible
            to a linked household. Individual transaction line items (description, merchant,
            exact date, amount) are never shared with a linked household, under any setting.
          </p>
          <p>
            <strong className="text-foreground">Raw uploaded files:</strong> the CSV file itself
            is parsed in memory and discarded — we do not retain your original statement export
            after the transaction data inside it has been extracted.
          </p>
          <p>
            <strong className="text-foreground">Technical data:</strong> standard server logs
            (IP address, timestamps, request metadata) collected by our hosting and database
            providers for security and reliability purposes.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-medium text-foreground">How we use your information</h2>
          <p>
            We use your information solely to provide and improve the Service: authenticating
            you, storing and displaying your financial data back to you, computing the
            charts/goals/summaries you see, and securing your account. We do not sell your data,
            and we do not use your financial data for advertising or share it with third parties
            for marketing purposes.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-medium text-foreground">Service providers</h2>
          <p>
            We rely on a small number of infrastructure providers to operate Candid, each acting
            as a data processor on our behalf under their own security and privacy commitments:
          </p>
          <ul className="list-disc pl-5">
            <li>
              <strong className="text-foreground">Supabase</strong> — database, authentication,
              and row-level data isolation.
            </li>
            <li>
              <strong className="text-foreground">Vercel</strong> — application hosting.
            </li>
          </ul>
          <p>We do not use third-party advertising or analytics trackers at this time.</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-medium text-foreground">Data security</h2>
          <p>
            Every account requires multi-factor authentication (TOTP). Your data is isolated at
            the database level so that, even in the event of an application bug, one user&apos;s
            financial data cannot be queried by another user — except for the specific
            category-level summaries you explicitly choose to share via household linking, which
            never include individual transactions. Data is encrypted in transit and at rest by
            our infrastructure providers.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-medium text-foreground">Data retention &amp; deletion</h2>
          <p>
            We retain your data for as long as your account is active. You can permanently delete
            your account and all associated data — accounts, transactions, snapshots, goals, and
            household links — at any time from Settings. Deletion is immediate and irreversible.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-medium text-foreground">Your rights</h2>
          <p>
            You can access, correct, or delete your data directly within the app at any time. If
            you&apos;d like a full export of your data or have any other privacy request, contact
            us using the details below.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-medium text-foreground">Children&apos;s privacy</h2>
          <p>Candid is not directed to, and should not be used by, anyone under the age of 18.</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-medium text-foreground">Changes to this policy</h2>
          <p>
            We may update this policy as the Service evolves. We&apos;ll update the &quot;last
            updated&quot; date above when we do.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-medium text-foreground">Contact</h2>
          <p>
            Questions about this policy or your data? Reach out to{" "}
            <span className="font-mono text-foreground">[contact email]</span>.
          </p>
        </section>
      </div>
    </div>
  );
}
