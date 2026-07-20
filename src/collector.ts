import { handshake, withTimeout } from "./connector.js";
import type { Target } from "./connector.js";
import type { AuditSnapshot, ToolInfo, ResourceInfo, PromptInfo } from "./types.js";

const EMPTY = (err?: string): AuditSnapshot => ({
  server: {}, handshakeOk: false, handshakeError: err,
  declaredCapabilities: {}, tools: [], resources: [], prompts: [], probes: [],
});

export async function collect(target: string | Target, opts: { timeout: number }) {
  const h = await handshake(target, opts);
  if (!h.ok || !h.client) return { snapshot: EMPTY(h.error) };
  const client = h.client;
  const caps = h.capabilities ?? {};

  const tools = caps.tools ? await safeList(() => client.listTools(), (r) => r.tools as ToolInfo[]) : [];
  const resources = caps.resources ? await safeList(() => client.listResources(), (r) => r.resources as ResourceInfo[]) : [];
  const prompts = caps.prompts ? await safeList(() => client.listPrompts(), (r) => r.prompts as PromptInfo[]) : [];

  const snapshot: AuditSnapshot = {
    server: h.serverInfo ?? {},
    protocolVersion: (h.serverInfo as { protocolVersion?: string })?.protocolVersion,
    handshakeOk: true,
    declaredCapabilities: caps,
    tools, resources, prompts, probes: [],
  };
  return { snapshot, client, close: h.close };
}

async function safeList<T>(call: () => Promise<unknown>, pick: (r: any) => T[]): Promise<T[]> {
  try { return pick(await withTimeout(call(), 10000, "list timeout")) ?? []; }
  catch { return []; }
}
