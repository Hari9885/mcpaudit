# mcpaudit — Design Spec

Date: 2026-07-19
Status: Approved (brainstorm complete)
Owner: Hari Kumar Reddy (Hari9885)

## One-liner

`npx mcpaudit` — a security, conformance, and quality auditor for MCP servers, built for server authors, with a scored report and a CI gate.

## Problem

MCP servers are installed on trust. Tool descriptions are injected directly into an agent's context, so a malicious or sloppy server can poison the agent (tool-poisoning attacks), crash it, or bloat its context. Thousands of community servers exist; no standard author-side tool checks conformance, security posture, or quality before publishing.

## Positioning (vs. existing tools)

- `mcp-scan` (Invariant Labs, PyPI): security-only, user-side — scans servers already installed in client configs.
- `mcp-auditor` (npm): interaction logger for debugging/compliance.
- npm name `mcp-audit`: abandoned placeholder squat.

mcpaudit is **author-side**: full audit (conformance + security + quality), 0–100 score, CI exit codes, README badge. Analogy: eslint for MCP servers, not antivirus for installed ones.

## Decisions (locked during brainstorm)

- **Language/runtime:** TypeScript / Node. Distribution via `npx mcpaudit`. Built on official `@modelcontextprotocol/sdk` client.
- **npm name:** `mcpaudit` (verified free 2026-07-19; `mcp-audit`/`mcp-auditor`/`mcp-lint` taken).
- **v0.1 scope:** static audit + light dynamic probing (safety-gated). HTTP/SSE transports, GitHub Action, badge service, registry-wide scanning are all post-v0.1.
- **Rules as data where possible:** pattern rules in a YAML pack (community-extendable); structural rules in TS.
- **License:** MIT. Repo: `~/Desktop/HKR/GITHUB_projects/mcpaudit`, GitHub `Hari9885/mcpaudit` (public, at first publish).

## Architecture

```
CLI (commander)
 └─ Connector  — spawns server, stdio transport, SDK Client, hard timeouts
     └─ Collector — initialize result + tools/resources/prompts listings → AuditSnapshot (plain JSON)
         └─ Rule engine — runs all rules against snapshot → Finding[]
         │    ├─ structural rules (TS functions)
         │    └─ pattern rules (YAML pack: regex/threshold vs. text fields)
         └─ Prober (dynamic, gated) — calls selected tools, appends probe data to snapshot, probe rules run after
             └─ Scorer — category weights → 0–100 + grade → exit code vs --min-score
                 └─ Reporters — terminal (default), JSON (--json), markdown (--md)
```

### AuditSnapshot

One plain-JSON object: server info, declared capabilities, protocol version, every tool/resource/prompt with full metadata, plus (if probed) per-tool probe results. Dumpable via `--snapshot <file>`. Future rug-pull diffing consumes two snapshots; v0.1 only produces them.

### Finding

`{ ruleId, category: conf|sec|qual, severity: error|warn|info, message, target (tool/resource name), evidence }`

## CLI interface (v0.1)

```
mcpaudit --stdio "<command to launch server>"   # required in v0.1
  --min-score <n>       # exit 1 if score below n (default: report only)
  --json / --md         # machine/markdown output instead of terminal
  --snapshot <file>     # also write raw AuditSnapshot
  --no-probe            # static only
  --probe-unsafe        # probe ALL tools, not just read-only-annotated (loud warning)
  --timeout <ms>        # per-operation timeout (default 10s, spawn 30s)
```

## Probing safety model

Primary CI user audits **their own** server, so probing is on by default — but scoped:

- Default: probe only tools with `readOnlyHint: true`.
- Everything else: skipped with an info finding ("N tools not probed; run with --probe-unsafe if this is your own server").
- `--probe-unsafe`: probes every tool; prints a red banner first.
- Probe input: minimal schema-valid dummy values generated from the tool's inputSchema (own tiny generator: fill required fields with type-appropriate placeholders; no external faker dependency).
- Each probed tool also gets one deliberately invalid call (wrong-type field) to test error handling.

## Rule pack (v0.1 — 16 rules)

### Conformance
- **conf-01** (error) — initialize handshake completes; declared protocol version parses.
- **conf-02** (error) — every tool inputSchema is valid JSON Schema.
- **conf-03** (warn) — every required parameter has a description.
- **conf-04** (error, probe) — invalid input returns a JSON-RPC error, not a crash/hang.
- **conf-05** (warn) — capabilities declared match what listings return (e.g., declares tools but tools/list empty).

### Security
- **sec-01** (error) — injection phrases in tool/param/resource descriptions (YAML regex pack: "ignore previous", "do not tell the user", "instead of", role-play jailbreak stems, etc.).
- **sec-02** (error) — invisible/zero-width Unicode or RTL-override characters in any description.
- **sec-03** (warn) — verb mismatch: tool name implies read (`get_`, `list_`, `read_`) but description mentions write/delete/send.
- **sec-04** (warn) — tool with write-ish verbs (`write`, `delete`, `create`, `send`, `execute`, `run`) lacks `destructiveHint`/annotations.
- **sec-05** (error) — secret patterns (API-key/token regexes) in descriptions or (probe) echoed in tool outputs.
- **sec-06** (warn, probe) — probed output contains injection phrases (output-poisoning).
- **sec-07** (info) — server exposes >40 tools (context flooding / confusion surface).

### Quality
- **qual-01** (warn) — tool description missing or <10 chars.
- **qual-02** (warn) — tool description >600 chars (context bloat).
- **qual-03** (warn, probe) — response >100KB for dummy input.
- **qual-04** (info, probe) — response latency >5s.

Pattern rules (sec-01, sec-02, sec-05 patterns, qual length bounds) live in `rules/patterns.yaml`. Contributors add a YAML entry + a fixture test.

## Scoring

- Start at 100. error −15, warn −5, info −2, floor 0. Per-rule dedup: a rule fires once per target but caps total deduction per rule at 30 (one bad pattern repeated 20× shouldn't zero an otherwise fine server).
- Grade bands: A ≥90, B ≥80, C ≥70, D ≥60, F below.
- `# ponytail:` note: simple linear scoring, revisit weights only after real-world reports look miscalibrated.

## Error handling

- Server fails to spawn / handshake timeout → report with conf-01 error, score reflects it, exit per `--min-score`; never an unhandled exception.
- Per-call timeouts everywhere; a hanging tool marks conf-04/qual-04 evidence, doesn't hang the audit.
- Malformed listings (non-JSON-Schema, weird fields) are findings, not crashes — the tool's whole job is surviving bad servers.

## Testing

- Three fixture servers in `fixtures/` (tiny TS MCP servers over stdio):
  - `good` — clean server, expects A grade.
  - `evil` — injection phrases, zero-width chars, fake secret, read-named tool that writes; expects F + specific rule hits.
  - `sloppy` — missing descriptions, giant description, crash on bad input; expects C/D + specific hits.
- vitest; every rule asserts against at least one fixture (hit + no-false-positive on `good`).
- CI (GitHub Actions): typecheck + tests + self-dogfood (audit all three fixtures, assert expected grades).

## Non-goals (v0.1)

- HTTP/SSE transports; auth'd servers.
- GitHub Action wrapper + badge service (v0.2).
- Fuzzing beyond one valid + one invalid call; annotation-honesty verification (v0.3).
- Registry-wide scanning / "State of MCP Security" report (v1.0).
- Windows CI (develop on macOS, Node is portable; add Windows runner later if users report issues).

## Milestones

- **W1:** scaffold, connector, collector, conf-01/02/03 + sec-01/02, terminal reporter. Runnable end-to-end on fixtures.
- **W2:** remaining static rules, YAML pattern pack, scorer, `--json`/`--min-score`, fixtures `evil`/`sloppy` complete.
- **W3:** prober + probe rules, README (positioning table, quickstart, badge-of-shame example report), npm publish, r/mcp + awesome-mcp PR.

## Success criteria

- `npx mcpaudit --stdio "node fixtures/evil/server.js"` produces F with sec-01/02/03/05 hits; `good` scores ≥90.
- Audits TalkData's real MCP server without modification.
- Published on npm; ≥1 external user issue/PR within a month of the r/mcp post (real-world signal).
