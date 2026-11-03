import { describe, expect, it } from "vitest";
import { safeRedirect } from "@/lib/utils";

describe("safeRedirect", () => {
  it("keeps same-origin paths", () => {
    expect(safeRedirect("/settings?tab=1")).toBe("/settings?tab=1");
    expect(safeRedirect("/invite/abc")).toBe("/invite/abc");
  });

  it("rejects off-site and empty targets", () => {
    for (const bad of ["https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", "evil.com", "", null, undefined]) {
      expect(safeRedirect(bad)).toBeNull();
    }
  });
});
