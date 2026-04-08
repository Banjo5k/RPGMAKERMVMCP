import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readPluginsFile, writePluginsFile } from "../utils/fileUtils.js";
import type { RPGPlugin } from "../types/rpgmaker.js";

/**
 * Register plugin management MCP tools.
 */
export function registerPluginTools(server: McpServer): void {
  // ── list_plugins ──────────────────────────────────────────────────────────
  server.tool(
    "list_plugins",
    "List all plugins in js/plugins.js with their name, status, and description.",
    {
      projectPath: z
        .string()
        .describe("Absolute path to the RPG Maker MV project root."),
    },
    async ({ projectPath }) => {
      const plugins = readPluginsFile(projectPath);
      const lines = plugins.map(
        (p, i) =>
          `[${i}] ${p.status ? "✓" : "✗"} ${p.name}: ${p.description || "(no description)"}`
      );
      return {
        content: [
          {
            type: "text",
            text: lines.length > 0 ? lines.join("\n") : "No plugins found.",
          },
        ],
      };
    }
  );

  // ── get_plugin ────────────────────────────────────────────────────────────
  server.tool(
    "get_plugin",
    "Get full details (including all parameters) for a plugin by its name.",
    {
      projectPath: z
        .string()
        .describe("Absolute path to the RPG Maker MV project root."),
      pluginName: z
        .string()
        .describe("The exact plugin file name (without .js extension)."),
    },
    async ({ projectPath, pluginName }) => {
      const plugins = readPluginsFile(projectPath);
      const plugin = plugins.find(
        (p) => p.name.toLowerCase() === pluginName.toLowerCase()
      );
      if (!plugin) {
        return {
          isError: true,
          content: [
            { type: "text", text: `Plugin "${pluginName}" not found.` },
          ],
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(plugin, null, 2) }],
      };
    }
  );

  // ── set_plugin_status ─────────────────────────────────────────────────────
  server.tool(
    "set_plugin_status",
    "Enable or disable a plugin by name.",
    {
      projectPath: z
        .string()
        .describe("Absolute path to the RPG Maker MV project root."),
      pluginName: z
        .string()
        .describe("The exact plugin file name (without .js extension)."),
      enabled: z.boolean().describe("true to enable, false to disable."),
    },
    async ({ projectPath, pluginName, enabled }) => {
      const plugins = readPluginsFile(projectPath);
      const plugin = plugins.find(
        (p) => p.name.toLowerCase() === pluginName.toLowerCase()
      );
      if (!plugin) {
        return {
          isError: true,
          content: [{ type: "text", text: `Plugin "${pluginName}" not found.` }],
        };
      }
      plugin.status = enabled;
      writePluginsFile(projectPath, plugins);
      return {
        content: [
          {
            type: "text",
            text: `Plugin "${pluginName}" ${enabled ? "enabled" : "disabled"}.`,
          },
        ],
      };
    }
  );

  // ── update_plugin_parameter ───────────────────────────────────────────────
  server.tool(
    "update_plugin_parameter",
    "Update a single parameter value for a plugin.",
    {
      projectPath: z
        .string()
        .describe("Absolute path to the RPG Maker MV project root."),
      pluginName: z
        .string()
        .describe("The exact plugin file name (without .js extension)."),
      parameterName: z.string().describe("The parameter key to update."),
      value: z.string().describe("New value for the parameter (always a string in RPG Maker MV)."),
    },
    async ({ projectPath, pluginName, parameterName, value }) => {
      const plugins = readPluginsFile(projectPath);
      const plugin = plugins.find(
        (p) => p.name.toLowerCase() === pluginName.toLowerCase()
      );
      if (!plugin) {
        return {
          isError: true,
          content: [{ type: "text", text: `Plugin "${pluginName}" not found.` }],
        };
      }
      plugin.parameters = plugin.parameters ?? {};
      plugin.parameters[parameterName] = value;
      writePluginsFile(projectPath, plugins);
      return {
        content: [
          {
            type: "text",
            text: `Plugin "${pluginName}" parameter "${parameterName}" set to "${value}".`,
          },
        ],
      };
    }
  );

  // ── upsert_plugin ─────────────────────────────────────────────────────────
  server.tool(
    "upsert_plugin",
    "Add a new plugin entry or fully replace an existing one in js/plugins.js.",
    {
      projectPath: z
        .string()
        .describe("Absolute path to the RPG Maker MV project root."),
      pluginData: z
        .string()
        .describe(
          "JSON string representing the plugin object. Fields: name (string), status (boolean), description (string), parameters (object)."
        ),
    },
    async ({ projectPath, pluginData }) => {
      let plugin: RPGPlugin;
      try {
        plugin = JSON.parse(pluginData) as RPGPlugin;
      } catch (e) {
        return {
          isError: true,
          content: [{ type: "text", text: `Invalid JSON: ${(e as Error).message}` }],
        };
      }
      const plugins = readPluginsFile(projectPath);
      const idx = plugins.findIndex(
        (p) => p.name.toLowerCase() === plugin.name.toLowerCase()
      );
      if (idx >= 0) {
        plugins[idx] = plugin;
      } else {
        plugins.push(plugin);
      }
      writePluginsFile(projectPath, plugins);
      return {
        content: [{ type: "text", text: `Plugin "${plugin.name}" saved.` }],
      };
    }
  );

  // ── remove_plugin ─────────────────────────────────────────────────────────
  server.tool(
    "remove_plugin",
    "Remove a plugin entry from js/plugins.js entirely.",
    {
      projectPath: z
        .string()
        .describe("Absolute path to the RPG Maker MV project root."),
      pluginName: z
        .string()
        .describe("The exact plugin file name (without .js extension)."),
    },
    async ({ projectPath, pluginName }) => {
      const plugins = readPluginsFile(projectPath);
      const filtered = plugins.filter(
        (p) => p.name.toLowerCase() !== pluginName.toLowerCase()
      );
      if (filtered.length === plugins.length) {
        return {
          isError: true,
          content: [{ type: "text", text: `Plugin "${pluginName}" not found.` }],
        };
      }
      writePluginsFile(projectPath, filtered);
      return {
        content: [{ type: "text", text: `Plugin "${pluginName}" removed.` }],
      };
    }
  );
}
