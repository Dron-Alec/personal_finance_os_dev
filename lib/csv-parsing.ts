import Papa from "papaparse";
import { format } from "date-fns";
import type { BankFormat } from "@/lib/constants";

export type ParsedTransaction = {
  date: string; // ISO yyyy-MM-dd
  description: string;
  amount: number;
  bank: BankFormat;
};

/** Fuzzy column lookup: first keyword (in order) with a matching column wins. */
export function findCol(columns: string[], keywords: string[]): string | null {
  for (const keyword of keywords) {
    for (const column of columns) {
      if (column.toLowerCase().includes(keyword.toLowerCase())) return column;
    }
  }
  return null;
}

export function cleanVal(raw: unknown): number {
  const s = String(raw ?? "").replace(/,/g, "").replace(/\$/g, "").trim();
  if (["nan", "", "--", "none"].includes(s.toLowerCase())) return 0;
  const n = parseFloat(s);
  return Number.isNaN(n) ? 0 : n;
}

// Case-sensitive by design, matching the original Streamlit parser — bank
// export preambles ("Account Activity", disclaimers, etc.) rarely contain
// these exact-cased words, which is what makes the heuristic reliable.
export function findHeaderRow(lines: string[]): number {
  const markers = ["Date", "Status", "Transaction", "Trans."];
  for (let i = 0; i < Math.min(lines.length, 25); i++) {
    if (markers.some((m) => lines[i].includes(m))) return i;
  }
  return 0;
}

export function parseCsvForBank(bankFormat: BankFormat, csvText: string): ParsedTransaction[] {
  const lines = csvText.split(/\r\n|\n|\r/);
  const skip = findHeaderRow(lines);
  const trimmedText = lines.slice(skip).join("\n");

  const parsed = Papa.parse<Record<string, string>>(trimmedText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const columns = (parsed.meta.fields ?? []).filter((c) => !/^Unnamed/i.test(c));

  const dateCol = findCol(columns, ["Date", "Trans Date", "Transaction Date", "Post Date"]);
  const descCol = findCol(columns, ["Description", "Memo", "Name", "Payee", "Merchant"]);
  if (!dateCol || !descCol) return [];

  const transactions: ParsedTransaction[] = [];

  for (const row of parsed.data) {
    const rawDate = String(row[dateCol] ?? "").trim();
    if (!rawDate || ["nan", "date"].includes(rawDate.toLowerCase())) continue;

    const parsedDate = new Date(rawDate);
    if (Number.isNaN(parsedDate.getTime())) continue;

    const description = String(row[descCol] ?? "");

    let amount: number;
    if (bankFormat === "Citi Checking" || bankFormat === "Citi Credit") {
      const debitCol = findCol(columns, ["Debit"]);
      const creditCol = findCol(columns, ["Credit"]);
      const amtCol = findCol(columns, ["Amount"]);
      if (debitCol && creditCol) {
        amount = cleanVal(row[creditCol]) - cleanVal(row[debitCol]);
      } else if (amtCol) {
        amount = cleanVal(row[amtCol]);
      } else {
        continue;
      }
    } else if (bankFormat === "Discover") {
      // Discover CSVs: positive = charge, negative = payment. Negate so
      // expenses are negative, matching every other bank's convention.
      const amtCol = findCol(columns, ["Amount"]);
      amount = amtCol ? -cleanVal(row[amtCol]) : 0;
    } else {
      // WF, Chase, BofA, Axos: negative = debit/expense as-is.
      const amtCol = findCol(columns, ["Amount"]);
      amount = amtCol ? cleanVal(row[amtCol]) : 0;
    }

    transactions.push({
      date: format(parsedDate, "yyyy-MM-dd"),
      description,
      amount,
      bank: bankFormat,
    });
  }

  return transactions;
}
