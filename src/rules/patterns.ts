import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parse } from "yaml";
import type { AuditSnapshot, Finding } from "../types.js";

export interface PatternPack { version: string; updated: string; injection: string[]; secrets: string[]; }

// zero-width spaces/joiners (U+200B-200F), bidi overrides (U+202A-202E),
// word-joiner (U+2060), BOM/zero-width-no-break-space (U+FEFF).
// Built from numeric code points so the pattern is pure-ASCII in source and
// cannot be silently stripped or altered by an editor/formatter.
const C = String.fromCharCode;
const ZERO_WIDTH = new RegExp(
  "[" +
    C(0x200b) + "-" + C(0x200f) +
    C(0x202a) + "-" + C(0x202e) +
    C(0x2060) +
    C(0xfeff) +
  "]"
);

export function loadPack(path?: string): PatternPack {
  const here = dirname(fileURLToPath(import.meta.url));
  // dev: src/rules/ -> ../../rules/patterns.yaml ; built: dist/rules/ -> ../../rules/patterns.yaml
  const p = path ?? join(here, "..", "..", "rules", "patterns.yaml");
  const raw = parse(readFileSync(p, "utf8")) as Partial<PatternPack>;
  return { version: raw.version ?? "", updated: raw.updated ?? "", injection: raw.injection ?? [], secrets: raw.secrets ?? [] };
}

function textFields(s: AuditSnapshot): { target: string; text: string }[] {
  const out: { target: string; text: string }[] = [];
  for (const t of s.tools) {
    if (t.description) out.push({ target: t.name, text: t.description });
    for (const [k, v] of Object.entries(t.inputSchema?.properties ?? {}))
      if (v?.description) out.push({ target: `${t.name}.${k}`, text: v.description });
  }
  for (const r of s.resources) if (r.description) out.push({ target: r.uri, text: r.description });
  for (const p of s.prompts) if (p.description) out.push({ target: p.name, text: p.description });
  return out;
}

export function runPatterns(s: AuditSnapshot, pack: PatternPack): Finding[] {
  const out: Finding[] = [];
  const injRes = pack.injection.map((p) => new RegExp(p, "i"));
  const secRes = pack.secrets.map((p) => new RegExp(p));

  for (const { target, text } of textFields(s)) {
    for (const re of injRes)
      if (re.test(text)) {
        out.push({ ruleId: "sec-01", category: "sec", severity: "error", target,
          message: "Description contains a prompt-injection phrase.", evidence: re.source });
        break;
      }
    if (ZERO_WIDTH.test(text))
      out.push({ ruleId: "sec-02", category: "sec", severity: "error", target,
        message: "Description contains invisible/zero-width or bidi-override characters." });
    for (const re of secRes)
      if (re.test(text)) {
        out.push({ ruleId: "sec-05", category: "sec", severity: "error", target,
          message: "Description contains a secret-shaped token.", evidence: re.source });
        break;
      }
  }
  return out;
}
