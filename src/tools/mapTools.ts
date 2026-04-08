import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  readDataFile,
  writeDataFile,
  listMapFiles,
  validateProjectPath,
} from "../utils/fileUtils.js";
import type { RPGMap, RPGMapInfo, RPGMapEvent, RPGEventCommand } from "../types/rpgmaker.js";

/**
 * Register map-related MCP tools.
 */
export function registerMapTools(server: McpServer): void {
  // ── list_maps ─────────────────────────────────────────────────────────────
  server.tool(
    "list_maps",
    "List all maps in the RPG Maker MV project (ID, name, parent).",
    {
      projectPath: z
        .string()
        .describe("Absolute path to the RPG Maker MV project root."),
    },
    async ({ projectPath }) => {
      validateProjectPath(projectPath);
      const mapInfos = readDataFile<(RPGMapInfo | null)[]>(projectPath, "MapInfos");
      const lines = mapInfos
        .filter((m): m is RPGMapInfo => m !== null)
        .map(
          (m) =>
            `Map${String(m.id).padStart(3, "0")} | ID: ${m.id} | Parent: ${
              m.parentId
            } | Name: ${m.name}`
        );
      return {
        content: [
          {
            type: "text",
            text: lines.length > 0 ? lines.join("\n") : "No maps found.",
          },
        ],
      };
    }
  );

  // ── get_map ───────────────────────────────────────────────────────────────
  server.tool(
    "get_map",
    "Get the full data for a specific map (width, height, tileset, events, etc.).",
    {
      projectPath: z
        .string()
        .describe("Absolute path to the RPG Maker MV project root."),
      mapId: z
        .number()
        .int()
        .positive()
        .describe("The numeric map ID (e.g. 1 for Map001.json)."),
      includeTileData: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          "When false (default) the large tile data array is omitted to keep output compact."
        ),
    },
    async ({ projectPath, mapId, includeTileData }) => {
      const fileName = `Map${String(mapId).padStart(3, "0")}`;
      const map = readDataFile<RPGMap>(projectPath, fileName);
      const output: Partial<RPGMap> = { ...map };
      if (!includeTileData) {
        delete output.data;
      }
      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
      };
    }
  );

  // ── update_map_properties ─────────────────────────────────────────────────
  server.tool(
    "update_map_properties",
    "Update top-level properties of a map (displayName, bgm, bgs, width, height, tilesetId, note, encounterStep, etc.). Does NOT change tile or event data.",
    {
      projectPath: z
        .string()
        .describe("Absolute path to the RPG Maker MV project root."),
      mapId: z
        .number()
        .int()
        .positive()
        .describe("The numeric map ID."),
      properties: z
        .string()
        .describe(
          "JSON object with the properties to update. Example: {\"displayName\": \"Forest\", \"encounterStep\": 30}"
        ),
    },
    async ({ projectPath, mapId, properties }) => {
      let props: Record<string, unknown>;
      try {
        props = JSON.parse(properties) as Record<string, unknown>;
      } catch (e) {
        return {
          isError: true,
          content: [{ type: "text", text: `Invalid JSON: ${(e as Error).message}` }],
        };
      }
      const fileName = `Map${String(mapId).padStart(3, "0")}`;
      const map = readDataFile<RPGMap>(projectPath, fileName);
      const updated = { ...map, ...props };
      writeDataFile(projectPath, fileName, updated);
      return {
        content: [{ type: "text", text: `Map${mapId} properties updated.` }],
      };
    }
  );

  // ── list_map_events ───────────────────────────────────────────────────────
  server.tool(
    "list_map_events",
    "List all events on a specific map (ID, name, position, number of pages).",
    {
      projectPath: z
        .string()
        .describe("Absolute path to the RPG Maker MV project root."),
      mapId: z.number().int().positive().describe("The numeric map ID."),
    },
    async ({ projectPath, mapId }) => {
      const fileName = `Map${String(mapId).padStart(3, "0")}`;
      const map = readDataFile<RPGMap>(projectPath, fileName);
      const events = (map.events ?? []).filter(
        (e): e is RPGMapEvent => e !== null
      );
      const lines = events.map(
        (e) =>
          `Event ${e.id}: "${e.name}" at (${e.x}, ${e.y}) | Pages: ${
            e.pages?.length ?? 0
          }`
      );
      return {
        content: [
          {
            type: "text",
            text: lines.length > 0 ? lines.join("\n") : "No events on this map.",
          },
        ],
      };
    }
  );

  // ── get_map_event ─────────────────────────────────────────────────────────
  server.tool(
    "get_map_event",
    "Get the full data for a specific event on a map.",
    {
      projectPath: z
        .string()
        .describe("Absolute path to the RPG Maker MV project root."),
      mapId: z.number().int().positive().describe("The numeric map ID."),
      eventId: z.number().int().positive().describe("The event ID."),
    },
    async ({ projectPath, mapId, eventId }) => {
      const fileName = `Map${String(mapId).padStart(3, "0")}`;
      const map = readDataFile<RPGMap>(projectPath, fileName);
      const event = (map.events ?? [])[eventId];
      if (!event) {
        return {
          isError: true,
          content: [
            { type: "text", text: `Event ${eventId} not found on Map${mapId}.` },
          ],
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(event, null, 2) }],
      };
    }
  );

  // ── upsert_map_event ──────────────────────────────────────────────────────
  server.tool(
    "upsert_map_event",
    "Create or update an event on a map. If the event ID is 0 it is appended; otherwise it replaces the existing event at that ID.",
    {
      projectPath: z
        .string()
        .describe("Absolute path to the RPG Maker MV project root."),
      mapId: z.number().int().positive().describe("The numeric map ID."),
      eventData: z
        .string()
        .describe(
          "JSON string representing the RPGMapEvent object (id, name, note, x, y, pages[])."
        ),
    },
    async ({ projectPath, mapId, eventData }) => {
      let event: RPGMapEvent;
      try {
        event = JSON.parse(eventData) as RPGMapEvent;
      } catch (e) {
        return {
          isError: true,
          content: [{ type: "text", text: `Invalid JSON: ${(e as Error).message}` }],
        };
      }
      const fileName = `Map${String(mapId).padStart(3, "0")}`;
      const map = readDataFile<RPGMap>(projectPath, fileName);
      const events = [...(map.events ?? [])];
      if (event.id > 0 && event.id < events.length) {
        events[event.id] = event;
      } else {
        event.id = events.length;
        events.push(event);
      }
      writeDataFile(projectPath, fileName, { ...map, events });
      return {
        content: [
          { type: "text", text: `Event ${event.id} saved on Map${mapId}.` },
        ],
      };
    }
  );

  // ── delete_map_event ──────────────────────────────────────────────────────
  server.tool(
    "delete_map_event",
    "Delete an event from a map (sets the slot to null).",
    {
      projectPath: z
        .string()
        .describe("Absolute path to the RPG Maker MV project root."),
      mapId: z.number().int().positive().describe("The numeric map ID."),
      eventId: z.number().int().positive().describe("The event ID to delete."),
    },
    async ({ projectPath, mapId, eventId }) => {
      const fileName = `Map${String(mapId).padStart(3, "0")}`;
      const map = readDataFile<RPGMap>(projectPath, fileName);
      const events = [...(map.events ?? [])];
      if (eventId > 0 && eventId < events.length) {
        events[eventId] = null;
      }
      writeDataFile(projectPath, fileName, { ...map, events });
      return {
        content: [
          { type: "text", text: `Event ${eventId} deleted from Map${mapId}.` },
        ],
      };
    }
  );

  // ── search_event_commands ─────────────────────────────────────────────────
  server.tool(
    "search_event_commands",
    "Search all events across one or all maps for commands matching a specific code or containing a keyword in their parameters.",
    {
      projectPath: z
        .string()
        .describe("Absolute path to the RPG Maker MV project root."),
      mapId: z
        .number()
        .int()
        .optional()
        .describe(
          "Restrict the search to a specific map ID. Omit to search all maps."
        ),
      commandCode: z
        .number()
        .int()
        .optional()
        .describe(
          "Filter by event command code (e.g. 101 for Show Message, 121 for Control Switches)."
        ),
      keyword: z
        .string()
        .optional()
        .describe(
          "Case-insensitive keyword to match against the JSON of each command's parameters."
        ),
    },
    async ({ projectPath, mapId, commandCode, keyword }) => {
      validateProjectPath(projectPath);
      const mapFiles = mapId
        ? [`Map${String(mapId).padStart(3, "0")}.json`]
        : listMapFiles(projectPath);

      const results: string[] = [];

      for (const file of mapFiles) {
        const baseName = file.replace(/\.json$/, "");
        let map: RPGMap;
        try {
          map = readDataFile<RPGMap>(projectPath, baseName);
        } catch {
          continue;
        }
        for (const event of (map.events ?? [])) {
          if (!event) continue;
          for (const page of (event.pages ?? [])) {
            for (const cmd of (page.list ?? [])) {
              const codeMatch = commandCode == null || cmd.code === commandCode;
              const kwMatch =
                !keyword ||
                JSON.stringify(cmd.parameters)
                  .toLowerCase()
                  .includes(keyword.toLowerCase());
              if (codeMatch && kwMatch) {
                results.push(
                  `${baseName} | Event ${event.id} "${event.name}" | Code ${cmd.code} | Params: ${JSON.stringify(cmd.parameters)}`
                );
              }
            }
          }
        }
      }

      return {
        content: [
          {
            type: "text",
            text:
              results.length > 0
                ? results.join("\n")
                : "No matching commands found.",
          },
        ],
      };
    }
  );

  // ── update_map_info ───────────────────────────────────────────────────────
  server.tool(
    "update_map_info",
    "Update MapInfos.json entry for a map (name, parentId, order, scrollX, scrollY).",
    {
      projectPath: z
        .string()
        .describe("Absolute path to the RPG Maker MV project root."),
      mapId: z.number().int().positive().describe("The numeric map ID."),
      properties: z
        .string()
        .describe(
          'JSON object with MapInfo properties to update. Example: {"name": "New Name", "parentId": 2}'
        ),
    },
    async ({ projectPath, mapId, properties }) => {
      let props: Partial<RPGMapInfo>;
      try {
        props = JSON.parse(properties) as Partial<RPGMapInfo>;
      } catch (e) {
        return {
          isError: true,
          content: [{ type: "text", text: `Invalid JSON: ${(e as Error).message}` }],
        };
      }
      const mapInfos = readDataFile<(RPGMapInfo | null)[]>(projectPath, "MapInfos");
      const entry = mapInfos.find((m) => m !== null && m.id === mapId);
      if (!entry) {
        return {
          isError: true,
          content: [{ type: "text", text: `MapInfo for map ID ${mapId} not found.` }],
        };
      }
      Object.assign(entry, props);
      writeDataFile(projectPath, "MapInfos", mapInfos);
      return {
        content: [{ type: "text", text: `MapInfo for Map${mapId} updated.` }],
      };
    }
  );
}
