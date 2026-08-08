/**
 * Tier 2 CSV Header Matcher
 * ---------------------------------------------------------------------------
 * Deterministic, zero-cost column mapper for bank/card CSV exports.
 * Runs after Tier 1 (known-bank format selected from the dropdown, parsed by
 * lib/csv-parsing.ts) fails to find recognizable columns, and before Tier 3
 * (AI fallback — not yet built).
 *
 * Strategy:
 *   1. Normalize every header (strip punctuation/whitespace, lowercase)
 *   2. Exact-match against a synonym dictionary per schema field
 *   3. Fuzzy-match (Levenshtein) anything that didn't hit exactly
 *   4. Detect amount shape: single signed column vs split debit/credit vs
 *      single unsigned column + a debit/credit type flag
 *   5. Detect number format (US vs European) and negative-value convention
 *      from a sample of actual values, not headers
 *   6. Return a confidence-scored mapping; the caller decides whether to
 *      show it to the user for one-tap confirmation or fall through to
 *      Tier 3/4
 *
 * This module is purely local and deterministic — no network calls, no AI,
 * and it never receives anything beyond column headers and small samples of
 * raw cell values (never full transaction rows).
 *
 * Known limitation: amount-shape detection can't fully disambiguate a bank
 * that has *both* an already-signed Amount column *and* a separate column
 * whose values are literally "DEBIT"/"CREDIT" (e.g. US Bank's "Transaction"
 * column). Headers-only + value-sampling can't tell "this Type column is
 * the *only* signal, Amount is unsigned" apart from "this Type column is
 * redundant, Amount is already signed" without also checking whether the
 * Amount values themselves contain negatives. Today the dictionary avoids
 * the false positive by not recognizing loosely-named columns like
 * "Transaction" as a type flag at all (see the `type` synonym list) —
 * which is conservative (some real type-flag columns go unrecognized) but
 * never miscategorizes an already-signed amount as unsigned.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AmountType =
  | "single_signed"
  | "split_debit_credit"
  | "single_unsigned_with_type_column";

export type NumberFormat = "US" | "European";

export type NegativeConvention =
  | "leading_minus"
  | "trailing_minus"
  | "parentheses"
  | "none_detected";

export interface ColumnMapping {
  dateColumn: string | null;
  secondaryDateColumn: string | null; // e.g. "Transaction Date" when "Posted Date" is primary
  descriptionColumn: string | null;
  amountType: AmountType | null;
  amountColumn: string | null;
  debitColumn: string | null;
  creditColumn: string | null;
  typeColumn: string | null; // for single_unsigned_with_type_column (e.g. "DEBIT"/"CREDIT" flag)
  categoryColumn: string | null;
  balanceColumn: string | null;
  numberFormat: NumberFormat | null;
  negativeConvention: NegativeConvention | null;
  confidence: "high" | "medium" | "low";
  missingRequiredFields: string[];
  notes: string[];
}

export interface HeaderMatcherInput {
  headers: string[];
  /** Column name -> array of sample raw string values (e.g. first 10-15 rows). */
  sampleValuesByColumn: Record<string, string[]>;
}

// ---------------------------------------------------------------------------
// Synonym dictionary
// ---------------------------------------------------------------------------
// Built from confirmed formats (Chase, Citi, Capital One [CC + 360], PNC,
// Bank of America, Apple Card, Discover, Wells Fargo, Axos) plus common
// conventions seen across smaller/regional banks and accounting export
// tools (QBO/OFX-adjacent CSV variants).
//
// All keys are pre-normalized: lowercase, no spaces/punctuation.
// normalizeHeader() below produces matching keys from raw headers.
//
// "postedDate" and "transactionDate" are separate buckets (rather than one
// shared "date" bucket) so a fuzzy-matched posted-style header — e.g. "Post
// Dt" — is still recognized as *posted* and takes priority over a
// transaction date, instead of only being caught by whichever bucket
// happens to scan first. See matchHeaders() for how the two are combined.

// Each field has a "primary" synonym list and an optional "secondary" one.
// matchField() runs an exact pass over *primary* across every header before
// even looking at *secondary* — so a genuinely ambiguous term (like
// "Reference", which is a description on some exports and just a
// transaction-ID column on others, e.g. American Express) can't win against
// an unambiguous term purely because of column order. Most fields don't
// need the distinction and leave secondary empty.
interface FieldSynonyms {
  primary: readonly string[];
  secondary: readonly string[];
}

const SYNONYMS = {
  postedDate: {
    primary: ["posteddate", "postdate", "posted", "effectivedate", "valuedate", "processeddate"],
    secondary: [],
  },
  transactionDate: {
    primary: ["date", "transactiondate", "trandate", "activitydate", "datetime"],
    secondary: [],
  },
  description: {
    primary: [
      "description",
      "desc",
      "merchant",
      "merchantname",
      "payee",
      "memo",
      "transactiondescription",
      "name",
      "narrative",
      "note", // Venmo
      // Deliberately no "details" — Chase's real checking export uses a
      // "Details" column for a DEBIT/CREDIT flag, not the description.
    ],
    // Real but ambiguous terms: on some exports these *are* the
    // description, but American Express's own CSV has both a "Description"
    // and a separate "Reference" (transaction ID) column — if "Reference"
    // matched with equal priority, whichever happened to come first in the
    // header row would win, which is fragile. Only fall back to these if no
    // primary term matched anywhere.
    secondary: ["reference", "particulars"],
  },
  amount: {
    primary: ["amount", "amt", "transactionamount", "amountusd", "value", "amounttotal"], // Venmo: "Amount (total)"
    secondary: [],
  },
  debit: {
    primary: [
      "debit",
      "debits",
      "withdrawal",
      "withdrawals",
      "moneyout",
      "outflow",
      "paidout",
      "debitamount",
    ],
    secondary: [],
  },
  credit: {
    primary: [
      "credit",
      "credits",
      "deposit",
      "deposits",
      "moneyin",
      "inflow",
      "paidin",
      "creditamount",
    ],
    secondary: [],
  },
  type: {
    primary: ["type", "transactiontype", "trantype", "debitcredit", "drcr", "flowtype"],
    secondary: [],
  },
  category: {
    primary: ["category", "categories", "spendingcategory", "transactioncategory"],
    secondary: [],
  },
  balance: {
    primary: [
      "balance",
      "runningbalance",
      "runningbal", // Bank of America: "Running Bal."
      "endingbalance",
      "availablebalance",
      "balanceafter",
    ],
    secondary: [],
  },
} as const satisfies Record<string, FieldSynonyms>;

type SynonymKey = keyof typeof SYNONYMS;

// Fields required for a mapping to be usable at all without manual input.
const REQUIRED_FIELDS = ["date", "description", "amount_or_split"] as const;

// ---------------------------------------------------------------------------
// Header normalization
// ---------------------------------------------------------------------------

export function normalizeHeader(raw: string): string {
  return String(raw ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9]/g, ""); // strip spaces, punctuation, symbols
}

/** Flags raw headers that collapse to the same normalized form. First occurrence wins the match. */
function findDuplicateNormalizedHeaders(headers: string[]): string[] {
  const groups = new Map<string, string[]>();
  for (const h of headers) {
    const norm = normalizeHeader(h);
    if (!norm) continue;
    const group = groups.get(norm) ?? [];
    group.push(h);
    groups.set(norm, group);
  }
  const notes: string[] = [];
  for (const [norm, raws] of groups) {
    if (raws.length > 1) {
      notes.push(
        `Columns ${raws.map((r) => `"${r}"`).join(", ")} all normalize to "${norm}" — using the first occurrence ("${raws[0]}") and ignoring the rest.`,
      );
    }
  }
  return notes;
}

// ---------------------------------------------------------------------------
// Fuzzy matching (Levenshtein distance)
// ---------------------------------------------------------------------------

export function levenshtein(a: string, b: string): number {
  // Single-row DP — O(a.length * b.length) time, O(b.length) space. Header
  // strings are always short (a handful of words), so this stays cheap no
  // matter how many synonyms/headers it's run against.
  let prevRow = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const currRow = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currRow.push(
        Math.min(
          prevRow[j] + 1, // deletion
          currRow[j - 1] + 1, // insertion
          prevRow[j - 1] + cost, // substitution
        ),
      );
    }
    prevRow = currRow;
  }
  return prevRow[b.length];
}

/**
 * Fuzzy-match a normalized header against a list of normalized synonyms.
 * Distance threshold scales with string length so short headers ("date")
 * don't accidentally match unrelated short words.
 */
function fuzzyMatch(header: string, candidates: readonly string[]): boolean {
  if (!header) return false;
  const threshold = header.length <= 5 ? 1 : header.length <= 10 ? 2 : 3;
  return candidates.some((c) => levenshtein(header, c) <= threshold);
}

// ---------------------------------------------------------------------------
// Field matching against a set of raw headers
// ---------------------------------------------------------------------------

interface RawHeaderMatch {
  rawHeader: string;
  matchType: "exact" | "fuzzy";
}

function matchField(
  rawHeaders: string[],
  synonymKey: SynonymKey,
  exclude: Set<string>,
): RawHeaderMatch | null {
  const fieldSynonyms = SYNONYMS[synonymKey] as FieldSynonyms;
  const { primary, secondary } = fieldSynonyms;
  const candidates = rawHeaders
    .filter((h) => typeof h === "string" && !exclude.has(h))
    .map((h) => ({ raw: h, norm: normalizeHeader(h) }))
    .filter((c) => c.norm !== "");

  // Exact-primary, across every header, before exact-secondary, before any
  // fuzzy matching — so an unambiguous term always wins over an ambiguous
  // one regardless of which column happens to come first.
  for (const { raw, norm } of candidates) {
    if (primary.includes(norm)) return { rawHeader: raw, matchType: "exact" };
  }
  for (const { raw, norm } of candidates) {
    if (secondary.includes(norm)) return { rawHeader: raw, matchType: "exact" };
  }
  for (const { raw, norm } of candidates) {
    if (fuzzyMatch(norm, primary) || fuzzyMatch(norm, secondary)) {
      return { rawHeader: raw, matchType: "fuzzy" };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Value-based structural detection (number format, negative convention)
// ---------------------------------------------------------------------------
// Runs on a column's *sample values*, not headers — this is still fully
// deterministic (regex-based), not an AI call.

/**
 * Classifies each sample value independently (strong signal = an explicit
 * thousands separator; weak signal = a bare decimal marker) and returns the
 * format with the higher score. Independent per-value classification avoids
 * the earlier version's bug where the answer could depend on scan order.
 * Returns null when there's nothing usable to detect from.
 */
export function detectNumberFormat(sampleValues: string[]): NumberFormat | null {
  const values = sampleValues.map((v) => String(v ?? "").trim()).filter((v) => v !== "");
  if (values.length === 0) return null;

  let europeanScore = 0;
  let usScore = 0;
  for (const v of values) {
    if (/\d{1,3}(\.\d{3})+,\d{2}/.test(v)) {
      europeanScore += 2; // e.g. "1.234,56"
    } else if (/\d{1,3}(,\d{3})+\.\d{2}/.test(v)) {
      usScore += 2; // e.g. "1,234.56"
    } else if (/^\(?-?\$?\d+,\d{2}\)?$/.test(v)) {
      europeanScore += 1; // e.g. "45,23"
    } else if (/^\(?-?\$?\d+\.\d{2}\)?$/.test(v)) {
      usScore += 1; // e.g. "45.23"
    }
  }
  if (europeanScore === 0 && usScore === 0) return null;
  return europeanScore > usScore ? "European" : "US";
}

export function detectNegativeConvention(sampleValues: string[]): NegativeConvention {
  const values = sampleValues.map((v) => String(v ?? "").trim()).filter((v) => v !== "");
  if (values.some((v) => /^\(\$?\d/.test(v))) return "parentheses";
  if (values.some((v) => /^-\$?\d/.test(v))) return "leading_minus";
  if (values.some((v) => /\d-$/.test(v))) return "trailing_minus";
  return "none_detected";
}

/**
 * True if every value in the sample is non-negative-looking. Blank cells
 * count as non-negative — expected for split debit/credit columns, where
 * only one side of the pair is populated per row.
 */
function allNonNegative(sampleValues: string[]): boolean {
  return sampleValues.every((raw) => {
    const t = String(raw ?? "").trim();
    if (t === "" || t === "0" || t === "0.00") return true;
    return !/^-/.test(t) && !/^\(/.test(t);
  });
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

function emptyMapping(confidence: ColumnMapping["confidence"], notes: string[]): ColumnMapping {
  return {
    dateColumn: null,
    secondaryDateColumn: null,
    descriptionColumn: null,
    amountType: null,
    amountColumn: null,
    debitColumn: null,
    creditColumn: null,
    typeColumn: null,
    categoryColumn: null,
    balanceColumn: null,
    numberFormat: null,
    negativeConvention: null,
    confidence,
    missingRequiredFields: [...REQUIRED_FIELDS],
    notes,
  };
}

export function matchHeaders(input: HeaderMatcherInput): ColumnMapping {
  try {
    const notes: string[] = [];

    const headers = Array.isArray(input?.headers)
      ? input.headers.filter((h) => typeof h === "string")
      : [];
    if (!input || !Array.isArray(input.headers)) {
      notes.push('Input "headers" was missing or not an array — treated as an empty header set.');
    } else if (headers.length !== input.headers.length) {
      notes.push("Some header entries were not strings and were ignored.");
    }

    const sampleValuesByColumn: Record<string, string[]> =
      input?.sampleValuesByColumn && typeof input.sampleValuesByColumn === "object"
        ? input.sampleValuesByColumn
        : {};

    if (headers.length === 0) {
      notes.push("No headers provided — cannot map any columns.");
      return emptyMapping("low", notes);
    }

    return matchHeadersInternal(headers, sampleValuesByColumn, notes);
  } catch (err) {
    return emptyMapping("low", [
      `Header matching failed unexpectedly (${err instanceof Error ? err.message : String(err)}) — falling back to manual mapping.`,
    ]);
  }
}

function matchHeadersInternal(
  headers: string[],
  sampleValuesByColumn: Record<string, string[]>,
  notes: string[],
): ColumnMapping {
  notes.push(...findDuplicateNormalizedHeaders(headers));

  const used = new Set<string>();

  // --- date: prefer a posted date as primary, transaction date as secondary ---
  const postedMatch = matchField(headers, "postedDate", used);
  const usedForTransactionDate = new Set(used);
  if (postedMatch) usedForTransactionDate.add(postedMatch.rawHeader);
  const transactionMatch = matchField(headers, "transactionDate", usedForTransactionDate);

  let dateColumn: string | null = null;
  let secondaryDateColumn: string | null = null;
  if (postedMatch && transactionMatch) {
    dateColumn = postedMatch.rawHeader;
    secondaryDateColumn = transactionMatch.rawHeader;
    notes.push(
      `Both a posted date ("${dateColumn}") and a transaction date ("${secondaryDateColumn}") were found — using the posted date as primary.`,
    );
  } else if (postedMatch) {
    dateColumn = postedMatch.rawHeader;
  } else if (transactionMatch) {
    dateColumn = transactionMatch.rawHeader;
  }
  if (dateColumn) used.add(dateColumn);
  if (secondaryDateColumn) used.add(secondaryDateColumn);

  // --- description ---
  const descMatch = matchField(headers, "description", used);
  const descriptionColumn = descMatch?.rawHeader ?? null;
  if (descriptionColumn) used.add(descriptionColumn);

  // --- amount shape: split debit/credit takes priority over a single column ---
  const debitMatch = matchField(headers, "debit", used);
  const creditMatch = matchField(headers, "credit", used);

  let amountType: AmountType | null = null;
  let amountColumn: string | null = null;
  let debitColumn: string | null = null;
  let creditColumn: string | null = null;
  let typeColumn: string | null = null;
  let amountMatch: RawHeaderMatch | null = null;
  let typeMatch: RawHeaderMatch | null = null;

  if (debitMatch && creditMatch) {
    amountType = "split_debit_credit";
    debitColumn = debitMatch.rawHeader;
    creditColumn = creditMatch.rawHeader;
    used.add(debitColumn);
    used.add(creditColumn);

    const debitVals = sampleValuesByColumn[debitColumn];
    const creditVals = sampleValuesByColumn[creditColumn];
    if (debitVals === undefined || creditVals === undefined) {
      notes.push(
        `No sample values available for "${debitVals === undefined ? debitColumn : creditColumn}" — skipped sign-convention validation for the debit/credit columns.`,
      );
    } else if (!allNonNegative(debitVals) || !allNonNegative(creditVals)) {
      notes.push(
        "Debit/Credit columns detected but contain unexpected negative values — verify the sign convention before import.",
      );
    }
  } else {
    amountMatch = matchField(headers, "amount", used);
    if (amountMatch) {
      amountColumn = amountMatch.rawHeader;
      used.add(amountColumn);

      typeMatch = matchField(headers, "type", used);
      if (typeMatch) {
        const typeVals = sampleValuesByColumn[typeMatch.rawHeader];
        if (typeVals === undefined) {
          notes.push(
            `Type column "${typeMatch.rawHeader}" found but no sample values were available to check for debit/credit flags — treating amount as single_signed.`,
          );
          amountType = "single_signed";
        } else {
          const looksLikeFlag = typeVals.some((v) =>
            ["debit", "credit", "dr", "cr"].includes(String(v ?? "").trim().toLowerCase()),
          );
          if (looksLikeFlag) {
            amountType = "single_unsigned_with_type_column";
            typeColumn = typeMatch.rawHeader;
            used.add(typeColumn);
          } else {
            amountType = "single_signed";
          }
        }
      } else {
        amountType = "single_signed";
      }
    }
  }

  const categoryMatch = matchField(headers, "category", used);
  const categoryColumn = categoryMatch?.rawHeader ?? null;
  if (categoryColumn) used.add(categoryColumn);

  const balanceMatch = matchField(headers, "balance", used);
  const balanceColumn = balanceMatch?.rawHeader ?? null;
  if (balanceColumn) used.add(balanceColumn);

  // --- number format / negative convention, from values not headers ---
  let numberFormat: NumberFormat | null = null;
  let negativeConvention: NegativeConvention | null = null;
  const referenceColumn = amountColumn ?? debitColumn ?? creditColumn;
  if (referenceColumn) {
    const vals = sampleValuesByColumn[referenceColumn];
    if (!vals || vals.length === 0) {
      notes.push(
        `No sample values available for "${referenceColumn}" — number format and negative-value convention could not be detected.`,
      );
    } else {
      numberFormat = detectNumberFormat(vals);
      negativeConvention = detectNegativeConvention(vals);
    }
  }

  // Flag every fuzzy (non-exact) match so a caller can inspect exactly which
  // fields were guessed, not just the aggregate confidence.
  const fieldMatches: [string, RawHeaderMatch | null][] = [
    ["posted date", postedMatch],
    ["transaction date", transactionMatch],
    ["description", descMatch],
    ["debit", debitMatch],
    ["credit", creditMatch],
    ["amount", amountMatch],
    ["type", typeMatch],
    ["category", categoryMatch],
    ["balance", balanceMatch],
  ];
  let anyFuzzy = false;
  for (const [label, match] of fieldMatches) {
    if (match?.matchType === "fuzzy") {
      anyFuzzy = true;
      notes.push(`"${match.rawHeader}" matched the ${label} field via fuzzy matching, not an exact synonym.`);
    }
  }

  const fieldPresence: Record<(typeof REQUIRED_FIELDS)[number], boolean> = {
    date: dateColumn !== null,
    description: descriptionColumn !== null,
    amount_or_split: amountType !== null,
  };
  const missingRequiredFields = REQUIRED_FIELDS.filter((f) => !fieldPresence[f]);

  const confidence: ColumnMapping["confidence"] =
    missingRequiredFields.length > 0 ? "low" : anyFuzzy ? "medium" : "high";

  return {
    dateColumn,
    secondaryDateColumn,
    descriptionColumn,
    amountType,
    amountColumn,
    debitColumn,
    creditColumn,
    typeColumn,
    categoryColumn,
    balanceColumn,
    numberFormat,
    negativeConvention,
    confidence,
    missingRequiredFields,
    notes,
  };
}
