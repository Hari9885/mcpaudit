import { describe, it, expect, afterAll } from "vitest";
import { startServer } from "../fixtures/good-http/server.js";
import { audit } from "../src/audit.js";
import { collect } from "../src/collector.js";

let server: { url: string; close: () => Promise<void> };

afterAll(async () => { await server?.close(); });

describe("http transport", () => {
  it("connects to a Streamable HTTP server and collects its tools", async () => {
    server = await startServer();
    const { snapshot, close } = await collect({ kind: "http", url: server.url }, { timeout: 10000 });
    expect(snapshot.handshakeOk).toBe(true);
    expect(snapshot.tools.map((t) => t.name)).toContain("get_weather");
    await close?.();
  });

  it("audits an HTTP server end to end (clean server scores A)", async () => {
    const r = await audit({ kind: "http", url: server.url }, { timeout: 10000, probe: true, probeUnsafe: false });
    expect(r.grade).toBe("A");
    expect(r.score).toBeGreaterThanOrEqual(90);
  });

  it("returns handshakeOk:false (no throw) for a dead URL", async () => {
    const { snapshot } = await collect({ kind: "http", url: "http://127.0.0.1:1/mcp" }, { timeout: 5000 });
    expect(snapshot.handshakeOk).toBe(false);
  });

  it("a dead server scores 0/F so it cannot pass a CI gate", async () => {
    const r = await audit({ kind: "http", url: "http://127.0.0.1:1/mcp" }, { timeout: 5000, probe: false, probeUnsafe: false });
    expect(r.grade).toBe("F");
    expect(r.score).toBe(0);
  });
});
