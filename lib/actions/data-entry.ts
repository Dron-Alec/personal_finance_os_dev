"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentHouseholdId } from "@/lib/households";
import { signedBalance } from "@/lib/constants";

export type SaveBalancesResult = { error: string } | { error?: undefined; totalNetWorth?: number };

export async function saveMonthlyBalances(
  _prevState: SaveBalancesResult,
  formData: FormData,
): Promise<SaveBalancesResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const entryDate = formData.get("entryDate");
  if (typeof entryDate !== "string" || !entryDate) return { error: "Date is required." };

  const existingEntries: { accountId: number; amount: number }[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("existing_")) continue;
    const accountId = Number(key.slice("existing_".length));
    const amount = Number(value);
    if (!Number.isFinite(accountId) || !Number.isFinite(amount)) continue;
    existingEntries.push({ accountId, amount });
  }

  // Re-derive type/is_liability server-side rather than trusting a hidden
  // client field — same reasoning as signedBalance's other call sites.
  const { data: existingAccounts } = await supabase
    .from("accounts")
    .select("id, type, is_liability")
    .in(
      "id",
      existingEntries.map((e) => e.accountId),
    );
  const accountMeta = new Map((existingAccounts ?? []).map((a) => [a.id, a]));

  for (const { accountId, amount } of existingEntries) {
    const meta = accountMeta.get(accountId);
    const balance = meta ? signedBalance(meta.type, amount, meta.is_liability) : amount;

    const { error } = await supabase
      .from("accounts")
      .update({ balance, as_of_date: entryDate, updated_at: new Date().toISOString() })
      .eq("id", accountId);
    if (error) return { error: error.message };

    await supabase.from("account_balance_history").insert({
      account_id: accountId,
      user_id: user.id,
      balance,
      as_of_date: entryDate,
    });
  }

  const templateBalances = new Map<number, number>();
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("template_")) continue;
    const templateId = Number(key.slice("template_".length));
    const balance = Number(value);
    if (!Number.isFinite(templateId) || !Number.isFinite(balance) || balance === 0) continue;
    templateBalances.set(templateId, balance);
  }

  if (templateBalances.size > 0) {
    const householdId = await getCurrentHouseholdId(supabase, user.id);
    const { data: templates } = await supabase
      .from("account_templates")
      .select("id, name, type, bank_format")
      .in("id", Array.from(templateBalances.keys()));

    for (const template of templates ?? []) {
      const amount = templateBalances.get(template.id);
      if (amount === undefined) continue;
      // Templates themselves don't store is_liability — the checklist row's
      // own checkbox (only shown for "Other") decides it at creation time.
      const isLiability = formData.get(`template_${template.id}_liability`) === "on";
      const balance = signedBalance(template.type, amount, isLiability);

      const { data: account, error } = await supabase
        .from("accounts")
        .insert({
          household_id: householdId,
          name: template.name,
          type: template.type,
          bank_format: template.bank_format,
          balance,
          is_liability: isLiability,
          as_of_date: entryDate,
        })
        .select("id")
        .single();
      if (error) return { error: error.message };

      await supabase.from("account_balance_history").insert({
        account_id: account.id,
        user_id: user.id,
        balance,
        as_of_date: entryDate,
      });
    }
  }

  const { data: accounts } = await supabase.from("accounts").select("balance");
  const totalNetWorth = (accounts ?? []).reduce((sum, a) => sum + Number(a.balance), 0);

  const { error: snapshotError } = await supabase.from("nw_snapshots").insert({
    user_id: user.id,
    date: entryDate,
    net_worth: totalNetWorth,
    note: "Monthly balance entry",
  });
  if (snapshotError) return { error: snapshotError.message };

  revalidatePath("/data-entry");
  revalidatePath("/accounts");
  revalidatePath("/net-worth");
  return { totalNetWorth };
}
