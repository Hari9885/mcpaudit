import { describe, it, expect } from "vitest";
import { aggregate, renderReport } from "../scripts/state-of-mcp-security.mjs";

const fixtureResults = [
  { id: "a", pkg: "pkg-a", runtime: "npm", command: "npx a", ok: true,
    report: { score: 90, grade: "A", findings: [], patternPackVersion: "0.1.0", patternPackUpdated: "2026-01-01",
      snapshot: { server: { name: "a" }, tools: [{ name: "t1" }] } } },
  { id: "b", pkg: "pkg-b", runtime: "pypi", command: "uvx b", ok: true,
    report: { score: 60, grade: "D", patternPackVersion: "0.1.0", patternPackUpdated: "2026-01-01",
      snapshot: { server: { name: "b" }, tools: [{ name: "t1" }, { name: "t2" }] },
      findings: [
        { ruleId: "sec-04", category: "sec", severity: "warn", target: "t1", message: "no destructiveHint" },
        { ruleId: "sec-04", category: "sec", severity: "warn", target: "t2", message: "no destructiveHint" },
        { ruleId: "conf-03", category: "conf", severity: "warn", target: "t1", message: "missing description" },
      ] } },
  { id: "c", pkg: "pkg-c", runtime: "npm", command: "npx c", ok: false, error: "handshake timeout" },
];

describe("aggregate", () => {
  it("computes mean/median/range only over scored (ok) servers", () => {
    const agg = aggregate(fixtureResults);
    expect(agg.scoredCount).toBe(2);
    expect(agg.failedCount).toBe(1);
    expect(agg.mean).toBe(75); // (90 + 60) / 2
    expect(agg.min).toBe(60);
    expect(agg.max).toBe(90);
    expect(agg.gradeCounts).toEqual({ A: 1, B: 0, C: 0, D: 1, F: 0 });
  });

  it("ranks rules by number of distinct servers affected, then by occurrence count", () => {
    const agg = aggregate(fixtureResults);
    expect(agg.topRules[0]).toMatchObject({ ruleId: "sec-04", occurrences: 2, servers: ["b"] });
    expect(agg.topRules.map((r) => r.ruleId)).toContain("conf-03");
  });

  it("returns zeroed stats for an all-failed sample without dividing by zero", () => {
    const agg = aggregate([{ id: "x", ok: false, error: "boom" }]);
    expect(agg).toMatchObject({ mean: 0, median: 0, min: 0, max: 0, scoredCount: 0, failedCount: 1 });
  });
});

describe("renderReport", () => {
  it("includes every server and the failed one in the summary table", () => {
    const agg = aggregate(fixtureResults);
    const md = renderReport(fixtureResults, agg, "2026-01-01");
    expect(md).toContain("pkg-a");
    expect(md).toContain("pkg-b");
    expect(md).toContain("pkg-c");
    expect(md).toContain("unauditable");
    expect(md).toContain("sec-04");
  });
});
