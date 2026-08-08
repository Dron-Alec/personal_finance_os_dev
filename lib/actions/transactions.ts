"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { BANK_FORMATS, DEFAULT_CATEGORY_RULES, type BankFormat, type CategoryRule } from "@/lib/constants";
import { extractHeaderSample, parseCsvForBank } from "@/lib/csv-parsing";
import { categorizeTransaction } from "@/lib/categorize";
import { matchHeaders, type ColumnMapping } from "@/lib/import/csv-header-matcher";
import { applyMapping } from "@/lib/import/apply-mapping";

const bankFormatSchema = z.string().min(1);

function isBuiltinFormat(format: string): format is BankFormat {
  return (BANK_FORMATS as readonly string[]).includes(format);
}

function toColumnMapping(row: {
  date_column: string;
  secondary_date_column: string | null;
  description_column: string;
  amount_type: string;
  amount_column: string | null;
  debit_column: string | null;
  credit_column: string | null;
  type_column: string | null;
  category_column: string | null;
  balance_column: string | null;
  number_format: string | null;
}): ColumnMapping {
  return {
    dateColumn: row.date_column,
    secondaryDateColumn: row.secondary_date_column,
    descriptionColumn: row.description_column,
    amountType: row.amount_type as ColumnMapping["amountType"],
    amountColumn: row.amount_column,
    debitColumn: row.debit_column,
    creditColumn: row.credit_column,
    typeColumn: row.type_column,
    categoryColumn: row.category_column,
    balanceColumn: row.balance_column,
    numberFormat: row.number_format as ColumnMapping["numberFormat"],
    negativeConvention: null,
    confidence: "high",
    missingRequiredFields: [],
    notes: [],
  };
}

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

  let customMapping: ColumnMapping | null = null;
  if (!isBuiltinFormat(bankFormat)) {
    const { data: customFormat } = await supabase
      .from("custom_bank_formats")
      .select(
        "date_column, secondary_date_column, description_column, amount_type, amount_column, debit_column, credit_column, type_column, category_column, balance_column, number_format",
      )
      .eq("name", bankFormat)
      .maybeSingle();
    if (!customFormat) return { error: "Unknown statement format." };
    customMapping = toColumnMapping(customFormat);
  }

  const rows: { user_id: string; date: string; description: string; amount: number; bank: string; category: string }[] = [];
  for (const file of files) {
    const text = await file.text();
    const parsed = customMapping
      ? applyMapping(customMapping, extractHeaderSample(text).rows)
      : parseCsvForBank(bankFormat as BankFormat, text);
    for (const tx of parsed) {
      rows.push({
        user_id: user.id,
        date: tx.date,
        description: tx.description,
        amount: tx.amount,
        bank: bankFormat,
        category: categorizeTransaction(tx.description, rules),
      });
    }
  }

  if (rows.length === 0) {
    // Tier 1 (the selected bank format's fixed column names) found nothing.
    // Fall through to Tier 2: deterministic header/fuzzy matching against
    // the first file's actual columns, purely to surface a suggestion —
    // never to auto-import. A medium/high-confidence guess is not enough
    // on its own to commit data without the user confirming it.
    let suggestion = "";
    const { columns, sampleValuesByColumn } = extractHeaderSample(await files[0].text());
    if (columns.length > 0) {
      const mapping = matchHeaders({ headers: columns, sampleValuesByColumn });
      if (mapping.confidence === "high" || mapping.confidence === "medium") {
        // TODO(Tier 3/4): this is where a one-tap "does this look right?"
        // confirmation screen should take over instead of erroring out, and
        // persist the user's accept/reject to an import_mapping_feedback
        // table so the synonym dictionary can be expanded over time. Until
        // that UI exists, we only ever describe the guess — we never act on
        // it — so surfacing it here can't accidentally commit bad data.
        suggestion = ` We noticed columns that look like date="${mapping.dateColumn}", description="${mapping.descriptionColumn}", amount="${mapping.amountColumn ?? `${mapping.debitColumn}/${mapping.creditColumn}`}" (${mapping.confidence} confidence) — this bank isn't set up yet, but that shape looks promising. Contact support to add it.`;
      }
      // low confidence: Tier 3 (AI mapper) doesn't exist yet — TODO — so we
      // fall through to Tier 4, i.e. the existing "pick the right format
      // from the dropdown" manual flow, with the generic error below.
    }
    return { error: `No transactions found — check the statement format matches the file.${suggestion}` };
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
