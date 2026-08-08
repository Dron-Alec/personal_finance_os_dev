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

/**
 * `new Date("2026-07-01")` parses an ISO-shaped string as UTC midnight, but
 * `format()` then renders it in the server's local timezone — a server
 * behind UTC (any US timezone) rolls the date back a day. Slash-formatted
 * dates ("7/1/2026") don't have this problem — those parse as local time
 * already — so only the ISO shape needs the explicit local-components
 * constructor.
 */
export function parseLocalDate(raw: string): Date {
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  return new Date(raw);
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

/**
 * Tier 0 (file sniffing) + raw column/sample extraction, shared by
 * parseCsvForBank (Tier 1 — known bank format) and the Tier 2 header matcher
 * fallback (lib/import/csv-header-matcher.ts) when Tier 1 can't find its
 * expected columns.
 */
export function extractHeaderSample(csvText: string): {
  columns: string[];
  rows: Record<string, string>[];
  sampleValuesByColumn: Record<string, string[]>;
} {
  const lines = csvText.split(/\r\n|\n|\r/);
  const skip = findHeaderRow(lines);
  const trimmedText = lines.slice(skip).join("\n");

  const parsed = Papa.parse<Record<string, string>>(trimmedText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const columns = (parsed.meta.fields ?? []).filter((c) => !/^Unnamed/i.test(c));
  const sampleValuesByColumn: Record<string, string[]> = {};
  for (const col of columns) {
    sampleValuesByColumn[col] = parsed.data.slice(0, 15).map((row) => String(row[col] ?? ""));
  }

  return { columns, rows: parsed.data, sampleValuesByColumn };
}

// Banks whose export splits money out/in across two columns instead of one
// signed Amount column (Capital One's "Debit"/"Credit", PNC's
// "Withdrawals"/"Deposits").
const SPLIT_DEBIT_CREDIT_BANKS: readonly BankFormat[] = ["Citi Checking", "Citi Credit", "Capital One Credit", "PNC"];

// Banks whose single Amount column is positive for a charge and negative
// for a payment/credit — the opposite of a checking account's "negative =
// debit" convention. Negated so expenses are negative everywhere.
const POSITIVE_CHARGE_BANKS: readonly BankFormat[] = ["Discover", "American Express"];

export function parseCsvForBank(bankFormat: BankFormat, csvText: string): ParsedTransaction[] {
  const { columns, rows } = extractHeaderSample(csvText);

  const dateCol = findCol(columns, ["Date", "Trans Date", "Transaction Date", "Post Date"]);
  const descCol = findCol(columns, ["Description", "Memo", "Name", "Payee", "Merchant", "Note"]);
  if (!dateCol || !descCol) return [];

  const transactions: ParsedTransaction[] = [];

  for (const row of rows) {
    const rawDate = String(row[dateCol] ?? "").trim();
    if (!rawDate || ["nan", "date"].includes(rawDate.toLowerCase())) continue;

    const parsedDate = parseLocalDate(rawDate);
    if (Number.isNaN(parsedDate.getTime())) continue;

    const description = String(row[descCol] ?? "");

    let amount: number;
    if (SPLIT_DEBIT_CREDIT_BANKS.includes(bankFormat)) {
      const debitCol = findCol(columns, ["Debit", "Withdrawal", "Withdrawals"]);
      const creditCol = findCol(columns, ["Credit", "Deposit", "Deposits"]);
      const amtCol = findCol(columns, ["Amount"]);
      if (debitCol && creditCol) {
        amount = cleanVal(row[creditCol]) - cleanVal(row[debitCol]);
      } else if (amtCol) {
        amount = cleanVal(row[amtCol]);
      } else {
        continue;
      }
    } else if (POSITIVE_CHARGE_BANKS.includes(bankFormat)) {
      const amtCol = findCol(columns, ["Amount"]);
      amount = amtCol ? -cleanVal(row[amtCol]) : 0;
    } else {
      // WF, Chase, BofA, Axos, US Bank, Ally, Capital One 360, Venmo,
      // PayPal: negative = debit/expense as-is.
      //
      // Apple Card is also parsed here, but its sign convention wasn't
      // independently verifiable from public sources — if a real Apple
      // Card import comes through with inverted signs, this is the first
      // place to check.
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
