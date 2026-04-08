import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  readDataFile,
  listDataFiles,
  listMapFiles,
  validateProjectPath,
} from "../utils/fileUtils.js";
import type {
  RPGActor,
  RPGClass,
  RPGSkill,
  RPGItem,
  RPGWeapon,
  RPGArmor,
  RPGEnemy,
  RPGState,
  RPGTroop,
  RPGCommonEvent,
  RPGMap,
  RPGSystem,
} from "../types/rpgmaker.js";

type Issue = { file: string; message: string };

function checkIds<T extends { id: number }>(
  arr: (T | null)[],
  fileName: string,
  issues: Issue[]
): void {
  arr.forEach((item, index) => {
    if (item === null) return;
    if (item.id !== index) {
      issues.push({
        file: fileName,
        message: `Item at index ${index} has id=${item.id} (mismatch).`,
      });
    }
  });
}

/**
 * Register data validation tools.
 */
export function registerValidationTools(server: McpServer): void {
  // ── validate_project ──────────────────────────────────────────────────────
  server.tool(
    "validate_project",
    "Run a series of integrity checks on the RPG Maker MV project data files and report any issues found.",
    {
      projectPath: z
        .string()
        .describe("Absolute path to the RPG Maker MV project root."),
    },
    async ({ projectPath }) => {
      validateProjectPath(projectPath);
      const issues: Issue[] = [];

      // Helper to safely load a file
      function load<T>(name: string): T | null {
        try {
          return readDataFile<T>(projectPath, name);
        } catch (e) {
          issues.push({ file: name, message: `Could not read: ${(e as Error).message}` });
          return null;
        }
      }

      // ── System checks ────────────────────────────────────────────────────
      const system = load<RPGSystem>("System");
      if (system) {
        if (!system.gameTitle) {
          issues.push({ file: "System", message: "gameTitle is empty." });
        }
        if (system.startMapId <= 0) {
          issues.push({ file: "System", message: "startMapId must be > 0." });
        }
        if (!system.partyMembers || system.partyMembers.length === 0) {
          issues.push({ file: "System", message: "partyMembers array is empty." });
        }
      }

      // ── Actors ───────────────────────────────────────────────────────────
      const actors = load<(RPGActor | null)[]>("Actors");
      if (actors) {
        checkIds(actors, "Actors", issues);
        const classes = load<(RPGClass | null)[]>("Classes");
        actors.forEach((actor) => {
          if (!actor) return;
          if (!actor.name) {
            issues.push({ file: "Actors", message: `Actor ID ${actor.id} has no name.` });
          }
          if (classes && (actor.classId <= 0 || actor.classId >= classes.length || !classes[actor.classId])) {
            issues.push({
              file: "Actors",
              message: `Actor ID ${actor.id} references invalid classId ${actor.classId}.`,
            });
          }
        });
      }

      // ── Classes ──────────────────────────────────────────────────────────
      const classes = load<(RPGClass | null)[]>("Classes");
      if (classes) {
        checkIds(classes, "Classes", issues);
        classes.forEach((cls) => {
          if (!cls) return;
          if (!cls.name) {
            issues.push({ file: "Classes", message: `Class ID ${cls.id} has no name.` });
          }
          if (!cls.expParams || cls.expParams.length !== 4) {
            issues.push({
              file: "Classes",
              message: `Class ID ${cls.id} has invalid expParams (expected array of 4).`,
            });
          }
        });
      }

      // ── Skills ───────────────────────────────────────────────────────────
      const skills = load<(RPGSkill | null)[]>("Skills");
      if (skills) {
        checkIds(skills, "Skills", issues);
        skills.forEach((s) => {
          if (!s) return;
          if (!s.name) {
            issues.push({ file: "Skills", message: `Skill ID ${s.id} has no name.` });
          }
        });
      }

      // ── Items ────────────────────────────────────────────────────────────
      const items = load<(RPGItem | null)[]>("Items");
      if (items) {
        checkIds(items, "Items", issues);
        items.forEach((item) => {
          if (!item) return;
          if (!item.name) {
            issues.push({ file: "Items", message: `Item ID ${item.id} has no name.` });
          }
          if (item.price < 0) {
            issues.push({
              file: "Items",
              message: `Item ID ${item.id} has negative price.`,
            });
          }
        });
      }

      // ── Weapons ──────────────────────────────────────────────────────────
      const weapons = load<(RPGWeapon | null)[]>("Weapons");
      if (weapons) {
        checkIds(weapons, "Weapons", issues);
      }

      // ── Armors ───────────────────────────────────────────────────────────
      const armors = load<(RPGArmor | null)[]>("Armors");
      if (armors) {
        checkIds(armors, "Armors", issues);
      }

      // ── Enemies ──────────────────────────────────────────────────────────
      const enemies = load<(RPGEnemy | null)[]>("Enemies");
      if (enemies) {
        checkIds(enemies, "Enemies", issues);
        enemies.forEach((enemy) => {
          if (!enemy) return;
          if (!enemy.battlerName) {
            issues.push({
              file: "Enemies",
              message: `Enemy ID ${enemy.id} has no battlerName.`,
            });
          }
        });
      }

      // ── States ───────────────────────────────────────────────────────────
      const states = load<(RPGState | null)[]>("States");
      if (states) {
        checkIds(states, "States", issues);
      }

      // ── Troops ───────────────────────────────────────────────────────────
      const troops = load<(RPGTroop | null)[]>("Troops");
      if (troops) {
        checkIds(troops, "Troops", issues);
      }

      // ── CommonEvents ─────────────────────────────────────────────────────
      const commonEvents = load<(RPGCommonEvent | null)[]>("CommonEvents");
      if (commonEvents) {
        checkIds(commonEvents, "CommonEvents", issues);
      }

      // ── Maps ─────────────────────────────────────────────────────────────
      const mapFiles = listMapFiles(projectPath);
      for (const mapFile of mapFiles) {
        const baseName = mapFile.replace(/\.json$/, "");
        const map = load<RPGMap>(baseName);
        if (map) {
          if (map.width <= 0 || map.height <= 0) {
            issues.push({
              file: baseName,
              message: `Map has invalid dimensions: ${map.width}x${map.height}.`,
            });
          }
          const expectedTileCount = map.width * map.height * 6; // 6 layers
          if (map.data && map.data.length !== expectedTileCount) {
            issues.push({
              file: baseName,
              message: `Tile data length mismatch. Expected ${expectedTileCount}, got ${map.data.length}.`,
            });
          }
        }
      }

      // ── Summary ──────────────────────────────────────────────────────────
      if (issues.length === 0) {
        return {
          content: [
            { type: "text", text: "✓ No issues found. Project data appears valid." },
          ],
        };
      }

      const report = issues
        .map((issue) => `[${issue.file}] ${issue.message}`)
        .join("\n");
      return {
        content: [
          {
            type: "text",
            text: `Found ${issues.length} issue(s):\n\n${report}`,
          },
        ],
      };
    }
  );

  // ── find_references ───────────────────────────────────────────────────────
  server.tool(
    "find_references",
    "Find all places in the project data that reference a specific ID of a given type (actor, skill, item, enemy, state, troop, animation, etc.).",
    {
      projectPath: z
        .string()
        .describe("Absolute path to the RPG Maker MV project root."),
      referenceType: z
        .string()
        .describe(
          'The type of thing being referenced, e.g. "actorId", "skillId", "itemId", "enemyId", "stateId", "troopId", "animationId", "switchId", "variableId".'
        ),
      referenceId: z.number().int().positive().describe("The ID to search for."),
    },
    async ({ projectPath, referenceType, referenceId }) => {
      validateProjectPath(projectPath);
      const results: string[] = [];
      const files = listDataFiles(projectPath);

      for (const file of files) {
        const baseName = file.replace(/\.json$/, "");
        let data: unknown;
        try {
          data = readDataFile<unknown>(projectPath, baseName);
        } catch {
          continue;
        }
        const text = JSON.stringify(data);
        const pattern = `"${referenceType}":${referenceId}`;
        if (text.includes(pattern)) {
          results.push(file);
        }
      }

      // Also check map files
      const mapFiles = listMapFiles(projectPath);
      for (const file of mapFiles) {
        const baseName = file.replace(/\.json$/, "");
        let data: unknown;
        try {
          data = readDataFile<unknown>(projectPath, baseName);
        } catch {
          continue;
        }
        const text = JSON.stringify(data);
        const pattern = `"${referenceType}":${referenceId}`;
        if (text.includes(pattern) && !results.includes(file)) {
          results.push(file);
        }
      }

      return {
        content: [
          {
            type: "text",
            text:
              results.length > 0
                ? `Found references to ${referenceType}=${referenceId} in:\n${results.join("\n")}`
                : `No references to ${referenceType}=${referenceId} found.`,
          },
        ],
      };
    }
  );
}
