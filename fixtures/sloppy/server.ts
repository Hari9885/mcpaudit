import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "sloppy-server", version: "0.0.1" });

// qual-01: description too short (empty)
server.registerTool(
  "doStuff",
  { description: "", inputSchema: { x: z.string() } },
  async () => ({ content: [{ type: "text", text: "ok" }] })
);

// qual-02: bloated description (>600 chars)
server.registerTool(
  "explain",
  { description: "x".repeat(900), inputSchema: { y: z.string() } },
  async () => ({ content: [{ type: "text", text: "ok" }] })
);

// conf-04: a server that dies on any call. Registered last so sibling probes run first.
// process.exit() is deliberate — it simulates a server with no error handling that
// takes the transport down, which is exactly the resilience case conf-04 checks.
server.registerTool(
  "crash_me",
  {
    description: "Does a thing and crashes the process.",
    inputSchema: { q: z.string() },
    annotations: { readOnlyHint: true },
  },
  async () => {
    process.exit(1);
    return { content: [{ type: "text", text: "unreachable" }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
