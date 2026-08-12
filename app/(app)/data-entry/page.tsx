import { createClient } from "@/lib/supabase/server";
import { BalanceEntryForm } from "@/components/data-entry/balance-entry-form";
import { CsvUploadForm } from "@/components/data-entry/csv-upload-form";
import { TransactionsPanel } from "@/components/data-entry/transactions-panel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default async function DataEntryPage() {
  const supabase = await createClient();

  const [
    { data: accounts },
    { data: transactions },
    { data: templates },
    { data: bankAccounts },
    { data: bankTemplates },
    { data: customFormats },
  ] = await Promise.all([
    supabase.from("accounts").select("id, name, balance, type, is_liability").order("name"),
    supabase
      .from("transactions")
      .select("id, date, description, amount, bank, category")
      .order("date", { ascending: false }),
    supabase.from("account_templates").select("id, name, type").order("sort_order"),
    supabase.from("accounts").select("bank_format").not("bank_format", "is", null),
    supabase.from("account_templates").select("bank_format").not("bank_format", "is", null),
    supabase.from("custom_bank_formats").select("name").order("name"),
  ]);

  // Templates carry a bank hint too (set during onboarding, before any real
  // account exists) — merge both sources so Statement Format narrows right
  // away instead of waiting for a first real account.
  const bankShortlist = Array.from(
    new Set([
      ...(bankAccounts ?? []).map((a) => a.bank_format as string),
      ...(bankTemplates ?? []).map((t) => t.bank_format as string),
    ]),
  );
  const customFormatNames = (customFormats ?? []).map((f) => f.name);

  return (
    <div className="flex flex-col gap-6">
      <Card data-tour="balances-card">
        <CardHeader>
          <CardTitle>Month-End Balances</CardTitle>
          <CardDescription>
            Enter account balances as of month-end. Saving creates a net worth snapshot that
            updates the net worth graphs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BalanceEntryForm accounts={accounts ?? []} templates={templates ?? []} />
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Upload Statements</CardTitle>
          <CardDescription>
            At month-end, upload your bank and credit card CSVs. Transactions are categorized
            automatically and populate the Spending analysis.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div data-tour="csv-upload">
            <CsvUploadForm bankShortlist={bankShortlist} customFormats={customFormatNames} />
          </div>
          <div data-tour="transactions-panel">
            <TransactionsPanel transactions={transactions ?? []} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
