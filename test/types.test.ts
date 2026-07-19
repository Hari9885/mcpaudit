import { describe, it, expect } from "vitest";
import type { Finding } from "../src/types.js";

describe("types", () => {
  it("Finding shape compiles and is usable", () => {
    const f: Finding = { ruleId: "sec-01", category: "sec", severity: "error", message: "x" };
    expect(f.ruleId).toBe("sec-01");
  });
});
