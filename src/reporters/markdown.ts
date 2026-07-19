import type { Report } from "../types.js";
export function renderMarkdown(r: Report): string {
  const lines = [`## mcpaudit: ${r.snapshot.server.name ?? "server"} — ${r.score}/100 (${r.grade})`, "",
    `Pattern pack v${r.patternPackVersion} (${r.patternPackUpdated})`, "",
    "| Rule | Sev | Target | Message |", "|---|---|---|---|"];
  for (const f of r.findings) lines.push(`| ${f.ruleId} | ${f.severity} | ${f.target ?? ""} | ${f.message} |`);
  if (r.findings.length === 0) lines.push("| — | — | — | No findings ✓ |");
  return lines.join("\n");
}
