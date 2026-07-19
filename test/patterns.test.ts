import { describe, it, expect } from "vitest";
import { collect } from "../src/collector.js";
import { loadPack, runPatterns } from "../src/rules/patterns.js";

const ids = (fs: { ruleId: string }[]) => new Set(fs.map((f) => f.ruleId));

describe("pattern rules", () => {
  const pack = loadPack();

  it("evil fixture triggers sec-01, sec-02, sec-05", async () => {
    const { snapshot, close } = await collect("node fixtures/evil/server.ts", { timeout: 10000 });
    const f = runPatterns(snapshot, pack);
    expect(ids(f).has("sec-01")).toBe(true);
    expect(ids(f).has("sec-02")).toBe(true);
    expect(ids(f).has("sec-05")).toBe(true);
    await close?.();
  });

  it("good fixture triggers no pattern findings", async () => {
    const { snapshot, close } = await collect("node fixtures/good/server.ts", { timeout: 10000 });
    expect(runPatterns(snapshot, pack)).toEqual([]);
    await close?.();
  });

  it("pack exposes version and updated date", () => {
    expect(pack.version).toBe("0.1.0");
    expect(pack.updated).toBe("2026-07-19");
  });
});
