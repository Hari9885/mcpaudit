#!/usr/bin/env node
// Runs mcpaudit against a curated set of real, publicly-published MCP servers and
// produces an aggregate "State of MCP Security" report (markdown + json).
//
// Every target here is an official reference server (modelcontextprotocol org on
// npm, or the mcp-server-* PyPI packages from the same reference-servers repo) that
// needs no API key/auth, so this can run unattended from a clean machine. Probing
// stays on mcpaudit's default safety gate (readOnlyHint:true tools only) — nothing
// destructive is ever called.
//
// ponytail: sample is 8 official reference servers, not the whole registry (no
// public MCP registry index exists to crawl yet). Add entries to TARGETS to widen
// the sample once one does.
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { audit } from "../dist/audit.js";
import { renderMarkdown as renderServerMarkdown } from "../dist/reporters/markdown.js";

// Side-effecting (spawns git, touches /tmp) — only called from main(), never on import,
// so `aggregate`/`renderReport` stay importable in tests without a filesystem/git dependency.
function buildTargets() {
  const workdir = mkdtempSync(join(tmpdir(), "mcpaudit-scan-"));
  const gitRepo = join(workdir, "git-repo");
  execFileSync("git", ["init", "-q", gitRepo]);
  execFileSync("git", ["-C", gitRepo, "commit", "--allow-empty", "-q", "-m", "init"], {
    env: { ...process.env, GIT_AUTHOR_NAME: "mcpaudit", GIT_AUTHOR_EMAIL: "mcpaudit@local",
      GIT_COMMITTER_NAME: "mcpaudit", GIT_COMMITTER_EMAIL: "mcpaudit@local" },
  });
  return [
    { id: "server-everything", pkg: "@modelcontextprotocol/server-everything", runtime: "npm",
      command: "npx -y @modelcontextprotocol/server-everything" },
    { id: "server-filesystem", pkg: "@modelcontextprotocol/server-filesystem", runtime: "npm",
      command: `npx -y @modelcontextprotocol/server-filesystem ${workdir}` },
    { id: "server-memory", pkg: "@modelcontextprotocol/server-memory", runtime: "npm",
      command: "npx -y @modelcontextprotocol/server-memory" },
    { id: "server-sequential-thinking", pkg: "@modelcontextprotocol/server-sequential-thinking", runtime: "npm",
      command: "npx -y @modelcontextprotocol/server-sequential-thinking" },
    { id: "mcp-server-fetch", pkg: "mcp-server-fetch", runtime: "pypi", command: "uvx mcp-server-fetch" },
    { id: "mcp-server-time", pkg: "mcp-server-time", runtime: "pypi", command: "uvx mcp-server-time" },
    { id: "mcp-server-git", pkg: "mcp-server-git", runtime: "pypi",
      command: `uvx mcp-server-git --repository ${gitRepo}` },
    { id: "mcp-server-sqlite", pkg: "mcp-server-sqlite", runtime: "pypi",
      command: `uvx mcp-server-sqlite --db-path ${join(workdir, "test.db")}` },
  ];
}

const PER_TARGET_TIMEOUT_MS = 90_000; // first run of each pulls a fresh package over the network
const RULE_TABLE = {
  "conf-01": "Server completes the MCP initialize handshake",
  "conf-02": "Every tool inputSchema is valid JSON Schema",
  "conf-03": "Required parameters have descriptions",
  "conf-04": "Invalid input returns a JSON-RPC error, not a crash/hang (probe)",
  "conf-05": "Declared capabilities match what listings return",
  "sec-01": "No prompt-injection phrases in descriptions",
  "sec-02": "No invisible/zero-width or bidi-override characters",
  "sec-03": "Read-named tools don't secretly write/delete",
  "sec-04": "State-changing tools carry a destructiveHint",
  "sec-05": "No secret-shaped tokens in descriptions or outputs",
  "sec-06": "Tool output doesn't contain injection phrases (probe)",
  "sec-07": "Tool count isn't so large it floods the agent",
  "qual-01": "Tool descriptions exist and are meaningful",
  "qual-02": "Descriptions aren't bloated (>600 chars)",
  "qual-03": "Responses aren't oversized (>100KB) (probe)",
  "qual-04": "Responses aren't slow (>5s) (probe)",
};

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label}: timed out after ${ms}ms`)), ms)),
  ]);
}

async function runTarget(t, i, n) {
  process.stderr.write(`[${i + 1}/${n}] auditing ${t.id} (${t.command})...\n`);
  try {
    const report = await withTimeout(
      audit(t.command, { timeout: 10_000, probe: true, probeUnsafe: false }),
      PER_TARGET_TIMEOUT_MS,
      t.id,
    );
    process.stderr.write(`  -> ${report.score}/100 (${report.grade}), ${report.findings.length} findings\n`);
    return { ...t, ok: true, report };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    process.stderr.write(`  -> FAILED: ${message}\n`);
    return { ...t, ok: false, error: message };
  }
}

export function aggregate(results) {
  const scored = results.filter((r) => r.ok);
  const gradeCounts = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  const ruleFreq = new Map(); // ruleId -> { servers: Set, occurrences: number, severity, category }
  for (const r of scored) {
    gradeCounts[r.report.grade]++;
    for (const f of r.report.findings) {
      const e = ruleFreq.get(f.ruleId) ?? { servers: new Set(), occurrences: 0, severity: f.severity, category: f.category };
      e.servers.add(r.id);
      e.occurrences++;
      ruleFreq.set(f.ruleId, e);
    }
  }
  const scores = scored.map((r) => r.report.score).sort((a, b) => a - b);
  const mean = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const median = scores.length ? scores[Math.floor(scores.length / 2)] : 0;
  const topRules = [...ruleFreq.entries()]
    .sort((a, b) => b[1].servers.size - a[1].servers.size || b[1].occurrences - a[1].occurrences)
    .map(([ruleId, e]) => ({ ruleId, ...e, servers: [...e.servers] }));
  return { mean, median, min: scores[0] ?? 0, max: scores[scores.length - 1] ?? 0, gradeCounts, topRules, scoredCount: scored.length, failedCount: results.length - scored.length };
}

export function renderReport(results, agg, date) {
  const lines = [];
  lines.push(`# State of MCP Security — ${date}`, "");
  lines.push(
    `A snapshot audit of ${results.length} official Model Context Protocol reference servers, run with ` +
    "[mcpaudit](https://github.com/Hari9885/mcpaudit) — an open-source security/conformance/quality " +
    "linter for MCP servers. Every target is a maintained reference implementation (npm `@modelcontextprotocol/*` " +
    "or the matching PyPI `mcp-server-*` packages) that needs no API key, so the scan is fully reproducible " +
    "offline-of-secrets with `node scripts/state-of-mcp-security.mjs`.", "",
  );
  lines.push(
    "**Sample size caveat:** this is 8 officially-maintained reference servers, not the full public MCP " +
    "ecosystem — there is no canonical registry to crawl yet. Reference servers are written by protocol " +
    "maintainers, so treat these scores as a *best case* floor, not a representative average of third-party " +
    "servers in the wild.", "",
  );

  lines.push("## Summary", "");
  lines.push(`- Servers scanned: **${results.length}** (${agg.scoredCount} scored, ${agg.failedCount} failed to audit)`);
  lines.push(`- Mean score: **${agg.mean}/100** · Median: **${agg.median}/100** · Range: ${agg.min}–${agg.max}`);
  lines.push(`- Grade distribution: A=${agg.gradeCounts.A} B=${agg.gradeCounts.B} C=${agg.gradeCounts.C} D=${agg.gradeCounts.D} F=${agg.gradeCounts.F}`, "");

  lines.push("## Per-server results", "");
  lines.push("| Server | Runtime | Score | Grade | Findings | Tools |", "|---|---|---|---|---|---|");
  const sorted = [...results].sort((a, b) => (b.ok ? b.report.score : -1) - (a.ok ? a.report.score : -1));
  for (const r of sorted) {
    if (r.ok) {
      lines.push(`| ${r.pkg} | ${r.runtime} | ${r.report.score}/100 | ${r.report.grade} | ${r.report.findings.length} | ${r.report.snapshot.tools.length} |`);
    } else {
      lines.push(`| ${r.pkg} | ${r.runtime} | — | F (unauditable) | — | — |`);
    }
  }
  lines.push("");

  lines.push("## Most common findings across the sample", "");
  if (agg.topRules.length === 0) {
    lines.push("No findings on any server in the sample.", "");
  } else {
    lines.push("| Rule | Category | Sev | Check | Servers affected | Total occurrences |", "|---|---|---|---|---|---|");
    for (const t of agg.topRules) {
      lines.push(`| ${t.ruleId} | ${t.category} | ${t.severity} | ${RULE_TABLE[t.ruleId] ?? ""} | ${t.servers.length}/${agg.scoredCount} | ${t.occurrences} |`);
    }
    lines.push("");
  }

  lines.push("## Per-server detail", "");
  for (const r of results) {
    if (r.ok) {
      lines.push(renderServerMarkdown(r.report), "");
    } else {
      lines.push(`## mcpaudit: ${r.id} — unauditable`, "", `Error: ${r.error}`, "");
    }
  }

  lines.push("---", "",
    `Generated with mcpaudit \`${results.length}\`-target scan on ${date}. ` +
    "Run your own server through it: `npx @hari9885/mcpaudit --stdio \"<your server command>\"`.");
  return lines.join("\n");
}

async function main() {
  const targets = buildTargets();
  const results = [];
  for (let i = 0; i < targets.length; i++) results.push(await runTarget(targets[i], i, targets.length));
  const agg = aggregate(results);
  const date = new Date().toISOString().slice(0, 10);

  const md = renderReport(results, agg, date);
  const jsonOut = JSON.stringify({ date, results: results.map((r) => r.ok
    ? { id: r.id, pkg: r.pkg, runtime: r.runtime, command: r.command, score: r.report.score, grade: r.report.grade, findings: r.report.findings, tools: r.report.snapshot.tools.length }
    : { id: r.id, pkg: r.pkg, runtime: r.runtime, command: r.command, error: r.error }), aggregate: { ...agg, topRules: agg.topRules.map((t) => ({ ...t })) } }, null, 2);

  const mdPath = join(process.cwd(), "docs", "reports", `state-of-mcp-security-${date}.md`);
  const jsonPath = join(process.cwd(), "docs", "reports", `state-of-mcp-security-${date}.json`);
  writeFileSync(mdPath, md);
  writeFileSync(jsonPath, jsonOut);
  process.stderr.write(`\nWrote ${mdPath}\nWrote ${jsonPath}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();
