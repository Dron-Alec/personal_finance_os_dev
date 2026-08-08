"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
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

const targetsRowSchema = z.object({
  quarter: z.string().regex(/^\d{4}-Q[1-4]$/, "Quarter must look like 2026-Q1"),
  target_net_worth: z.coerce.number(),
});

export type SaveTargetsResult = { error: string } | { error?: undefined };

export async function saveTargets(
  _prevState: SaveTargetsResult,
  formData: FormData,
): Promise<SaveTargetsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const csv = String(formData.get("targetsCsv") ?? "");
  const lines = csv
    .split(/\r\n|\n|\r/)
    .map((l) => l.trim())
    .filter(Boolean);

  const dataLines = lines[0]?.toLowerCase().startsWith("quarter") ? lines.slice(1) : lines;

  const rows: { user_id: string; quarter: string; target_net_worth: number }[] = [];
  for (const line of dataLines) {
    const [quarter, value] = line.split(",").map((s) => s.trim());
    const parsed = targetsRowSchema.safeParse({ quarter, target_net_worth: value });
    if (!parsed.success) {
      return { error: `Invalid row "${line}": ${parsed.error.issues[0]?.message}` };
    }
    rows.push({ user_id: user.id, ...parsed.data });
  }

  const { error: deleteError } = await supabase.from("nw_targets").delete().eq("user_id", user.id);
  if (deleteError) return { error: deleteError.message };

  if (rows.length > 0) {
    const { error: insertError } = await supabase.from("nw_targets").insert(rows);
    if (insertError) return { error: insertError.message };
  }

  revalidatePath("/settings");
  revalidatePath("/net-worth");
  return {};
}

export async function clearTransactions() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const { error } = await supabase.from("transactions").delete().eq("user_id", user.id);
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

  // account_balance_history cascades from accounts via FK.
  await supabase.from("transactions").delete().eq("user_id", user.id);
  await supabase.from("accounts").delete().eq("user_id", user.id);
  await supabase.from("nw_snapshots").delete().eq("user_id", user.id);

  revalidatePath("/data-entry");
  revalidatePath("/spending");
  revalidatePath("/accounts");
  revalidatePath("/net-worth");
}
