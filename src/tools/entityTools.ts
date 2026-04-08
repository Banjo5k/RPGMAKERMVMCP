import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  readDataFile,
  writeDataFile,
  findById,
  upsertRecord,
  deleteRecord,
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
} from "../types/rpgmaker.js";

type DB<T> = (T | null)[];

function pluralize(entity: string): string {
  if (entity === "Class") return "Classes";
  if (entity === "Enemy") return "Enemies";
  if (entity === "CommonEvent") return "CommonEvents";
  return `${entity}s`;
}

/** Convert PascalCase entity name to snake_case for tool names */
function toSnakeCase(s: string): string {
  return s.replace(/([A-Z])/g, (_, c, i) => (i > 0 ? `_${c}` : c)).toLowerCase();
}

function makeDbTools<T extends { id: number }>(
  server: McpServer,
  entity: string,
  fileName: string,
  exampleFields: string
): void {
  const entitySnake = toSnakeCase(entity);
  const pluralSnake = toSnakeCase(pluralize(entity));

  // ── get ──────────────────────────────────────────────────────────────────
  server.tool(
    `get_${entitySnake}`,
    `Get a specific ${entity} by ID from the RPG Maker MV project.`,
    {
      projectPath: z
        .string()
        .describe("Absolute path to the RPG Maker MV project root."),
      id: z.number().int().positive().describe(`${entity} ID (1-based).`),
    },
    async ({ projectPath, id }) => {
      const db = readDataFile<DB<T>>(projectPath, fileName);
      const record = findById(db, id);
      if (!record) {
        return {
          isError: true,
          content: [{ type: "text", text: `${entity} with ID ${id} not found.` }],
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(record, null, 2) }],
      };
    }
  );

  // ── list ─────────────────────────────────────────────────────────────────
  server.tool(
    `list_${pluralSnake}`,
    `List all ${entity} records (id + name) in the RPG Maker MV project.`,
    {
      projectPath: z
        .string()
        .describe("Absolute path to the RPG Maker MV project root."),
    },
    async ({ projectPath }) => {
      const db = readDataFile<DB<T & { name?: string }>>(projectPath, fileName);
      const items = db
        .filter((x): x is T & { name?: string } => x !== null)
        .map((x) => `ID ${x.id}: ${x.name ?? "(no name)"}`);
      return {
        content: [
          {
            type: "text",
            text: items.length > 0 ? items.join("\n") : `No ${pluralSnake.replace(/_/g, " ")} found.`,
          },
        ],
      };
    }
  );

  // ── create / update ───────────────────────────────────────────────────────
  server.tool(
    `upsert_${entitySnake}`,
    `Create or update a ${entity} record. If id is 0 a new record is appended; otherwise the existing record is replaced. Fields: ${exampleFields}`,
    {
      projectPath: z
        .string()
        .describe("Absolute path to the RPG Maker MV project root."),
      data: z
        .string()
        .describe(`JSON string representing the ${entity} object.`),
    },
    async ({ projectPath, data }) => {
      let record: T;
      try {
        record = JSON.parse(data) as T;
      } catch (e) {
        return {
          isError: true,
          content: [{ type: "text", text: `Invalid JSON: ${(e as Error).message}` }],
        };
      }
      const db = readDataFile<DB<T>>(projectPath, fileName);
      const updated = upsertRecord(db, record);
      writeDataFile(projectPath, fileName, updated);
      return {
        content: [
          {
            type: "text",
            text: `${entity} ID ${record.id} saved successfully.`,
          },
        ],
      };
    }
  );

  // ── delete ────────────────────────────────────────────────────────────────
  server.tool(
    `delete_${entitySnake}`,
    `Delete a ${entity} by ID (sets the slot to null in the database array).`,
    {
      projectPath: z
        .string()
        .describe("Absolute path to the RPG Maker MV project root."),
      id: z.number().int().positive().describe(`${entity} ID to delete.`),
    },
    async ({ projectPath, id }) => {
      const db = readDataFile<DB<T>>(projectPath, fileName);
      const updated = deleteRecord(db, id);
      writeDataFile(projectPath, fileName, updated);
      return {
        content: [
          { type: "text", text: `${entity} ID ${id} deleted (slot set to null).` },
        ],
      };
    }
  );
}

/** Register all entity (actor, class, skill, …) CRUD tools. */
export function registerEntityTools(server: McpServer): void {
  makeDbTools<RPGActor>(
    server,
    "Actor",
    "Actors",
    "id, name, classId, initialLevel, maxLevel, equips[], traits[], faceName, faceIndex, characterName, characterIndex, battlerName, profile, nickname, note"
  );

  makeDbTools<RPGClass>(
    server,
    "Class",
    "Classes",
    "id, name, expParams[4], learnings[], traits[], params[][], note"
  );

  makeDbTools<RPGSkill>(
    server,
    "Skill",
    "Skills",
    "id, name, stypeId, mpCost, tpCost, damage{}, scope, occasion, speed, successRate, repeats, tpGain, hitType, animationId, message1, message2, effects[], description, iconIndex, note"
  );

  makeDbTools<RPGItem>(
    server,
    "Item",
    "Items",
    "id, name, itypeId, price, consumable, damage{}, scope, occasion, speed, successRate, repeats, tpGain, hitType, animationId, effects[], description, iconIndex, note"
  );

  makeDbTools<RPGWeapon>(
    server,
    "Weapon",
    "Weapons",
    "id, name, wtypeId, price, animationId, params[8], traits[], description, iconIndex, note, etypeId"
  );

  makeDbTools<RPGArmor>(
    server,
    "Armor",
    "Armors",
    "id, name, atypeId, etypeId, price, params[8], traits[], description, iconIndex, note"
  );

  makeDbTools<RPGEnemy>(
    server,
    "Enemy",
    "Enemies",
    "id, name, battlerName, battlerHue, params[8], exp, gold, dropItems[], actions[], traits[], note"
  );

  makeDbTools<RPGState>(
    server,
    "State",
    "States",
    "id, name, restriction, priority, autoRemovalTiming, minTurns, maxTurns, removeByDamage, chanceByDamage, removeByWalking, stepsToRemove, removeAtBattleEnd, removeByRestriction, motion, overlay, traits[], message1-4, iconIndex, note"
  );

  makeDbTools<RPGTroop>(
    server,
    "Troop",
    "Troops",
    "id, name, members[], pages[]"
  );

  makeDbTools<RPGCommonEvent>(
    server,
    "CommonEvent",
    "CommonEvents",
    "id, name, trigger (0=None,1=Autorun,2=Parallel), switchId, list[]"
  );
}
