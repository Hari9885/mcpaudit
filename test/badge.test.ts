import { describe, it, expect } from "vitest";
import { renderBadge } from "../src/reporters/badge.js";
import type { Report } from "../src/types.js";

const report = (score: number, grade: Report["grade"]): Report => ({
  snapshot: { server: {}, handshakeOk: true, declaredCapabilities: {}, tools: [], resources: [], prompts: [], probes: [] },
  findings: [], score, grade,
});

describe("badge reporter", () => {
  it("emits a valid shields endpoint object", () => {
    const b = JSON.parse(renderBadge(report(88, "B")));
    expect(b.schemaVersion).toBe(1);
    expect(b.label).toBe("mcpaudit");
    expect(b.message).toBe("88/100 (B)");
    expect(b.color).toBe("green");
  });

  it("maps grade to color", () => {
    const color = (g: Report["grade"]) => JSON.parse(renderBadge(report(0, g))).color;
    expect(color("A")).toBe("brightgreen");
    expect(color("F")).toBe("red");
  });
});
