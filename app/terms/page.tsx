import Link from "next/link";

export const metadata = { title: "Terms of Service — Candid" };

// Standard, AI-drafted template — not a substitute for review by an actual
// lawyer before wider launch or any paid tier. Flagged as a starting point,
// not a final legal document.
export default function TermsPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-12">
      <div>
        <Link href="/" className="text-sm text-muted-foreground underline">
          ← Back to Candid
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Terms of Service</h1>
        <p className="text-sm text-muted-foreground">Last updated: August 2026</p>
      </div>

      <div className="flex flex-col gap-5 text-sm leading-relaxed text-muted-foreground">
        <p>
          These Terms of Service (&quot;Terms&quot;) govern your use of Candid (the
          &quot;Service&quot;). By creating an account, you agree to these Terms. If you
          don&apos;t agree, please don&apos;t use the Service.
        </p>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-medium text-foreground">Beta status</h2>
          <p>
            Candid is currently in early access / beta. Features may change, break, or be removed
            without notice, and we make no guarantee of uptime or data durability during this
            period. Please don&apos;t treat Candid as your sole record of your financial data.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-medium text-foreground">The Service</h2>
          <p>
            Candid is a manual, self-service personal finance tracking tool. You upload your own
            bank/credit card statement exports (CSV files) or enter balances directly; Candid
            parses, categorizes, and visualizes that data for you. Candid does not connect
            directly to any bank, brokerage, or financial institution, does not move money, and
            is not a bank, broker-dealer, or financial institution.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-medium text-foreground">Not financial advice</h2>
          <p>
            Candid displays projections, pacing, and goal-tracking based on the data you provide
            and simple arithmetic — it does not constitute financial, investment, tax, or legal
            advice. Decisions you make based on information in Candid are your own responsibility.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-medium text-foreground">Your account</h2>
          <p>
            You must be at least 18 years old to use Candid. You&apos;re responsible for keeping
            your password and multi-factor authentication device secure, and for all activity
            under your account. You&apos;re responsible for the accuracy of the data you upload or
            enter — Candid displays what you give it.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-medium text-foreground">Household linking</h2>
          <p>
            If you invite another person to link households, you&apos;re authorizing Candid to
            share category-level spending summaries and account balances (never individual
            transactions) with that linked account, and vice versa. Either side may unilaterally
            revoke the link at any time; revocation immediately stops further sharing in both
            directions.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-medium text-foreground">Acceptable use</h2>
          <p>
            Don&apos;t use Candid for anything illegal, don&apos;t try to access another
            user&apos;s data or circumvent our security controls, and don&apos;t abuse, scrape, or
            overload the Service.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-medium text-foreground">Termination</h2>
          <p>
            You may stop using Candid and permanently delete your account and all associated data
            at any time from Settings. We may suspend or terminate accounts that violate these
            Terms.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-medium text-foreground">
            Disclaimer of warranties &amp; limitation of liability
          </h2>
          <p>
            The Service is provided &quot;as is&quot; and &quot;as available,&quot; without
            warranties of any kind, express or implied. To the fullest extent permitted by law,
            we are not liable for any indirect, incidental, or consequential damages arising from
            your use of, or inability to use, the Service, including any financial decisions made
            based on data displayed in Candid.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-medium text-foreground">Changes to these Terms</h2>
          <p>
            We may update these Terms as the Service evolves. Continued use of Candid after a
            change means you accept the updated Terms.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-medium text-foreground">Contact</h2>
          <p>
            Questions about these Terms? Reach out to{" "}
            <a href="mailto:alecdron@gmail.com" className="text-foreground underline">
              alecdron@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
