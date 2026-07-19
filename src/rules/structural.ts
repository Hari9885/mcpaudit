import type { AuditSnapshot, Finding, JsonSchema } from "../types.js";

const READ_VERBS = /^(get|list|read|fetch|search|find|show|view)[_A-Z]/;
const WRITE_WORDS = /\b(write|writes|delete|deletes|remove|removes|create|creates|send|sends|update|updates|execute|executes|run|runs|drop|drops|overwrite|overwrites)\b/i;
const WRITEISH_NAME = /(write|delete|create|send|update|execute|run|remove|drop)/i;

function isValidJsonSchema(s?: JsonSchema): boolean {
  if (!s) return true;
  if (typeof s !== "object") return false;
  if (s.type !== undefined && typeof s.type !== "string") return false;
  if (s.properties !== undefined && typeof s.properties !== "object") return false;
  return true;
}

export function runStructural(s: AuditSnapshot): Finding[] {
  const out: Finding[] = [];

  // conf-01: handshake
  if (!s.handshakeOk) {
    out.push({ ruleId: "conf-01", category: "conf", severity: "error",
      message: "Server failed to complete the MCP initialize handshake.", evidence: s.handshakeError });
    return out;
  }

  // conf-05: declared caps vs listings
  if ((s.declaredCapabilities as { tools?: unknown })?.tools && s.tools.length === 0)
    out.push({ ruleId: "conf-05", category: "conf", severity: "warn",
      message: "Server declares 'tools' capability but tools/list returned none." });

  // sec-07: tool flooding
  if (s.tools.length > 40)
    out.push({ ruleId: "sec-07", category: "sec", severity: "info",
      message: `Server exposes ${s.tools.length} tools (>40); large surface can confuse agents.` });

  for (const t of s.tools) {
    const desc = t.description ?? "";

    // conf-02: schema validity
    if (!isValidJsonSchema(t.inputSchema))
      out.push({ ruleId: "conf-02", category: "conf", severity: "error", target: t.name,
        message: "Tool inputSchema is not valid JSON Schema." });

    // conf-03: required params documented
    for (const req of t.inputSchema?.required ?? []) {
      const p = t.inputSchema?.properties?.[req];
      if (!p?.description)
        out.push({ ruleId: "conf-03", category: "conf", severity: "warn", target: t.name,
          message: `Required parameter "${req}" has no description.` });
    }

    // qual-01: missing / tiny description
    if (desc.trim().length < 10)
      out.push({ ruleId: "qual-01", category: "qual", severity: "warn", target: t.name,
        message: "Tool description missing or shorter than 10 characters." });

    // qual-02: bloated description
    if (desc.length > 600)
      out.push({ ruleId: "qual-02", category: "qual", severity: "warn", target: t.name,
        message: `Tool description is ${desc.length} chars (>600); bloats agent context.` });

    // sec-03: read-named but write-described
    if (READ_VERBS.test(t.name) && WRITE_WORDS.test(desc))
      out.push({ ruleId: "sec-03", category: "sec", severity: "warn", target: t.name,
        message: "Tool name implies read-only but description mentions write/delete/send." });

    // sec-04: write-ish tool without destructiveHint
    const writeish = WRITEISH_NAME.test(t.name) || WRITE_WORDS.test(desc);
    if (writeish && t.annotations?.destructiveHint !== true && t.annotations?.readOnlyHint !== true)
      out.push({ ruleId: "sec-04", category: "sec", severity: "warn", target: t.name,
        message: "Tool appears to modify state but lacks a destructiveHint annotation." });
  }
  return out;
}
