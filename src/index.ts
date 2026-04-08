#!/usr/bin/env node
/**
 * RPG Maker MV MCP Server
 *
 * An MCP (Model Context Protocol) server that exposes tools for interacting
 * with RPG Maker MV project data files. Designed to work with Gemini CLI
 * and other MCP-compatible AI clients.
 *
 * Transport: stdio (default for CLI integration)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerCoreTools } from "./tools/coreTools.js";
import { registerEntityTools } from "./tools/entityTools.js";
import { registerMapTools } from "./tools/mapTools.js";
import { registerSystemTools } from "./tools/systemTools.js";
import { registerPluginTools } from "./tools/pluginTools.js";
import { registerValidationTools } from "./tools/validationTools.js";

const SERVER_NAME = "rpgmaker-mv-mcp";
const SERVER_VERSION = "1.0.0";

async function main(): Promise<void> {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  // Register all tool groups
  registerCoreTools(server);
  registerEntityTools(server);
  registerMapTools(server);
  registerSystemTools(server);
  registerPluginTools(server);
  registerValidationTools(server);

  // Connect via stdio for CLI usage
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr so it doesn't interfere with the MCP stdio protocol
  process.stderr.write(
    `[${SERVER_NAME}] v${SERVER_VERSION} started. Listening on stdio.\n`
  );
}

main().catch((err: unknown) => {
  process.stderr.write(`[${SERVER_NAME}] Fatal error: ${String(err)}\n`);
  process.exit(1);
});
