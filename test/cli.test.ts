import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";

describe("cli", () => {
  it("builds and exits non-zero on evil fixture under --min-score", () => {
    execFileSync("npm", ["run", "build"], { stdio: "ignore" });
    let code = 0, out = "";
    try {
      out = execFileSync("node", ["dist/cli.js", "--stdio", "node fixtures/evil/server.ts", "--min-score", "80"], { encoding: "utf8" });
    } catch (e) {
      const err = e as { status?: number; stdout?: string };
      code = err.status ?? 0;
      out = err.stdout ?? "";
    }
    expect(code).toBe(1);
    expect(out).toMatch(/SECURITY/);
  });
});
