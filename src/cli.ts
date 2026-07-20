#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Command } from "commander";
import { audit } from "./audit.js";
import { renderTerminal } from "./reporters/terminal.js";
import { renderJson } from "./reporters/json.js";
import { renderMarkdown } from "./reporters/markdown.js";

const here = dirname(fileURLToPath(import.meta.url));
const { version } = JSON.parse(readFileSync(join(here, "..", "package.json"), "utf8")) as { version: string };

const program = new Command();
program
  .name("mcpaudit")
  .description("Security, conformance, and quality auditor for MCP servers.")
  .version(version, "-v, --version")
  .option("--stdio <command>", "command that launches the MCP server over stdio")
  .option("--http <url>", "URL of an MCP server (Streamable HTTP, falls back to SSE)")
  .option("--min-score <n>", "exit 1 if score below n", (v) => parseInt(v, 10))
  .option("--json", "output JSON")
  .option("--md", "output markdown")
  .option("--no-probe", "static analysis only")
  .option("--probe-unsafe", "probe ALL tools, not just read-only ones")
  .option("--timeout <ms>", "per-operation timeout", (v) => parseInt(v, 10), 10000)
  .action(async (opts) => {
    if (!opts.stdio === !opts.http) {
      process.stderr.write("Provide exactly one of --stdio <command> or --http <url>.\n");
      process.exit(2);
    }
    const target = opts.stdio ? { kind: "stdio" as const, command: opts.stdio } : { kind: "http" as const, url: opts.http };
    if (opts.probeUnsafe)
      process.stderr.write("\x1b[31m! --probe-unsafe: every tool will be CALLED. Only use on servers you trust.\x1b[0m\n");
    const report = await audit(target, { timeout: opts.timeout, probe: opts.probe !== false, probeUnsafe: !!opts.probeUnsafe });
    const out = opts.json ? renderJson(report) : opts.md ? renderMarkdown(report) : renderTerminal(report);
    process.stdout.write(out + "\n");
    // Explicit exit: a spawned stdio child can leave an open handle that keeps the
    // event loop alive, so rely on the code path rather than natural exit.
    const failed = typeof opts.minScore === "number" && report.score < opts.minScore;
    process.exit(failed ? 1 : 0);
  });
program.parseAsync();
