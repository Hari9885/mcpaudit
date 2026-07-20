import http from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

function buildServer(): McpServer {
  const server = new McpServer({ name: "good-http-server", version: "1.0.0" });
  server.registerTool(
    "get_weather",
    {
      description: "Return the current weather for a given city.",
      inputSchema: { city: z.string().describe("City name to look up.") },
      annotations: { readOnlyHint: true },
    },
    async ({ city }) => ({ content: [{ type: "text", text: `Sunny in ${city}` }] })
  );
  return server;
}

// Stateless Streamable HTTP: a fresh server+transport per request, no session state.
async function handle(req: http.IncomingMessage, res: http.ServerResponse, body: unknown) {
  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on("close", () => { transport.close(); server.close(); });
  await server.connect(transport);
  await transport.handleRequest(req, res, body);
}

export async function startServer(): Promise<{ url: string; close: () => Promise<void> }> {
  const httpServer = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      let body: unknown = undefined;
      if (chunks.length) { try { body = JSON.parse(Buffer.concat(chunks).toString()); } catch { /* leave undefined */ } }
      handle(req, res, body).catch(() => { if (!res.headersSent) res.writeHead(500).end(); });
    });
  });
  await new Promise<void>((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
  const port = (httpServer.address() as { port: number }).port;
  return {
    url: `http://127.0.0.1:${port}/mcp`,
    close: () => new Promise<void>((resolve) => httpServer.close(() => resolve())),
  };
}

// Run standalone: `node fixtures/good-http/server.ts` prints its URL and stays up.
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().then(({ url }) => process.stdout.write(`listening: ${url}\n`));
}
