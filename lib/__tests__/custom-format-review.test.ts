import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BANK_FORMATS } from "@/lib/constants";

// 0025 reserves built-in names in SQL (it has to — clients can insert via
// PostgREST directly). This fails when a new built-in is added without
// reserving it there too; fix with a new migration that redefines the check.
describe("custom_bank_formats_name_not_builtin", () => {
  it("reserves exactly the built-in formats", () => {
    const sql = readFileSync("supabase/migrations/0025_custom_format_review.sql", "utf8");
    const list = sql.match(/not in \(([^)]*)\)/)![1];
    const reserved = [...list.matchAll(/'([a-z0-9]+)'/g)].map((m) => m[1]).sort();
    const builtins = BANK_FORMATS.map((f) => f.toLowerCase().replace(/[^a-z0-9]/g, "")).sort();
    expect(reserved).toEqual(builtins);
  });
});
