import type { Report } from "../types.js";

const SYM = { error: "✗", warn: "⚠", info: "•" } as const;
const CAT = { conf: "CONFORMANCE", sec: "SECURITY", qual: "QUALITY" } as const;

export function renderTerminal(r: Report): string {
  const s = r.snapshot;
  const lines: string[] = [];
  lines.push(`mcpaudit report — ${s.server.name ?? "unknown server"}`);
  lines.push("─".repeat(40));
  lines.push(`Score: ${r.score}/100 (${r.grade})`);
  const errors = r.findings.filter((f) => f.severity === "error").length;
  const warns = r.findings.filter((f) => f.severity === "warn").length;
  const infos = r.findings.filter((f) => f.severity === "info").length;
  const n = s.tools.length;
  lines.push(`Findings: ${errors} error, ${warns} warn, ${infos} info · ${n} tool${n === 1 ? "" : "s"}`);
  lines.push(`Pattern pack: v${r.patternPackVersion} (${r.patternPackUpdated})`);
  lines.push("");
  for (const cat of ["conf", "sec", "qual"] as const) {
    lines.push(CAT[cat]);
    const fs = r.findings.filter((f) => f.category === cat);
    if (fs.length === 0) lines.push("  ✓ no findings");
    else for (const f of fs) lines.push(`  ${SYM[f.severity]} ${f.message}${f.target ? ` [${f.target}]` : ""}  (${f.ruleId})`);
    lines.push("");
  }
  return lines.join("\n");
}
