import { describe, expect, it } from "vitest";
import { cleanVal, findCol, findHeaderRow, parseCsvForBank } from "@/lib/csv-parsing";

describe("cleanVal", () => {
  it("strips $ and , and parses floats", () => {
    expect(cleanVal("$1,234.56")).toBe(1234.56);
    expect(cleanVal("-42.10")).toBe(-42.1);
  });
  it("treats blank/nan/--/none as 0", () => {
    expect(cleanVal("")).toBe(0);
    expect(cleanVal("nan")).toBe(0);
    expect(cleanVal("NaN")).toBe(0);
    expect(cleanVal("--")).toBe(0);
    expect(cleanVal("none")).toBe(0);
    expect(cleanVal(undefined)).toBe(0);
  });
  it("returns 0 for unparseable input", () => {
    expect(cleanVal("abc")).toBe(0);
  });
});

describe("findCol", () => {
  it("matches case-insensitively, first keyword with a match wins", () => {
    const cols = ["Trans Date", "Description", "Amount"];
    expect(findCol(cols, ["Date", "Trans Date"])).toBe("Trans Date");
    expect(findCol(cols, ["amount"])).toBe("Amount");
    expect(findCol(cols, ["Payee"])).toBeNull();
  });
});

describe("findHeaderRow", () => {
  it("finds the header row within the first 25 lines", () => {
    const lines = ["Account Summary", "Generated 1/1/2026", "Date,Description,Amount"];
    expect(findHeaderRow(lines)).toBe(2);
  });
  it("defaults to 0 when no marker is found", () => {
    expect(findHeaderRow(["foo,bar,baz"])).toBe(0);
  });
});

describe("parseCsvForBank", () => {
  it("Citi Checking: uses Debit/Credit columns when present (credit - debit)", () => {
    const csv = "Date,Description,Debit,Credit\n01/15/2026,COSTCO WHOLESALE,54.32,\n01/16/2026,PAYROLL DEPOSIT,,1500.00";
    const txs = parseCsvForBank("Citi Checking", csv);
    expect(txs).toHaveLength(2);
    expect(txs[0]).toMatchObject({ description: "COSTCO WHOLESALE", amount: -54.32 });
    expect(txs[1]).toMatchObject({ description: "PAYROLL DEPOSIT", amount: 1500 });
  });

  it("Citi Credit: falls back to a single Amount column", () => {
    const csv = "Date,Description,Amount\n02/01/2026,CHIPOTLE,-18.42";
    const txs = parseCsvForBank("Citi Credit", csv);
    expect(txs).toEqual([
      { date: "2026-02-01", description: "CHIPOTLE", amount: -18.42, bank: "Citi Credit" },
    ]);
  });

  it("Discover: negates the Amount column (positive charge -> negative expense)", () => {
    const csv = "Trans. Date,Post Date,Description,Amount,Category\n03/05/2026,03/06/2026,AMAZON,42.10,Shopping";
    const txs = parseCsvForBank("Discover", csv);
    expect(txs[0].amount).toBe(-42.1);
  });

  it("Discover: a payment (negative amount) becomes a positive credit", () => {
    const csv = "Trans. Date,Post Date,Description,Amount,Category\n03/10/2026,03/11/2026,PAYMENT THANK YOU,-200.00,Payment";
    const txs = parseCsvForBank("Discover", csv);
    expect(txs[0].amount).toBe(200);
  });

  it("Wells Fargo / Chase / BofA / Axos / US Bank / Ally / Capital One 360 / Venmo / PayPal / Apple Card: uses Amount as-is", () => {
    const csv = "Date,Amount,Description\n04/01/2026,-75.00,SHELL OIL\n04/02/2026,2000.00,DIRECT DEPOSIT";
    for (const bank of [
      "Wells Fargo Checking",
      "Chase Credit",
      "Bank of America Checking",
      "Axos Checking",
      "US Bank",
      "Ally Bank",
      "Capital One 360",
      "Venmo",
      "PayPal",
      "Apple Card",
    ] as const) {
      const txs = parseCsvForBank(bank, csv);
      expect(txs[0].amount).toBe(-75);
      expect(txs[1].amount).toBe(2000);
    }
  });

  it("American Express: negates the Amount column, same convention as Discover", () => {
    const csv = "Date,Description,Amount\n07/01/2026,WHOLE FOODS,52.10\n07/02/2026,AUTOPAY PAYMENT,-500.00";
    const txs = parseCsvForBank("American Express", csv);
    expect(txs[0].amount).toBe(-52.1);
    expect(txs[1].amount).toBe(500);
  });

  it("PNC: uses Withdrawals/Deposits as a debit/credit split", () => {
    const csv =
      "Date,Description,Withdrawals,Deposits\n08/01/2026,GROCERY STORE,45.00,\n08/02/2026,PAYCHECK,,1200.00";
    const txs = parseCsvForBank("PNC", csv);
    expect(txs[0].amount).toBe(-45);
    expect(txs[1].amount).toBe(1200);
  });

  it("Capital One Credit: uses Debit/Credit as a split, prefers a date column over the dual Transaction/Posted pair", () => {
    const csv =
      "Transaction Date,Posted Date,Description,Category,Debit,Credit\n09/01/2026,09/02/2026,TARGET,Shopping,64.20,\n09/03/2026,09/04/2026,REFUND,Shopping,,20.00";
    const txs = parseCsvForBank("Capital One Credit", csv);
    expect(txs[0].amount).toBe(-64.2);
    expect(txs[1].amount).toBe(20);
  });

  it("Venmo: finds the description via the Note column", () => {
    const csv = "ID,Datetime,Type,Note,Amount (total)\n1,10/01/2026 10:00,Payment,Coffee with friend,-12.50";
    const txs = parseCsvForBank("Venmo", csv);
    expect(txs).toHaveLength(1);
    expect(txs[0]).toMatchObject({ description: "Coffee with friend", amount: -12.5 });
  });

  it("skips a preamble before the real header row", () => {
    const csv = [
      "MY BANK",
      "Account ending in 1234",
      "",
      "Date,Description,Amount",
      "05/01/2026,TARGET,-32.19",
    ].join("\n");
    const txs = parseCsvForBank("Axos Checking", csv);
    expect(txs).toEqual([
      { date: "2026-05-01", description: "TARGET", amount: -32.19, bank: "Axos Checking" },
    ]);
  });

  it("skips rows with an unparseable date", () => {
    const csv = "Date,Description,Amount\nnot-a-date,TARGET,-10.00\n06/01/2026,COSTCO,-99.99";
    const txs = parseCsvForBank("Chase Checking", csv);
    expect(txs).toHaveLength(1);
    expect(txs[0].description).toBe("COSTCO");
  });

  it("returns [] when date/description columns can't be found", () => {
    const csv = "Foo,Bar,Baz\n1,2,3";
    expect(parseCsvForBank("Chase Checking", csv)).toEqual([]);
  });
});
