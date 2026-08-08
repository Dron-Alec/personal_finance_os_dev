import { format } from "date-fns";
import type { ColumnMapping } from "@/lib/import/csv-header-matcher";
import { parseLocalDate } from "@/lib/date-utils";

export type MappedTransaction = {
  date: string; // ISO yyyy-MM-dd
  description: string;
  amount: number;
};

/**
 * Parses one raw amount-ish cell into a signed number, independent of a
 * detected NumberFormat/negative convention for the *column* — each value
 * is judged on its own punctuation (parens, leading/trailing minus) rather
 * than trusting the column-level guess for every row.
 */
function parseSignedAmount(raw: string | undefined, numberFormat: ColumnMapping["numberFormat"]): number {
  let s = String(raw ?? "").trim();
  if (s === "") return 0;

  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (/^-/.test(s)) {
    negative = true;
    s = s.slice(1);
  }
  if (/-$/.test(s)) {
    negative = true;
    s = s.slice(0, -1);
  }
  s = s.replace(/\$/g, "").trim();

  s = numberFormat === "European" ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");

  const n = parseFloat(s);
  if (Number.isNaN(n)) return 0;
  return negative ? -n : n;
}

function computeAmount(row: Record<string, string>, mapping: ColumnMapping): number | null {
  switch (mapping.amountType) {
    case "single_signed": {
      if (!mapping.amountColumn) return null;
      return parseSignedAmount(row[mapping.amountColumn], mapping.numberFormat);
    }
    case "split_debit_credit": {
      if (!mapping.debitColumn || !mapping.creditColumn) return null;
      const debit = Math.abs(parseSignedAmount(row[mapping.debitColumn], mapping.numberFormat));
      const credit = Math.abs(parseSignedAmount(row[mapping.creditColumn], mapping.numberFormat));
      return credit - debit;
    }
    case "single_unsigned_with_type_column": {
      if (!mapping.amountColumn || !mapping.typeColumn) return null;
      const magnitude = Math.abs(parseSignedAmount(row[mapping.amountColumn], mapping.numberFormat));
      const typeVal = String(row[mapping.typeColumn] ?? "").trim().toLowerCase();
      const isDebit = typeVal === "debit" || typeVal === "dr";
      return isDebit ? -magnitude : magnitude;
    }
    default:
      return null;
  }
}

/** Executes a confirmed (already-detected, user-reviewed) ColumnMapping against parsed CSV rows. */
export function applyMapping(mapping: ColumnMapping, rows: Record<string, string>[]): MappedTransaction[] {
  if (!mapping.dateColumn || !mapping.descriptionColumn || !mapping.amountType) return [];

  const transactions: MappedTransaction[] = [];
  for (const row of rows) {
    const rawDate = String(row[mapping.dateColumn] ?? "").trim();
    if (!rawDate || ["nan", "date"].includes(rawDate.toLowerCase())) continue;

    const parsedDate = parseLocalDate(rawDate);
    if (Number.isNaN(parsedDate.getTime())) continue;

    const amount = computeAmount(row, mapping);
    if (amount === null) continue;

    transactions.push({
      date: format(parsedDate, "yyyy-MM-dd"),
      description: String(row[mapping.descriptionColumn] ?? ""),
      amount,
    });
  }
  return transactions;
}
