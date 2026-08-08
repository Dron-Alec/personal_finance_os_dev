import { createClient } from "@/lib/supabase/server";
import { BalanceEntryForm } from "@/components/data-entry/balance-entry-form";
import { CsvUploadForm } from "@/components/data-entry/csv-upload-form";
import { TransactionsPanel } from "@/components/data-entry/transactions-panel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default async function DataEntryPage() {
  const supabase = await createClient();

  const [{ data: accounts }, { data: transactions }, { data: templates }, { data: bankAccounts }, { data: customFormats }] =
    await Promise.all([
      supabase.from("accounts").select("id, name, balance").order("name"),
      supabase
        .from("transactions")
        .select("id, date, description, amount, bank, category")
        .order("date", { ascending: false }),
      supabase.from("account_templates").select("id, name, type").order("sort_order"),
      supabase.from("accounts").select("bank_format").not("bank_format", "is", null),
      supabase.from("custom_bank_formats").select("name").order("name"),
    ]);

  const bankShortlist = Array.from(new Set((bankAccounts ?? []).map((a) => a.bank_format as string)));
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
            Upload bank or credit card CSVs as they come in. Transactions are categorized
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
