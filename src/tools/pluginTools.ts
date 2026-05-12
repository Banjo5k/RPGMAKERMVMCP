import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readPluginsFile, writePluginsFile } from "../utils/fileUtils.js";
import { safeHandler, parseJsonObject } from "../utils/toolUtils.js";
import type { RPGPlugin } from "../types/rpgmaker.js";

/**
 * Validates a parsed plugin object and returns a normalized RPGPlugin.
 * Throws with a descriptive message on bad input.
 */
function normalizePlugin(obj: Record<string, unknown>): RPGPlugin {
  if (typeof obj.name !== "string" || obj.name.length === 0) {
    throw new Error("Plugin 'name' must be a non-empty string.");
  }
  if (typeof obj.status !== "boolean") {
    throw new Error("Plugin 'status' must be a boolean.");
  }
  const description =
    typeof obj.description === "string" ? obj.description : "";
  let parameters: Record<string, string> = {};
  if (obj.parameters != null) {
    if (
      typeof obj.parameters !== "object" ||
      Array.isArray(obj.parameters)
    ) {
      throw new Error("Plugin 'parameters' must be an object of string values.");
    }
    for (const [k, v] of Object.entries(obj.parameters as Record<string, unknown>)) {
      // RPG Maker MV plugin parameters are always serialized as strings.
      parameters[k] = typeof v === "string" ? v : String(v);
    }
  }
  return {
    name: obj.name,
    status: obj.status,
    description,
    parameters,
  };
}

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
    safeHandler(async ({ projectPath }) => {
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
    })
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
    safeHandler(async ({ projectPath, pluginName }) => {
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
    })
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
    safeHandler(async ({ projectPath, pluginName, enabled }) => {
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
    })
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
      parameterName: z.string().min(1).describe("The parameter key to update."),
      value: z.string().describe("New value for the parameter (always a string in RPG Maker MV)."),
    },
    safeHandler(async ({ projectPath, pluginName, parameterName, value }) => {
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
    })
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
    safeHandler(async ({ projectPath, pluginData }) => {
      const obj = parseJsonObject(pluginData, "pluginData");
      const plugin = normalizePlugin(obj);
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
    })
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
    safeHandler(async ({ projectPath, pluginName }) => {
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
    })
  );
}
