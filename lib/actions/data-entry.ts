"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { STANDARD_ACCOUNTS } from "@/lib/constants";

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

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("existing_")) continue;
    const accountId = Number(key.slice("existing_".length));
    const balance = Number(value);
    if (!Number.isFinite(accountId) || !Number.isFinite(balance)) continue;

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

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("standard_")) continue;
    const index = Number(key.slice("standard_".length));
    const balance = Number(value);
    if (!Number.isFinite(index) || !Number.isFinite(balance) || balance === 0) continue;
    const standard = STANDARD_ACCOUNTS[index];
    if (!standard) continue;
    const [name, type] = standard;

    const { data: account, error } = await supabase
      .from("accounts")
      .insert({ user_id: user.id, name, type, balance, as_of_date: entryDate })
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
