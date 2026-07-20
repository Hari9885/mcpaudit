import type { Report } from "../types.js";

// shields.io "endpoint" schema: https://shields.io/badges/endpoint-badge
const COLOR: Record<Report["grade"], string> = {
  A: "brightgreen",
  B: "green",
  C: "yellowgreen",
  D: "orange",
  F: "red",
};

export function renderBadge(r: Report): string {
  return JSON.stringify({
    schemaVersion: 1,
    label: "mcpaudit",
    message: `${r.score}/100 (${r.grade})`,
    color: COLOR[r.grade],
  });
}
