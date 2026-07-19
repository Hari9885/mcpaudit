import { describe, it, expect } from "vitest";
import { collect } from "../src/collector.js";

describe("collector", () => {
  it("collects tools from the good fixture", async () => {
    const { snapshot, close } = await collect("node fixtures/good/server.ts", { timeout: 10000 });
    expect(snapshot.handshakeOk).toBe(true);
    expect(snapshot.tools.map((t) => t.name)).toContain("get_weather");
    const w = snapshot.tools.find((t) => t.name === "get_weather")!;
    expect(w.description).toBeTruthy();
    expect(w.annotations?.readOnlyHint).toBe(true);
    await close?.();
  });

  it("returns handshakeOk:false for a bad command without throwing", async () => {
    const { snapshot } = await collect("node fixtures/nope.ts", { timeout: 8000 });
    expect(snapshot.handshakeOk).toBe(false);
    expect(snapshot.tools).toEqual([]);
  });
});
