import { describe, it, expect } from "vitest";
import { collect } from "../src/collector.js";
import { probe, runProbeRules } from "../src/prober.js";
import { loadPack } from "../src/rules/patterns.js";

describe("prober", () => {
  it("probes only read-only tools by default; skips others with reason", async () => {
    const { snapshot, client, close } = await collect("node fixtures/evil/server.ts", { timeout: 10000 });
    const probes = await probe(client!, snapshot, { probeUnsafe: false, timeout: 10000 });
    const readNotes = probes.find((p) => p.tool === "read_notes");
    expect(readNotes?.probed).toBe(false);
    expect(readNotes?.skippedReason).toMatch(/read-only/i);
    await close?.();
  });

  it("sloppy crash_me: call takes the server down and surfaces conf-04", async () => {
    const { snapshot, client, close } = await collect("node fixtures/sloppy/server.ts", { timeout: 10000 });
    snapshot.probes = await probe(client!, snapshot, { probeUnsafe: true, timeout: 8000 });
    const f = runProbeRules(snapshot, loadPack());
    expect(f.some((x) => x.ruleId === "conf-04")).toBe(true);
    await close?.();
  });
});
