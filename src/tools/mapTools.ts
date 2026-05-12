import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  readDataFile,
  writeDataFile,
  listMapFiles,
  validateProjectPath,
} from "../utils/fileUtils.js";
import {
  safeHandler,
  parseJsonObject,
  mapBaseName,
} from "../utils/toolUtils.js";
import type {
  RPGMap,
  RPGMapInfo,
  RPGMapEvent,
} from "../types/rpgmaker.js";

/**
 * Properties of an RPGMap that should NEVER be modified through the
 * "properties" tool – they have dedicated tools or are structural.
 */
const FORBIDDEN_MAP_PROPERTY_KEYS = new Set([
  "data",
  "events",
  "width",
  "height",
]);

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
    safeHandler(async ({ projectPath }) => {
      validateProjectPath(projectPath);
      const mapInfos = readDataFile<(RPGMapInfo | null)[]>(
        projectPath,
        "MapInfos"
      );
      const lines = mapInfos
        .filter((m): m is RPGMapInfo => m !== null)
        .map(
          (m) =>
            `${mapBaseName(m.id)} | ID: ${m.id} | Parent: ${m.parentId} | Name: ${m.name}`
        );
      return {
        content: [
          {
            type: "text",
            text: lines.length > 0 ? lines.join("\n") : "No maps found.",
          },
        ],
      };
    })
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
    safeHandler(async ({ projectPath, mapId, includeTileData }) => {
      const fileName = mapBaseName(mapId);
      const map = readDataFile<RPGMap>(projectPath, fileName);
      const output: Partial<RPGMap> = { ...map };
      if (!includeTileData) {
        delete output.data;
      }
      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
      };
    })
  );

  // ── update_map_properties ─────────────────────────────────────────────────
  server.tool(
    "update_map_properties",
    "Update top-level properties of a map (displayName, bgm, bgs, tilesetId, note, encounterStep, etc.). Does NOT change tile or event data, and rejects 'data', 'events', 'width', and 'height' keys.",
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
    safeHandler(async ({ projectPath, mapId, properties }) => {
      const props = parseJsonObject(properties, "properties");
      const rejected = Object.keys(props).filter((k) =>
        FORBIDDEN_MAP_PROPERTY_KEYS.has(k)
      );
      if (rejected.length > 0) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `update_map_properties cannot modify: ${rejected.join(
                ", "
              )}. Use the dedicated map-event tools or write_data_file for structural changes.`,
            },
          ],
        };
      }
      const fileName = mapBaseName(mapId);
      const map = readDataFile<RPGMap>(projectPath, fileName);
      const updated = { ...map, ...props };
      writeDataFile(projectPath, fileName, updated);
      return {
        content: [{ type: "text", text: `Map${mapId} properties updated.` }],
      };
    })
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
    safeHandler(async ({ projectPath, mapId }) => {
      const fileName = mapBaseName(mapId);
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
    })
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
    safeHandler(async ({ projectPath, mapId, eventId }) => {
      const fileName = mapBaseName(mapId);
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
    })
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
    safeHandler(async ({ projectPath, mapId, eventData }) => {
      const obj = parseJsonObject(eventData, "eventData");
      if (
        typeof obj.id !== "number" ||
        !Number.isInteger(obj.id) ||
        obj.id < 0
      ) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `eventData must include an integer "id" >= 0 (use 0 to create a new event).`,
            },
          ],
        };
      }
      const event = obj as unknown as RPGMapEvent;
      const fileName = mapBaseName(mapId);
      const map = readDataFile<RPGMap>(projectPath, fileName);
      const events: (RPGMapEvent | null)[] = [...(map.events ?? [])];
      // RPG Maker MV event arrays are 1-indexed (slot 0 is null).
      if (events.length === 0) {
        events.push(null);
      } else if (events[0] !== null) {
        events.unshift(null);
      }
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
    })
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
    safeHandler(async ({ projectPath, mapId, eventId }) => {
      const fileName = mapBaseName(mapId);
      const map = readDataFile<RPGMap>(projectPath, fileName);
      const events: (RPGMapEvent | null)[] = [...(map.events ?? [])];
      if (eventId >= events.length || events[eventId] == null) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Event ${eventId} does not exist on Map${mapId}.`,
            },
          ],
        };
      }
      events[eventId] = null;
      writeDataFile(projectPath, fileName, { ...map, events });
      return {
        content: [
          { type: "text", text: `Event ${eventId} deleted from Map${mapId}.` },
        ],
      };
    })
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
        .positive()
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
    safeHandler(async ({ projectPath, mapId, commandCode, keyword }) => {
      validateProjectPath(projectPath);
      if (commandCode == null && !keyword) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "Provide commandCode and/or keyword to constrain the search.",
            },
          ],
        };
      }
      const mapFiles = mapId
        ? [`${mapBaseName(mapId)}.json`]
        : listMapFiles(projectPath);

      const results: string[] = [];
      const lowerKeyword = keyword?.toLowerCase();

      for (const file of mapFiles) {
        const baseName = file.replace(/\.json$/, "");
        let map: RPGMap;
        try {
          map = readDataFile<RPGMap>(projectPath, baseName);
        } catch {
          continue;
        }
        for (const event of map.events ?? []) {
          if (!event) continue;
          for (const page of event.pages ?? []) {
            for (const cmd of page.list ?? []) {
              const codeMatch = commandCode == null || cmd.code === commandCode;
              const kwMatch =
                !lowerKeyword ||
                JSON.stringify(cmd.parameters)
                  .toLowerCase()
                  .includes(lowerKeyword);
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
    })
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
    safeHandler(async ({ projectPath, mapId, properties }) => {
      const props = parseJsonObject(properties, "properties");
      const mapInfos = readDataFile<(RPGMapInfo | null)[]>(
        projectPath,
        "MapInfos"
      );
      const entry = mapInfos.find(
        (m): m is RPGMapInfo => m !== null && m.id === mapId
      );
      if (!entry) {
        return {
          isError: true,
          content: [{ type: "text", text: `MapInfo for map ID ${mapId} not found.` }],
        };
      }
      // Don't let callers overwrite the id field – it must match the map file.
      delete (props as Record<string, unknown>).id;
      Object.assign(entry, props);
      writeDataFile(projectPath, "MapInfos", mapInfos);
      return {
        content: [{ type: "text", text: `MapInfo for Map${mapId} updated.` }],
      };
    })
  );
}
