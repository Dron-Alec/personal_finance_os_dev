import { createClient } from "@/lib/supabase/server";
import { BalanceEntryForm } from "@/components/data-entry/balance-entry-form";
import { CsvUploadForm } from "@/components/data-entry/csv-upload-form";
import { TransactionsPanel } from "@/components/data-entry/transactions-panel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default async function DataEntryPage() {
  const supabase = await createClient();

  const [{ data: accounts }, { data: transactions }, { data: templates }] = await Promise.all([
    supabase.from("accounts").select("id, name, balance").order("name"),
    supabase
      .from("transactions")
      .select("id, date, description, amount, bank, category")
      .order("date", { ascending: false }),
    supabase.from("account_templates").select("id, name, type").order("sort_order"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Card>
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
          <CsvUploadForm />
          <TransactionsPanel transactions={transactions ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
