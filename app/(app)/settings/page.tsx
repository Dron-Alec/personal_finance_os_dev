import { createClient } from "@/lib/supabase/server";
import { DEFAULT_CATEGORY_RULES } from "@/lib/constants";
import { clearTransactions, resetAllData } from "@/lib/actions/settings";
import { CategoryRulesForm } from "@/components/settings/category-rules-form";
import { TargetsForm } from "@/components/settings/targets-form";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SettingsPage() {
  const supabase = await createClient();

  const [{ data: ruleRow }, { data: targets }] = await Promise.all([
    supabase.from("category_rules").select("rules").single(),
    supabase.from("nw_targets").select("quarter, target_net_worth").order("quarter"),
  ]);

  const rules = ruleRow?.rules ?? DEFAULT_CATEGORY_RULES;
  const targetsCsv = [
    "quarter,target_net_worth",
    ...(targets ?? []).map((t) => `${t.quarter},${t.target_net_worth}`),
  ].join("\n");

  return (
    <div className="flex flex-col gap-6">
      <Card data-tour="category-rules">
        <CardHeader>
          <CardTitle>Category Rules</CardTitle>
          <CardDescription>
            Keywords match case-insensitively. Saving re-categorizes all your transactions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CategoryRulesForm rules={rules} />
        </CardContent>
      </Card>

      <Card data-tour="targets">
        <CardHeader>
          <CardTitle>Net Worth Targets</CardTitle>
          <CardDescription>Edit as CSV: quarter,target_net_worth</CardDescription>
        </CardHeader>
        <CardContent>
          <TargetsForm csv={targetsCsv} />
        </CardContent>
      </Card>

      <Card className="border-destructive/50" data-tour="danger-zone">
        <CardHeader>
          <CardTitle>Danger Zone</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <ConfirmActionButton
            label="Clear All Transactions"
            title="Clear all transactions?"
            description="This permanently deletes every transaction. Accounts and net worth snapshots are not affected."
            confirmLabel="Clear transactions"
            onConfirm={clearTransactions}
          />
          <ConfirmActionButton
            label="Reset ALL Data"
            title="Reset all data?"
            description="This permanently deletes every transaction, account, and net worth snapshot. This cannot be undone."
            confirmLabel="Reset everything"
            onConfirm={resetAllData}
          />
        </CardContent>
      </Card>
    </div>
  );
}
