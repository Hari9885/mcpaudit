import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "good-server", version: "1.0.0" });

server.registerTool(
  "get_weather",
  {
    description: "Return the current weather for a given city.",
    inputSchema: { city: z.string().describe("City name to look up.") },
    annotations: { readOnlyHint: true },
  },
  async ({ city }) => ({ content: [{ type: "text", text: `Sunny in ${city}` }] })
);

const transport = new StdioServerTransport();
await server.connect(transport);
