import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
describe("fixtures exist", () => {
  it("all three server files present", () => {
    for (const p of ["fixtures/good/server.ts", "fixtures/evil/server.ts", "fixtures/sloppy/server.ts"])
      expect(existsSync(p)).toBe(true);
  });
});
