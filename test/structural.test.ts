import { describe, it, expect } from "vitest";
import { collect } from "../src/collector.js";
import { runStructural } from "../src/rules/structural.js";

const ids = (fs: { ruleId: string }[]) => new Set(fs.map((f) => f.ruleId));

describe("structural rules", () => {
  it("good fixture triggers no error-severity structural findings", async () => {
    const { snapshot, close } = await collect("node fixtures/good/server.ts", { timeout: 10000 });
    const f = runStructural(snapshot);
    expect(f.filter((x) => x.severity === "error")).toEqual([]);
    await close?.();
  });

  it("evil fixture: read-named tool that writes triggers sec-03 and sec-04", async () => {
    const { snapshot, close } = await collect("node fixtures/evil/server.ts", { timeout: 10000 });
    const f = runStructural(snapshot);
    expect(ids(f).has("sec-03")).toBe(true);
    expect(ids(f).has("sec-04")).toBe(true);
    await close?.();
  });

  it("sloppy fixture: missing + oversized descriptions trigger qual-01 and qual-02", async () => {
    const { snapshot, close } = await collect("node fixtures/sloppy/server.ts", { timeout: 10000 });
    const f = runStructural(snapshot);
    expect(ids(f).has("qual-01")).toBe(true);
    expect(ids(f).has("qual-02")).toBe(true);
    await close?.();
  });

  it("handshake failure yields conf-01 error", () => {
    const f = runStructural({ handshakeOk: false, handshakeError: "x", server: {}, declaredCapabilities: {}, tools: [], resources: [], prompts: [], probes: [] });
    expect(f.find((x) => x.ruleId === "conf-01")?.severity).toBe("error");
  });
});
