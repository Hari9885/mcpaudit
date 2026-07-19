import { describe, it, expect } from "vitest";
import { audit } from "../src/audit.js";

describe("audit orchestrator", () => {
  it("good fixture scores A", async () => {
    const r = await audit("node fixtures/good/server.ts", { timeout: 10000, probe: true, probeUnsafe: false });
    expect(r.grade).toBe("A");
    expect(r.score).toBeGreaterThanOrEqual(90);
  });
  it("evil fixture scores F with sec findings", async () => {
    const r = await audit("node fixtures/evil/server.ts", { timeout: 10000, probe: true, probeUnsafe: false });
    expect(r.grade).toBe("F");
    const ids = new Set(r.findings.map((f) => f.ruleId));
    for (const id of ["sec-01", "sec-02", "sec-03", "sec-05"]) expect(ids.has(id)).toBe(true);
  });
  it("exposes pattern pack version", async () => {
    const r = await audit("node fixtures/good/server.ts", { timeout: 10000, probe: false, probeUnsafe: false });
    expect(r.patternPackVersion).toBe("0.1.0");
  });
});
