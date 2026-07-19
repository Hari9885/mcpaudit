import type { AuditSnapshot, ProbeResult, Finding } from "./types.js";
import type { PatternPack } from "./rules/patterns.js";
import { dummyInput } from "./dummy.js";
import { withTimeout } from "./connector.js";

// A genuine transport death — distinct from a mere timeout ("hang"), which may just
// be a deliberately slow tool. Timeouts are tracked separately via `timedOut`.
const CRASH_RE = /closed|EPIPE|terminated|ECONN|not connected|disconnected/i;

export async function probe(client: any, s: AuditSnapshot, opts: { probeUnsafe: boolean; timeout: number }): Promise<ProbeResult[]> {
  const results: ProbeResult[] = [];
  for (const t of s.tools) {
    const readOnly = t.annotations?.readOnlyHint === true;
    if (!opts.probeUnsafe && !readOnly) {
      results.push({ tool: t.name, probed: false, skippedReason: "not read-only (use --probe-unsafe for your own server)" });
      continue;
    }
    const gen = dummyInput(t.inputSchema);
    if (!gen.ok) { results.push({ tool: t.name, probed: false, skippedReason: `complex schema: ${gen.reason}` }); continue; }

    const r: ProbeResult = { tool: t.name, probed: true };
    r.validCall = await callOnce(client, t.name, gen.value, opts.timeout);
    const bad: Record<string, unknown> = { ...gen.value };
    const firstReq = t.inputSchema?.required?.[0];
    if (firstReq) bad[firstReq] = { __wrong: true };
    r.invalidCall = await callInvalid(client, t.name, bad, opts.timeout);
    results.push(r);
  }
  return results;
}

async function callOnce(client: any, name: string, args: Record<string, unknown>, timeout: number) {
  const start = Date.now();
  try {
    const res = await withTimeout(client.callTool({ name, arguments: args }), timeout, "__timeout__");
    return { ok: true, bytes: Buffer.byteLength(JSON.stringify(res)), ms: Date.now() - start, text: extractText(res) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg, timedOut: msg === "__timeout__", ms: Date.now() - start };
  }
}

async function callInvalid(client: any, name: string, args: Record<string, unknown>, timeout: number) {
  const start = Date.now();
  try {
    await withTimeout(client.callTool({ name, arguments: args }), timeout, "__timeout__");
    return { ok: true, jsonRpcError: false, crashed: false, ms: Date.now() - start };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const timedOut = msg === "__timeout__";
    const crashed = CRASH_RE.test(msg);
    // A JSON-RPC validation error is the healthy outcome: not a crash and not a timeout.
    return { ok: false, jsonRpcError: !crashed && !timedOut, crashed, timedOut, ms: Date.now() - start };
  }
}

function extractText(res: unknown): string {
  try { return ((res as { content?: { text?: string }[] })?.content ?? []).map((c) => c?.text ?? "").join(" "); }
  catch { return ""; }
}

export function runProbeRules(s: AuditSnapshot, pack: PatternPack): Finding[] {
  const out: Finding[] = [];
  const secRes = pack.secrets.map((p) => new RegExp(p));
  const injRes = pack.injection.map((p) => new RegExp(p, "i"));

  for (const p of s.probes) {
    if (!p.probed) continue;

    // conf-04: the server died, OR it hangs on invalid input while answering valid input
    // fine (asymmetric hang = missing input validation). A tool that is simply slow on
    // everything is a qual-04 latency finding, not a conformance failure.
    const validCrashed = p.validCall?.ok === false && CRASH_RE.test(p.validCall.error ?? "");
    const validTimedOut = p.validCall?.timedOut === true;
    const asymmetricHang = p.invalidCall?.timedOut === true && !validTimedOut;
    if (p.invalidCall?.crashed || validCrashed || asymmetricHang)
      out.push({ ruleId: "conf-04", category: "conf", severity: "error", target: p.tool,
        message: "Invalid input crashed or hung the server instead of returning a JSON-RPC error." });

    const text = p.validCall?.text ?? "";
    if (secRes.some((re) => re.test(text)))
      out.push({ ruleId: "sec-05", category: "sec", severity: "error", target: p.tool,
        message: "Tool output echoed a secret-shaped token." });
    if (injRes.some((re) => re.test(text)))
      out.push({ ruleId: "sec-06", category: "sec", severity: "warn", target: p.tool,
        message: "Tool output contains a prompt-injection phrase." });
    if ((p.validCall?.bytes ?? 0) > 100_000)
      out.push({ ruleId: "qual-03", category: "qual", severity: "warn", target: p.tool,
        message: `Tool response is ${p.validCall!.bytes} bytes (>100KB).` });
    if ((p.validCall?.ms ?? 0) > 5000)
      out.push({ ruleId: "qual-04", category: "qual", severity: "info", target: p.tool,
        message: `Tool responded in ${p.validCall!.ms}ms (>5s).` });
  }
  return out;
}
