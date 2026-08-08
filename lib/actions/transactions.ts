"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { BANK_FORMATS, DEFAULT_CATEGORY_RULES, type CategoryRule } from "@/lib/constants";
import { parseCsvForBank } from "@/lib/csv-parsing";
import { categorizeTransaction } from "@/lib/categorize";

const bankFormatSchema = z.enum(BANK_FORMATS);

export type ImportCsvResult =
  | { error: string }
  | { error?: undefined; imported?: number; duplicates?: number };

export async function importCsv(
  _prevState: ImportCsvResult,
  formData: FormData,
): Promise<ImportCsvResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const bankFormatParsed = bankFormatSchema.safeParse(formData.get("bankFormat"));
  if (!bankFormatParsed.success) return { error: "Invalid statement format." };
  const bankFormat = bankFormatParsed.data;

  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { error: "Choose at least one CSV file." };

  const { data: ruleRow } = await supabase.from("category_rules").select("rules").single();
  const rules: CategoryRule[] = ruleRow?.rules ?? DEFAULT_CATEGORY_RULES;

  const rows: { user_id: string; date: string; description: string; amount: number; bank: string; category: string }[] = [];
  for (const file of files) {
    const text = await file.text();
    const parsed = parseCsvForBank(bankFormat, text);
    for (const tx of parsed) {
      rows.push({
        user_id: user.id,
        date: tx.date,
        description: tx.description,
        amount: tx.amount,
        bank: tx.bank,
        category: categorizeTransaction(tx.description, rules),
      });
    }
  }

  if (rows.length === 0) {
    return { error: "No transactions found — check the statement format matches the file." };
  }

  const { data: inserted, error } = await supabase
    .from("transactions")
    .upsert(rows, {
      onConflict: "user_id,date,description,amount",
      ignoreDuplicates: true,
    })
    .select("id");
  if (error) return { error: error.message };

  revalidatePath("/data-entry");
  revalidatePath("/spending");
  return { imported: inserted?.length ?? 0, duplicates: rows.length - (inserted?.length ?? 0) };
}

export async function recategorizeByDescription(description: string, newCategory: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("transactions")
    .update({ category: newCategory })
    .eq("description", description);
  if (error) throw new Error(error.message);

  revalidatePath("/spending");
  revalidatePath("/data-entry");
}
