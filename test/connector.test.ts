import { describe, it, expect } from "vitest";
import { handshake } from "../src/connector.js";

describe("connector", () => {
  it("connects to the good fixture", async () => {
    const h = await handshake("node fixtures/good/server.ts", { timeout: 10000 });
    expect(h.ok).toBe(true);
    await h.close?.();
  });

  it("returns ok:false (no throw) for a nonexistent command", async () => {
    const h = await handshake("node fixtures/does-not-exist.ts", { timeout: 8000 });
    expect(h.ok).toBe(false);
    expect(typeof h.error).toBe("string");
  });
});
