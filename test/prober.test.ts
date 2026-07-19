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

  it("a merely-slow tool (valid AND invalid both time out) is qual-04, not conf-04", () => {
    const snapshot = {
      server: {}, handshakeOk: true, declaredCapabilities: {}, tools: [], resources: [], prompts: [],
      probes: [{
        tool: "slow_op", probed: true,
        validCall: { ok: false, error: "__timeout__", timedOut: true, ms: 10000 },
        invalidCall: { ok: false, jsonRpcError: false, crashed: false, timedOut: true, ms: 10000 },
      }],
    } as const;
    const f = runProbeRules(snapshot as never, loadPack());
    expect(f.some((x) => x.ruleId === "conf-04")).toBe(false);
    expect(f.some((x) => x.ruleId === "qual-04")).toBe(true);
  });
});
