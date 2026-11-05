"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentHouseholdId } from "@/lib/households";
import { DEFAULT_CATEGORY_RULES, type CategoryRule } from "@/lib/constants";
import { extractHeaderSample, readCsvFiles } from "@/lib/csv-parsing";
import { categorizeTransaction } from "@/lib/categorize";
import { log } from "@/lib/log";
import { applyMapping } from "@/lib/import/apply-mapping";
import type { ColumnMapping } from "@/lib/import/csv-header-matcher";

const mappingSchema = z.object({
  dateColumn: z.string().min(1),
  secondaryDateColumn: z.string().nullable(),
  descriptionColumn: z.string().min(1),
  amountType: z.enum(["single_signed", "split_debit_credit", "single_unsigned_with_type_column"]),
  amountColumn: z.string().nullable(),
  debitColumn: z.string().nullable(),
  creditColumn: z.string().nullable(),
  typeColumn: z.string().nullable(),
  categoryColumn: z.string().nullable(),
  balanceColumn: z.string().nullable(),
  numberFormat: z.enum(["US", "European"]).nullable(),
});

export type ConfirmCustomFormatResult =
  | { error: string }
  | { error?: undefined; imported?: number; duplicates?: number };

// The client already ran Tier 2 detection and showed the user the mapping
// for review — this action re-derives everything server-side rather than
// trusting client-computed transactions, only trusting the *mapping shape*
// the user confirmed (which columns mean what).
export async function confirmCustomFormatAndImport(
  _prevState: ConfirmCustomFormatResult,
  formData: FormData,
): Promise<ConfirmCustomFormatResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };
  const householdId = await getCurrentHouseholdId(supabase, user.id);

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Give this format a name (e.g. the bank's name)." };

  const mappingRaw = formData.get("mapping");
  if (typeof mappingRaw !== "string") return { error: "Missing column mapping." };
  let mappingJson: unknown;
  try {
    mappingJson = JSON.parse(mappingRaw);
  } catch {
    return { error: "Malformed column mapping." };
  }
  const parsedMapping = mappingSchema.safeParse(mappingJson);
  if (!parsedMapping.success) return { error: "Invalid column mapping." };
  const mapping: ColumnMapping = {
    ...parsedMapping.data,
    negativeConvention: null,
    confidence: "high",
    missingRequiredFields: [],
    notes: [],
  };

  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { error: "Choose at least one CSV file." };
  const read = await readCsvFiles(files);
  if ("error" in read) return read;

  const { data: ruleRow } = await supabase.from("category_rules").select("rules").single();
  const rules: CategoryRule[] = ruleRow?.rules ?? DEFAULT_CATEGORY_RULES;

  const rows: { household_id: string; date: string; description: string; amount: number; bank: string; category: string }[] = [];
  for (const text of read.texts) {
    const parsed = applyMapping(mapping, extractHeaderSample(text).rows);
    for (const tx of parsed) {
      rows.push({
        household_id: householdId,
        date: tx.date,
        description: tx.description,
        amount: tx.amount,
        bank: name,
        category: categorizeTransaction(tx.description, rules),
      });
    }
  }

  if (rows.length === 0) {
    log("warn", "parse.no_rows", { format: "custom:new", custom: true, files: read.texts.length });
    return { error: "No transactions found using the confirmed mapping — double-check the columns above." };
  }

  const { error: formatError } = await supabase.from("custom_bank_formats").insert({
    name,
    date_column: parsedMapping.data.dateColumn,
    secondary_date_column: mapping.secondaryDateColumn,
    description_column: parsedMapping.data.descriptionColumn,
    amount_type: parsedMapping.data.amountType,
    amount_column: mapping.amountColumn,
    debit_column: mapping.debitColumn,
    credit_column: mapping.creditColumn,
    type_column: mapping.typeColumn,
    category_column: mapping.categoryColumn,
    balance_column: mapping.balanceColumn,
    number_format: mapping.numberFormat,
    created_by: user.id,
  });
  // Names are unique ignoring case/punctuation, and someone else's format
  // may still be pending review (invisible to you) — so a collision can't
  // fall through to importing under a name this user can't look up later.
  if (formatError?.code === "23505") {
    return { error: `A format named "${name}" already exists — pick a different name.` };
  }
  if (formatError?.code === "23514") {
    return {
      error: formatError.message.includes("not_builtin")
        ? `"${name}" is a built-in format — pick it from the Statement Format list instead.`
        : "Format names must be 2–60 characters.",
    };
  }
  if (formatError) return { error: formatError.message };
  log("info", "custom_format.created", { amount_type: parsedMapping.data.amountType });

  const { data: inserted, error } = await supabase
    .from("transactions")
    .upsert(rows, {
      onConflict: "household_id,date,description,amount,plaid_transaction_id",
      ignoreDuplicates: true,
    })
    .select("id");
  if (error) {
    log("error", "import.failed", { format: "custom", code: error.code });
    return { error: error.message };
  }
  log("info", "import.completed", {
    format: "custom",
    files: read.texts.length,
    parsed: rows.length,
    inserted: inserted?.length ?? 0,
  });

  revalidatePath("/data-entry");
  revalidatePath("/spending");
  return { imported: inserted?.length ?? 0, duplicates: rows.length - (inserted?.length ?? 0) };
}
