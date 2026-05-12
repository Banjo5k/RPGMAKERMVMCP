import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  readDataFile,
  writeDataFile,
  listDataFiles,
  listMapFiles,
  validateProjectPath,
} from "../utils/fileUtils.js";
import { safeHandler } from "../utils/toolUtils.js";

/**
 * Core data-file tools: list, read raw, write raw.
 */
export function registerCoreTools(server: McpServer): void {
  // ── list_data_files ──────────────────────────────────────────────────────
  server.tool(
    "list_data_files",
    "List all JSON data files present in the RPG Maker MV project's data directory.",
    {
      projectPath: z
        .string()
        .describe("Absolute path to the RPG Maker MV project root."),
    },
    safeHandler(async ({ projectPath }) => {
      validateProjectPath(projectPath);
      const files = listDataFiles(projectPath);
      return {
        content: [
          {
            type: "text",
            text: files.length > 0 ? files.join("\n") : "No data files found.",
          },
        ],
      };
    })
  );

  // ── list_map_files ───────────────────────────────────────────────────────
  server.tool(
    "list_map_files",
    "List all MapXXX.json files in the RPG Maker MV project.",
    {
      projectPath: z
        .string()
        .describe("Absolute path to the RPG Maker MV project root."),
    },
    safeHandler(async ({ projectPath }) => {
      validateProjectPath(projectPath);
      const files = listMapFiles(projectPath);
      return {
        content: [
          {
            type: "text",
            text: files.length > 0 ? files.join("\n") : "No map files found.",
          },
        ],
      };
    })
  );

  // ── read_data_file ───────────────────────────────────────────────────────
  server.tool(
    "read_data_file",
    "Read the raw JSON content of any data file in the RPG Maker MV project (e.g. Actors, Skills, System, Map001).",
    {
      projectPath: z
        .string()
        .describe("Absolute path to the RPG Maker MV project root."),
      fileName: z
        .string()
        .describe(
          "Name of the data file without extension (e.g. 'Actors', 'Map001') or with extension (e.g. 'Actors.json')."
        ),
    },
    safeHandler(async ({ projectPath, fileName }) => {
      const data = readDataFile<unknown>(projectPath, fileName);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    })
  );

  // ── write_data_file ──────────────────────────────────────────────────────
  server.tool(
    "write_data_file",
    "Overwrite any data file in the RPG Maker MV project with new JSON content. A .bak backup is created automatically.",
    {
      projectPath: z
        .string()
        .describe("Absolute path to the RPG Maker MV project root."),
      fileName: z
        .string()
        .describe(
          "Name of the data file without extension (e.g. 'Actors') or with extension (e.g. 'Actors.json')."
        ),
      content: z
        .string()
        .describe("JSON string to write. Must be valid JSON."),
    },
    safeHandler(async ({ projectPath, fileName, content }) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch (e) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Invalid JSON: ${(e as Error).message}`,
            },
          ],
        };
      }
      writeDataFile(projectPath, fileName, parsed);
      const baseName = fileName.endsWith(".json") ? fileName : `${fileName}.json`;
      return {
        content: [
          {
            type: "text",
            text: `Successfully wrote ${baseName} (backup created as ${baseName}.bak).`,
          },
        ],
      };
    })
  );
}
