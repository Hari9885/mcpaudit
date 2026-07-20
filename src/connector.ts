import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

export type Target =
  | { kind: "stdio"; command: string }
  | { kind: "http"; url: string };

export interface Handshake {
  ok: boolean;
  error?: string;
  transport?: "stdio" | "http" | "http(sse)";
  client?: Client;
  serverInfo?: { name?: string; version?: string };
  capabilities?: Record<string, unknown>;
  close?: () => Promise<void>;
}

function toTarget(t: string | Target): Target {
  return typeof t === "string" ? { kind: "stdio", command: t } : t;
}

function splitCommand(command: string): { cmd: string; args: string[] } {
  const parts = command.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];
  const clean = parts.map((p) => p.replace(/^"|"$/g, ""));
  return { cmd: clean[0], args: clean.slice(1) };
}

export function withTimeout<T>(p: Promise<T>, ms: number, msg: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error(msg)), ms)),
  ]);
}

function newClient(): Client {
  return new Client({ name: "mcpaudit", version: "0.1.0" }, { capabilities: {} });
}

// Modern Streamable HTTP first; fall back to legacy SSE. A failed connect can leave a
// client unusable, so each attempt gets a fresh client.
async function connectHttp(url: string, timeout: number): Promise<{ client: Client; transport: "http" | "http(sse)" }> {
  const u = new URL(url);
  try {
    const client = newClient();
    await withTimeout(client.connect(new StreamableHTTPClientTransport(u)), timeout, "handshake timeout");
    return { client, transport: "http" };
  } catch {
    const client = newClient();
    await withTimeout(client.connect(new SSEClientTransport(u)), timeout, "handshake timeout (sse)");
    return { client, transport: "http(sse)" };
  }
}

export async function handshake(target: string | Target, opts: { timeout: number }): Promise<Handshake> {
  const t = toTarget(target);
  try {
    let client: Client;
    let transport: Handshake["transport"];
    if (t.kind === "stdio") {
      const { cmd, args } = splitCommand(t.command);
      client = newClient();
      await withTimeout(client.connect(new StdioClientTransport({ command: cmd, args })), 30000, "handshake timeout");
      transport = "stdio";
    } else {
      const r = await connectHttp(t.url, opts.timeout);
      client = r.client;
      transport = r.transport;
    }
    return {
      ok: true,
      client,
      transport,
      serverInfo: client.getServerVersion() as { name?: string; version?: string } | undefined,
      capabilities: (client.getServerCapabilities() as Record<string, unknown>) ?? {},
      close: async () => { try { await client.close(); } catch { /* ignore */ } },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
