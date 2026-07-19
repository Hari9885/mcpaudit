import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export interface Handshake {
  ok: boolean;
  error?: string;
  client?: Client;
  serverInfo?: { name?: string; version?: string };
  capabilities?: Record<string, unknown>;
  close?: () => Promise<void>;
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

export async function handshake(command: string, _opts: { timeout: number }): Promise<Handshake> {
  const { cmd, args } = splitCommand(command);
  const transport = new StdioClientTransport({ command: cmd, args });
  const client = new Client({ name: "mcpaudit", version: "0.1.0" }, { capabilities: {} });
  try {
    await withTimeout(client.connect(transport), 30000, "handshake timeout");
    return {
      ok: true,
      client,
      serverInfo: client.getServerVersion() as { name?: string; version?: string } | undefined,
      capabilities: (client.getServerCapabilities() as Record<string, unknown>) ?? {},
      close: async () => { try { await client.close(); } catch { /* ignore */ } },
    };
  } catch (e) {
    try { await client.close(); } catch { /* ignore */ }
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
