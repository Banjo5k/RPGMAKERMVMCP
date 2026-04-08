import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readDataFile, writeDataFile } from "../utils/fileUtils.js";
import type { RPGSystem } from "../types/rpgmaker.js";

/**
 * Register system-settings MCP tools.
 */
export function registerSystemTools(server: McpServer): void {
  // ── get_system ────────────────────────────────────────────────────────────
  server.tool(
    "get_system",
    "Read the System.json file of the RPG Maker MV project (game title, party, switches, variables, terms, etc.).",
    {
      projectPath: z
        .string()
        .describe("Absolute path to the RPG Maker MV project root."),
    },
    async ({ projectPath }) => {
      const system = readDataFile<RPGSystem>(projectPath, "System");
      return {
        content: [{ type: "text", text: JSON.stringify(system, null, 2) }],
      };
    }
  );

  // ── update_system ─────────────────────────────────────────────────────────
  server.tool(
    "update_system",
    "Update one or more top-level properties in System.json. Pass only the properties you want to change.",
    {
      projectPath: z
        .string()
        .describe("Absolute path to the RPG Maker MV project root."),
      properties: z
        .string()
        .describe(
          'JSON object with System properties to update. Example: {"gameTitle": "My Game", "currencyUnit": "G"}'
        ),
    },
    async ({ projectPath, properties }) => {
      let props: Partial<RPGSystem>;
      try {
        props = JSON.parse(properties) as Partial<RPGSystem>;
      } catch (e) {
        return {
          isError: true,
          content: [{ type: "text", text: `Invalid JSON: ${(e as Error).message}` }],
        };
      }
      const system = readDataFile<RPGSystem>(projectPath, "System");
      const updated = { ...system, ...props };
      writeDataFile(projectPath, "System", updated);
      return {
        content: [{ type: "text", text: "System.json updated successfully." }],
      };
    }
  );

  // ── get_switches ──────────────────────────────────────────────────────────
  server.tool(
    "get_switches",
    "List all switch names defined in System.json.",
    {
      projectPath: z
        .string()
        .describe("Absolute path to the RPG Maker MV project root."),
    },
    async ({ projectPath }) => {
      const system = readDataFile<RPGSystem>(projectPath, "System");
      const lines = (system.switches ?? [])
        .map((name, i) => (i === 0 ? null : `Switch ${i}: ${name || "(unnamed)"}`) )
        .filter((l): l is string => l !== null);
      return {
        content: [{ type: "text", text: lines.join("\n") || "No switches defined." }],
      };
    }
  );

  // ── update_switch_name ────────────────────────────────────────────────────
  server.tool(
    "update_switch_name",
    "Rename a switch in System.json by its 1-based index.",
    {
      projectPath: z
        .string()
        .describe("Absolute path to the RPG Maker MV project root."),
      switchId: z
        .number()
        .int()
        .positive()
        .describe("1-based switch ID."),
      name: z.string().describe("New name for the switch."),
    },
    async ({ projectPath, switchId, name }) => {
      const system = readDataFile<RPGSystem>(projectPath, "System");
      while (system.switches.length <= switchId) {
        system.switches.push("");
      }
      system.switches[switchId] = name;
      writeDataFile(projectPath, "System", system);
      return {
        content: [{ type: "text", text: `Switch ${switchId} renamed to "${name}".` }],
      };
    }
  );

  // ── get_variables ─────────────────────────────────────────────────────────
  server.tool(
    "get_variables",
    "List all variable names defined in System.json.",
    {
      projectPath: z
        .string()
        .describe("Absolute path to the RPG Maker MV project root."),
    },
    async ({ projectPath }) => {
      const system = readDataFile<RPGSystem>(projectPath, "System");
      const lines = (system.variables ?? [])
        .map((name, i) => (i === 0 ? null : `Variable ${i}: ${name || "(unnamed)"}`))
        .filter((l): l is string => l !== null);
      return {
        content: [{ type: "text", text: lines.join("\n") || "No variables defined." }],
      };
    }
  );

  // ── update_variable_name ──────────────────────────────────────────────────
  server.tool(
    "update_variable_name",
    "Rename a variable in System.json by its 1-based index.",
    {
      projectPath: z
        .string()
        .describe("Absolute path to the RPG Maker MV project root."),
      variableId: z
        .number()
        .int()
        .positive()
        .describe("1-based variable ID."),
      name: z.string().describe("New name for the variable."),
    },
    async ({ projectPath, variableId, name }) => {
      const system = readDataFile<RPGSystem>(projectPath, "System");
      while (system.variables.length <= variableId) {
        system.variables.push("");
      }
      system.variables[variableId] = name;
      writeDataFile(projectPath, "System", system);
      return {
        content: [
          { type: "text", text: `Variable ${variableId} renamed to "${name}".` },
        ],
      };
    }
  );

  // ── get_elements ──────────────────────────────────────────────────────────
  server.tool(
    "get_elements",
    "List all element names defined in System.json.",
    {
      projectPath: z
        .string()
        .describe("Absolute path to the RPG Maker MV project root."),
    },
    async ({ projectPath }) => {
      const system = readDataFile<RPGSystem>(projectPath, "System");
      const lines = (system.elements ?? [])
        .map((name, i) => (i === 0 ? null : `Element ${i}: ${name || "(unnamed)"}`))
        .filter((l): l is string => l !== null);
      return {
        content: [{ type: "text", text: lines.join("\n") || "No elements defined." }],
      };
    }
  );

  // ── get_skill_types ───────────────────────────────────────────────────────
  server.tool(
    "get_skill_types",
    "List all skill type names defined in System.json.",
    {
      projectPath: z
        .string()
        .describe("Absolute path to the RPG Maker MV project root."),
    },
    async ({ projectPath }) => {
      const system = readDataFile<RPGSystem>(projectPath, "System");
      const lines = (system.skillTypes ?? [])
        .map((name, i) => (i === 0 ? null : `SkillType ${i}: ${name || "(unnamed)"}`))
        .filter((l): l is string => l !== null);
      return {
        content: [{ type: "text", text: lines.join("\n") || "No skill types defined." }],
      };
    }
  );

  // ── get_weapon_types ──────────────────────────────────────────────────────
  server.tool(
    "get_weapon_types",
    "List all weapon type names defined in System.json.",
    {
      projectPath: z
        .string()
        .describe("Absolute path to the RPG Maker MV project root."),
    },
    async ({ projectPath }) => {
      const system = readDataFile<RPGSystem>(projectPath, "System");
      const lines = (system.weaponTypes ?? [])
        .map((name, i) => (i === 0 ? null : `WeaponType ${i}: ${name || "(unnamed)"}`))
        .filter((l): l is string => l !== null);
      return {
        content: [{ type: "text", text: lines.join("\n") || "No weapon types defined." }],
      };
    }
  );

  // ── get_armor_types ───────────────────────────────────────────────────────
  server.tool(
    "get_armor_types",
    "List all armor type names defined in System.json.",
    {
      projectPath: z
        .string()
        .describe("Absolute path to the RPG Maker MV project root."),
    },
    async ({ projectPath }) => {
      const system = readDataFile<RPGSystem>(projectPath, "System");
      const lines = (system.armorTypes ?? [])
        .map((name, i) => (i === 0 ? null : `ArmorType ${i}: ${name || "(unnamed)"}`))
        .filter((l): l is string => l !== null);
      return {
        content: [{ type: "text", text: lines.join("\n") || "No armor types defined." }],
      };
    }
  );
}
