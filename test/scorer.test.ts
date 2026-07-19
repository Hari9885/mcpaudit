import { describe, it, expect } from "vitest";
import { score } from "../src/scorer.js";
import type { Finding } from "../src/types.js";

const f = (ruleId: string, severity: Finding["severity"], target?: string): Finding =>
  ({ ruleId, severity, category: "sec", message: "m", target });

describe("scorer", () => {
  it("no findings = 100 / A", () => {
    expect(score([])).toEqual({ score: 100, grade: "A" });
  });
  it("one error = 85 / B", () => {
    expect(score([f("sec-01", "error")])).toEqual({ score: 85, grade: "B" });
  });
  it("two distinct warnings = 90 / A (boundary is inclusive)", () => {
    expect(score([f("qual-01", "warn", "a"), f("qual-02", "warn", "b")])).toEqual({ score: 90, grade: "A" });
  });
  it("per-rule deduction caps at 30", () => {
    const many = Array.from({ length: 10 }, (_, i) => f("sec-01", "error", `t${i}`)); // 10*15=150 uncapped -> capped 30
    expect(score(many).score).toBe(70);
  });
  it("floors at 0 for many distinct error rules", () => {
    const rules = Array.from({ length: 10 }, (_, i) => f(`r${i}`, "error", "t")); // 10 distinct *15 = 150 -> floor 0
    expect(score(rules).score).toBe(0);
    expect(score(rules).grade).toBe("F");
  });
});
