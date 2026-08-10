"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentHouseholdId } from "@/lib/households";
import { categorizeTransaction } from "@/lib/categorize";
import type { CategoryRule } from "@/lib/constants";

export type SaveRulesResult = { error: string } | { error?: undefined };

export async function saveCategoryRules(
  _prevState: SaveRulesResult,
  formData: FormData,
): Promise<SaveRulesResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const category = String(formData.get("category") ?? "").trim();
  if (!category) return { error: "Category name is required." };
  const keywords = String(formData.get("keywords") ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  const { data: ruleRow } = await supabase.from("category_rules").select("rules").single();
  const rules: CategoryRule[] = ruleRow?.rules ?? [];

  const idx = rules.findIndex((r) => r.category === category);
  if (idx >= 0) rules[idx] = { category, keywords };
  else rules.push({ category, keywords });

  const { error: ruleError } = await supabase
    .from("category_rules")
    .upsert({ user_id: user.id, rules, updated_at: new Date().toISOString() });
  if (ruleError) return { error: ruleError.message };

  const { data: transactions } = await supabase.from("transactions").select("id, description");
  const byNewCategory = new Map<string, number[]>();
  for (const t of transactions ?? []) {
    const newCategory = categorizeTransaction(t.description, rules);
    if (!byNewCategory.has(newCategory)) byNewCategory.set(newCategory, []);
    byNewCategory.get(newCategory)!.push(t.id);
  }
  for (const [newCategory, ids] of byNewCategory) {
    await supabase.from("transactions").update({ category: newCategory }).in("id", ids);
  }

  revalidatePath("/settings");
  revalidatePath("/spending");
  return {};
}

export async function clearTransactions() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const householdId = await getCurrentHouseholdId(supabase, user.id);
  const { error } = await supabase.from("transactions").delete().eq("household_id", householdId);
  if (error) throw new Error(error.message);

  revalidatePath("/data-entry");
  revalidatePath("/spending");
}

export async function resetAllData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const householdId = await getCurrentHouseholdId(supabase, user.id);
  // account_balance_history cascades from accounts via FK.
  await supabase.from("transactions").delete().eq("household_id", householdId);
  await supabase.from("accounts").delete().eq("household_id", householdId);
  await supabase.from("nw_snapshots").delete().eq("user_id", user.id);

  revalidatePath("/data-entry");
  revalidatePath("/spending");
  revalidatePath("/accounts");
  revalidatePath("/net-worth");
}
