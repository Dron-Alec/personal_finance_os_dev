import { describe, expect, it } from "vitest";
import { compareDateStrings, lastDayOfPreviousMonth, toDateInputValue } from "@/lib/date-utils";

describe("lastDayOfPreviousMonth", () => {
  it("on a month's own last day, returns that day (not the prior month)", () => {
    expect(toDateInputValue(lastDayOfPreviousMonth(new Date(2026, 8, 30)))).toBe("2026-09-30");
  });
  it("mid-month, returns the last completed month's end", () => {
    expect(toDateInputValue(lastDayOfPreviousMonth(new Date(2026, 8, 15)))).toBe("2026-08-31");
  });
  it("a few days into a new month, returns the previous month's end", () => {
    expect(toDateInputValue(lastDayOfPreviousMonth(new Date(2026, 9, 3)))).toBe("2026-09-30");
  });
});

describe("compareDateStrings", () => {
  it("orders ascending and treats equal dates as equal", () => {
    expect(compareDateStrings("2026-08-31", "2026-09-30")).toBeLessThan(0);
    expect(compareDateStrings("2026-09-30", "2026-08-31")).toBeGreaterThan(0);
    expect(compareDateStrings("2026-08-31", "2026-08-31")).toBe(0);
  });
});
