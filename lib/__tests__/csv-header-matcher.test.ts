import { describe, expect, it } from "vitest";
import {
  detectNegativeConvention,
  detectNumberFormat,
  levenshtein,
  matchHeaders,
  normalizeHeader,
} from "@/lib/import/csv-header-matcher";

// ---------------------------------------------------------------------------
// Real bank formats
// ---------------------------------------------------------------------------
// Header rows below are sourced from bank documentation / independent
// converter tools (bankxlsx.com, open-source parsers) as of Aug 2026, not
// invented. Each block notes how confident that sourcing is. Axos has no
// verified or corroborated source at all, so it's left as `it.todo` rather
// than guessed at.

describe("confirmed bank formats", () => {
  it("Chase credit card (corroborated: bankxlsx.com)", () => {
    const headers = ["Transaction Date", "Post Date", "Description", "Category", "Type", "Amount"];
    const result = matchHeaders({
      headers,
      sampleValuesByColumn: {
        "Transaction Date": ["01/15/2026", "01/16/2026"],
        "Post Date": ["01/16/2026", "01/17/2026"],
        Amount: ["-45.23", "-12.00"],
      },
    });
    expect(["high", "medium"]).toContain(result.confidence);
    expect(result.dateColumn).toBe("Post Date");
    expect(result.secondaryDateColumn).toBe("Transaction Date");
    expect(result.descriptionColumn).toBe("Description");
    expect(result.amountType).toBe("single_signed");
    expect(result.amountColumn).toBe("Amount");
    expect(result.categoryColumn).toBe("Category");
  });

  it("Chase checking (corroborated: bankxlsx.com)", () => {
    const headers = ["Details", "Posting Date", "Description", "Amount", "Type", "Balance", "Check or Slip #"];
    const result = matchHeaders({
      headers,
      sampleValuesByColumn: {
        Amount: ["-45.23", "1200.00"],
        Type: ["ACH_DEBIT", "DEPOSIT"],
      },
    });
    expect(["high", "medium"]).toContain(result.confidence);
    expect(result.dateColumn).toBe("Posting Date");
    expect(result.descriptionColumn).toBe("Description");
    expect(result.amountType).toBe("single_signed"); // "Type" holds categories, not a debit/credit flag
    expect(result.amountColumn).toBe("Amount");
    expect(result.balanceColumn).toBe("Balance");
  });

  it("Citi credit card (corroborated: bankxlsx.com)", () => {
    const headers = ["Status", "Date", "Description", "Debit", "Credit", "Member Name"];
    const result = matchHeaders({
      headers,
      sampleValuesByColumn: {
        Debit: ["45.23", "", "12.00"],
        Credit: ["", "500.00", ""],
      },
    });
    expect(["high", "medium"]).toContain(result.confidence);
    expect(result.dateColumn).toBe("Date");
    expect(result.descriptionColumn).toBe("Description");
    expect(result.amountType).toBe("split_debit_credit");
    expect(result.debitColumn).toBe("Debit");
    expect(result.creditColumn).toBe("Credit");
  });

  it("Citi checking (corroborated: bankxlsx.com)", () => {
    const headers = ["Date", "Description", "Debit", "Credit", "Balance"];
    const result = matchHeaders({
      headers,
      sampleValuesByColumn: { Debit: ["45.23", ""], Credit: ["", "500.00"] },
    });
    expect(["high", "medium"]).toContain(result.confidence);
    expect(result.amountType).toBe("split_debit_credit");
    expect(result.balanceColumn).toBe("Balance");
  });

  it("Capital One credit card (corroborated: bankxlsx.com)", () => {
    const headers = [
      "Transaction Date",
      "Posted Date",
      "Card No.",
      "Description",
      "Category",
      "Debit",
      "Credit",
    ];
    const result = matchHeaders({
      headers,
      sampleValuesByColumn: {
        Debit: ["45.23", ""],
        Credit: ["", "20.00"],
      },
    });
    expect(["high", "medium"]).toContain(result.confidence);
    expect(result.dateColumn).toBe("Posted Date");
    expect(result.secondaryDateColumn).toBe("Transaction Date");
    expect(result.descriptionColumn).toBe("Description");
    expect(result.amountType).toBe("split_debit_credit");
    expect(result.categoryColumn).toBe("Category");
  });

  it("Capital One 360 checking/savings (moderate confidence: multiple secondary sources agree on shape, not exact naming)", () => {
    const headers = ["Transaction Date", "Description", "Amount", "Balance"];
    const result = matchHeaders({
      headers,
      sampleValuesByColumn: { Amount: ["-45.23", "500.00"] },
    });
    expect(["high", "medium"]).toContain(result.confidence);
    expect(result.descriptionColumn).toBe("Description");
    expect(result.amountType).toBe("single_signed");
    expect(result.balanceColumn).toBe("Balance");
  });

  it("Bank of America (best-effort — training-data recollection of the online-banking CSV export, not independently re-verified this session)", () => {
    const headers = ["Date", "Description", "Amount", "Running Bal."];
    const result = matchHeaders({
      headers,
      sampleValuesByColumn: { Amount: ["-45.23", "1200.00"] },
    });
    expect(["high", "medium"]).toContain(result.confidence);
    expect(result.dateColumn).toBe("Date");
    expect(result.descriptionColumn).toBe("Description");
    expect(result.amountType).toBe("single_signed");
    expect(result.balanceColumn).toBe("Running Bal.");
  });

  it("Apple Card (corroborated: kgryte/apple-card-csv, open-source)", () => {
    const headers = ["Date", "Type", "Description", "Daily Cash (%)", "Daily Cash ($)", "Amount"];
    const result = matchHeaders({
      headers,
      sampleValuesByColumn: {
        Amount: ["45.23", "12.00"],
        Type: ["Purchase", "Payment"], // Apple Card's Type is a category, not a debit/credit flag
      },
    });
    expect(["high", "medium"]).toContain(result.confidence);
    expect(result.dateColumn).toBe("Date");
    expect(result.descriptionColumn).toBe("Description");
    expect(result.amountType).toBe("single_signed");
  });

  it("Discover (corroborated: bankxlsx.com)", () => {
    const headers = ["Trans. Date", "Post Date", "Description", "Amount", "Category"];
    const result = matchHeaders({
      headers,
      sampleValuesByColumn: { Amount: ["45.23", "-500.00"] },
    });
    expect(["high", "medium"]).toContain(result.confidence);
    expect(result.dateColumn).toBe("Post Date");
    expect(result.secondaryDateColumn).toBe("Trans. Date");
    expect(result.descriptionColumn).toBe("Description");
    expect(result.amountType).toBe("single_signed");
    expect(result.categoryColumn).toBe("Category");
  });

  it("Wells Fargo (best-effort — WF's raw web-export CSV famously ships with NO header row at all; this assumes a Tier 0 step has already assigned these positional names before Tier 2 runs)", () => {
    const headers = ["Date", "Amount", "*", "*", "Description"];
    const result = matchHeaders({
      headers,
      sampleValuesByColumn: { Amount: ["-45.23", "1200.00"] },
    });
    expect(["high", "medium"]).toContain(result.confidence);
    expect(result.dateColumn).toBe("Date");
    expect(result.descriptionColumn).toBe("Description");
    expect(result.amountType).toBe("single_signed");
  });

  it("PNC (weak confidence — two independent secondary sources loosely agree on this shape; no primary sample seen)", () => {
    const headers = ["Date", "Description", "Withdrawals", "Deposits", "Balance"];
    const result = matchHeaders({
      headers,
      sampleValuesByColumn: { Withdrawals: ["45.23", ""], Deposits: ["", "20.00"] },
    });
    expect(["high", "medium"]).toContain(result.confidence);
    expect(result.amountType).toBe("split_debit_credit");
    expect(result.debitColumn).toBe("Withdrawals");
    expect(result.creditColumn).toBe("Deposits");
  });

  // No verified or corroborated header set could be found for Axos (web
  // search turned up nothing beyond "CSV export exists"). Per instruction,
  // treat as unconfirmed rather than invent one — swap this in once a real
  // sample is available.
  it.todo("Axos — no verified header sample available yet");

  it("Venmo (corroborated: real sample CSV + parser on GitHub — egost/venmo_statement, jbms/finance-dl)", () => {
    const headers = [
      "ID",
      "Datetime",
      "Type",
      "Status",
      "Note",
      "From",
      "To",
      "Amount (total)",
      "Amount (fee)",
      "Funding Source",
      "Destination",
      "Beginning Balance",
      "Ending Balance",
    ];
    const result = matchHeaders({
      headers,
      sampleValuesByColumn: {
        "Amount (total)": ["-12.00", "45.00"],
        Type: ["Payment", "Charge"], // not a debit/credit flag
      },
    });
    expect(result.confidence).toBe("high");
    expect(result.dateColumn).toBe("Datetime");
    expect(result.descriptionColumn).toBe("Note");
    expect(result.amountType).toBe("single_signed");
    expect(result.amountColumn).toBe("Amount (total)");
    expect(result.balanceColumn).toBe("Ending Balance");
  });

  it("American Express (corroborated: jmcameron/amex2qif, an open-source parser tracking real Amex CSV format history — Format 4, May 2022)", () => {
    // This is also the case that motivated splitting synonyms into
    // primary/secondary tiers: Amex has both a real "Description" column
    // and an unrelated "Reference" (transaction ID) column. "Reference" is
    // only a secondary/ambiguous synonym for description, so "Description"
    // wins regardless of which one appears first in the header row.
    const headers = [
      "Date",
      "Description",
      "Amount",
      "Extended Details",
      "Appears On Your Statement As Address",
      "City/State",
      "Zip Code",
      "Country",
      "Reference",
      "Category",
    ];
    const result = matchHeaders({
      headers,
      sampleValuesByColumn: { Amount: ["45.23", "-500.00"] },
    });
    expect(result.confidence).toBe("high");
    expect(result.dateColumn).toBe("Date");
    expect(result.descriptionColumn).toBe("Description");
    expect(result.amountType).toBe("single_signed");
    expect(result.categoryColumn).toBe("Category");
  });

  it("US Bank (moderate-high confidence: multiple independent sources agree)", () => {
    // US Bank's "Transaction" column holds a DEBIT/CREDIT label *and* Amount
    // is already signed — a genuinely ambiguous combination the dictionary
    // deliberately doesn't resolve for "Transaction" (see the module's
    // top-of-file note on this limitation). It's left unmatched, which
    // still produces the correct result here since Amount is already
    // signed.
    const headers = ["Date", "Transaction", "Name", "Memo", "Amount"];
    const result = matchHeaders({
      headers,
      sampleValuesByColumn: { Amount: ["-45.23", "1200.00"] },
    });
    expect(result.confidence).toBe("high");
    expect(result.dateColumn).toBe("Date");
    expect(result.descriptionColumn).toBe("Name");
    expect(result.amountType).toBe("single_signed");
    expect(result.amountColumn).toBe("Amount");
  });

  it("Ally Bank (moderate confidence: single independent source — Tiller)", () => {
    const headers = ["Date", "Time", "Amount", "Type", "Description", "Balance"];
    const result = matchHeaders({
      headers,
      sampleValuesByColumn: {
        Amount: ["-45.23", "1200.00"],
        Type: ["Withdrawal", "Deposit"], // not a debit/credit flag
      },
    });
    expect(result.confidence).toBe("high");
    expect(result.dateColumn).toBe("Date");
    expect(result.descriptionColumn).toBe("Description");
    expect(result.amountType).toBe("single_signed");
    expect(result.balanceColumn).toBe("Balance");
  });

  it("PayPal (moderate confidence — PayPal's export format has changed repeatedly over the years; this is one commonly-cited variant, not a live-verified sample)", () => {
    const headers = ["Date", "Time", "TimeZone", "Name", "Type", "Status", "Currency", "Amount"];
    const result = matchHeaders({
      headers,
      sampleValuesByColumn: {
        Amount: ["-12.00", "45.00"],
        Type: ["Payment", "Refund"], // not a debit/credit flag
      },
    });
    expect(result.confidence).toBe("high");
    expect(result.dateColumn).toBe("Date");
    expect(result.descriptionColumn).toBe("Name");
    expect(result.amountType).toBe("single_signed");
  });

  // Found evidence these institutions offer CSV export, but no header
  // sample was independently verifiable or corroborated by more than one
  // low-quality source — left unconfirmed rather than guessed at.
  it.todo("Navy Federal Credit Union (NFCU) — no verified header sample available yet");
  it.todo("USAA — no verified header sample available yet");
  it.todo("TD Bank — no verified header sample available yet");
  it.todo("Truist — no verified header sample available yet");
  it.todo("Regions Bank — no verified header sample available yet");
  it.todo("Charles Schwab (brokerage) — no verified header sample available yet");
  it.todo("Fidelity (brokerage) — no verified header sample available yet");
  it.todo("SoFi — no verified header sample available yet");
  it.todo("Marcus by Goldman Sachs — no verified header sample available yet (no native CSV export found at all)");
  it.todo("Chime — no verified header sample available yet");
  it.todo("Cash App — no verified header sample available yet");
  it.todo("Robinhood — no verified header sample available yet");
});

// ---------------------------------------------------------------------------
// Date column precedence
// ---------------------------------------------------------------------------

describe("date column precedence", () => {
  it("prefers Posted Date over Transaction Date when both are present", () => {
    const result = matchHeaders({
      headers: ["Transaction Date", "Posted Date", "Description", "Amount"],
      sampleValuesByColumn: {},
    });
    expect(result.dateColumn).toBe("Posted Date");
    expect(result.secondaryDateColumn).toBe("Transaction Date");
    expect(result.notes.some((n) => n.includes("using the posted date as primary"))).toBe(true);
  });

  it("uses the only date column when there's no posted/transaction distinction", () => {
    const result = matchHeaders({
      headers: ["Date", "Description", "Amount"],
      sampleValuesByColumn: {},
    });
    expect(result.dateColumn).toBe("Date");
    expect(result.secondaryDateColumn).toBeNull();
  });

  it("fuzzy-matches a near-miss posted-date header and still prefers it as primary", () => {
    // "Post Dt" is a genuine near-miss (not an exact synonym) for "posted date".
    const result = matchHeaders({
      headers: ["Post Dt", "Transaction Date", "Description", "Amount"],
      sampleValuesByColumn: {},
    });
    expect(result.dateColumn).toBe("Post Dt");
    expect(result.secondaryDateColumn).toBe("Transaction Date");
    expect(result.confidence).toBe("medium");
    expect(result.notes.some((n) => n.includes('"Post Dt" matched the posted date field via fuzzy matching'))).toBe(
      true,
    );
  });

  it("fuzzy-matches an abbreviated transaction-date header", () => {
    const result = matchHeaders({
      headers: ["Trans. Date", "Description", "Amount"],
      sampleValuesByColumn: {},
    });
    expect(result.dateColumn).toBe("Trans. Date");
    expect(result.confidence).toBe("medium");
    expect(
      result.notes.some((n) => n.includes('"Trans. Date" matched the transaction date field via fuzzy matching')),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Amount shape detection
// ---------------------------------------------------------------------------

describe("amount shape detection", () => {
  it("flags unexpected negative values in a split debit/credit pair instead of silently accepting them", () => {
    const result = matchHeaders({
      headers: ["Date", "Description", "Debit", "Credit"],
      sampleValuesByColumn: {
        Debit: ["45.23", "-12.00"], // a negative debit shouldn't happen
        Credit: ["", "20.00"],
      },
    });
    expect(result.amountType).toBe("split_debit_credit");
    expect(
      result.notes.some((n) => n.includes("unexpected negative values")),
    ).toBe(true);
  });

  it("doesn't miscount genuinely empty cells in split debit/credit columns as negative", () => {
    const result = matchHeaders({
      headers: ["Date", "Description", "Debit", "Credit"],
      sampleValuesByColumn: {
        Debit: ["45.23", "", "12.00", ""],
        Credit: ["", "500.00", "", "8.00"],
      },
    });
    expect(result.amountType).toBe("split_debit_credit");
    expect(result.notes.some((n) => n.includes("unexpected negative values"))).toBe(false);
  });

  it("classifies a single amount column + DEBIT/CREDIT type flags as single_unsigned_with_type_column", () => {
    const result = matchHeaders({
      headers: ["Date", "Description", "Amount", "Type"],
      sampleValuesByColumn: {
        Type: ["DEBIT", "CREDIT", "debit"],
      },
    });
    expect(result.amountType).toBe("single_unsigned_with_type_column");
    expect(result.typeColumn).toBe("Type");
  });

  it("falls back to single_signed when the Type column isn't a debit/credit flag", () => {
    const result = matchHeaders({
      headers: ["Date", "Description", "Amount", "Type"],
      sampleValuesByColumn: {
        Type: ["Purchase", "Payment", "Purchase"],
      },
    });
    expect(result.amountType).toBe("single_signed");
    expect(result.typeColumn).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Number format / negative convention (value-based, regex, deterministic)
// ---------------------------------------------------------------------------

describe("number format detection", () => {
  it("detects European number format from sample values", () => {
    expect(detectNumberFormat(["1.234,56", "45,00"])).toBe("European");
  });

  it("detects US number format from sample values", () => {
    expect(detectNumberFormat(["1,234.56", "45.00"])).toBe("US");
  });

  it("is order-independent (a weak US signal followed by a strong European one still resolves European)", () => {
    expect(detectNumberFormat(["45.23", "1.234,56"])).toBe("European");
  });

  it("returns null when there's nothing to detect from", () => {
    expect(detectNumberFormat([])).toBeNull();
    expect(detectNumberFormat(["", "  "])).toBeNull();
  });

  it("flows through matchHeaders on the amount column's samples", () => {
    const result = matchHeaders({
      headers: ["Date", "Description", "Amount"],
      sampleValuesByColumn: { Amount: ["1.234,56", "45,00"] },
    });
    expect(result.numberFormat).toBe("European");
  });
});

describe("negative-value convention detection", () => {
  it("detects parentheses", () => {
    expect(detectNegativeConvention(["($45.23)", "12.00"])).toBe("parentheses");
  });

  it("detects leading minus", () => {
    expect(detectNegativeConvention(["-45.23", "12.00"])).toBe("leading_minus");
  });

  it("detects trailing minus", () => {
    expect(detectNegativeConvention(["45.23-", "12.00"])).toBe("trailing_minus");
  });

  it("flows through matchHeaders on the amount column's samples", () => {
    const result = matchHeaders({
      headers: ["Date", "Description", "Amount"],
      sampleValuesByColumn: { Amount: ["($45.23)", "12.00"] },
    });
    expect(result.negativeConvention).toBe("parentheses");
  });
});

// ---------------------------------------------------------------------------
// Low-confidence / unrecognizable input
// ---------------------------------------------------------------------------

describe("primary vs. secondary synonym priority", () => {
  it("prefers a primary description synonym over a secondary one even when the secondary column comes first", () => {
    // "Reference" is a secondary/ambiguous description synonym. If it were
    // treated equally with "Description", column order alone would decide
    // the winner — here it's deliberately placed first to prove that
    // doesn't happen.
    const result = matchHeaders({
      headers: ["Date", "Reference", "Description", "Amount"],
      sampleValuesByColumn: {},
    });
    expect(result.descriptionColumn).toBe("Description");
  });

  it("falls back to a secondary synonym when no primary one is present", () => {
    const result = matchHeaders({
      headers: ["Date", "Reference", "Amount"],
      sampleValuesByColumn: {},
    });
    expect(result.descriptionColumn).toBe("Reference");
  });
});

describe("unrecognizable headers", () => {
  it("returns low confidence and populated missingRequiredFields for meaningless headers, never a false-positive guess", () => {
    const result = matchHeaders({
      headers: ["Col1", "Col2", "Col3"],
      sampleValuesByColumn: {},
    });
    expect(result.confidence).toBe("low");
    expect(result.missingRequiredFields.length).toBeGreaterThan(0);
    expect(result.dateColumn).toBeNull();
    expect(result.descriptionColumn).toBeNull();
    expect(result.amountType).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Hardening: malformed / edge-case input never crashes
// ---------------------------------------------------------------------------

describe("hardening against malformed input", () => {
  it("handles an empty header array without crashing", () => {
    const result = matchHeaders({ headers: [], sampleValuesByColumn: {} });
    expect(result.confidence).toBe("low");
    expect(result.notes.length).toBeGreaterThan(0);
  });

  it("handles missing sampleValuesByColumn without crashing", () => {
    // @ts-expect-error — exercising the runtime guard for malformed input
    const result = matchHeaders({ headers: ["Date", "Description", "Amount"] });
    expect(result.confidence).not.toBeUndefined();
    expect(result.dateColumn).toBe("Date");
  });

  it("handles completely malformed input (null/undefined) without crashing", () => {
    // @ts-expect-error — exercising the runtime guard for malformed input
    expect(() => matchHeaders(null)).not.toThrow();
    // @ts-expect-error — exercising the runtime guard for malformed input
    expect(() => matchHeaders(undefined)).not.toThrow();
    // @ts-expect-error — exercising the runtime guard for malformed input
    const result = matchHeaders(undefined);
    expect(result.confidence).toBe("low");
  });

  it("handles a non-array headers field without crashing", () => {
    // @ts-expect-error — exercising the runtime guard for malformed input
    const result = matchHeaders({ headers: "Date,Description,Amount", sampleValuesByColumn: {} });
    expect(result.confidence).toBe("low");
  });

  it("flags duplicate normalized headers and prefers the first occurrence", () => {
    const result = matchHeaders({
      headers: ["Date", "date", "Description", "Amount"],
      sampleValuesByColumn: {},
    });
    expect(result.dateColumn).toBe("Date"); // first occurrence wins
    expect(result.notes.some((n) => n.includes('all normalize to "date"'))).toBe(true);
  });

  it("treats a matched column with no sample-value entry as 'no samples available' instead of crashing", () => {
    const result = matchHeaders({
      headers: ["Date", "Description", "Amount"],
      sampleValuesByColumn: {}, // Amount is matched but has no samples
    });
    expect(result.amountColumn).toBe("Amount");
    expect(result.numberFormat).toBeNull();
    expect(result.negativeConvention).toBeNull();
    expect(result.notes.some((n) => n.includes("No sample values available"))).toBe(true);
  });

  it("treats a matched debit/credit pair with no sample-value entries as 'no samples available' instead of crashing", () => {
    const result = matchHeaders({
      headers: ["Date", "Description", "Debit", "Credit"],
      sampleValuesByColumn: {},
    });
    expect(result.amountType).toBe("split_debit_credit");
    expect(result.notes.some((n) => n.includes("skipped sign-convention validation"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

describe("normalizeHeader", () => {
  it("lowercases and strips punctuation/whitespace", () => {
    expect(normalizeHeader("Post Date")).toBe("postdate");
    expect(normalizeHeader("Trans. Date")).toBe("transdate");
    expect(normalizeHeader("Daily Cash (%)")).toBe("dailycash");
  });

  it("strips accents", () => {
    expect(normalizeHeader("Décrire")).toBe("decrire");
  });
});

describe("levenshtein", () => {
  it("computes edit distance", () => {
    expect(levenshtein("date", "date")).toBe(0);
    expect(levenshtein("date", "dat")).toBe(1);
    expect(levenshtein("kitten", "sitting")).toBe(3);
  });
});
