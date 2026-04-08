import * as fs from "fs";
import * as path from "path";
import type { RPGPlugin } from "../types/rpgmaker.js";

/**
 * Reads and parses a JSON file from the RPG Maker MV project data directory.
 */
export function readDataFile<T>(projectPath: string, fileName: string): T {
  const filePath = resolveDataPath(projectPath, fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Data file not found: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

/**
 * Writes data to a JSON file in the RPG Maker MV project data directory.
 * Creates a .bak backup of the original file before writing.
 */
export function writeDataFile(
  projectPath: string,
  fileName: string,
  data: unknown
): void {
  const filePath = resolveDataPath(projectPath, fileName);

  // Create backup if file exists
  if (fs.existsSync(filePath)) {
    const backupPath = filePath + ".bak";
    fs.copyFileSync(filePath, backupPath);
  }

  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const content = JSON.stringify(data, null, 2);
  fs.writeFileSync(filePath, content, "utf-8");
}

/**
 * Checks whether a given RPG Maker MV project path looks valid.
 */
export function validateProjectPath(projectPath: string): void {
  if (!projectPath || typeof projectPath !== "string") {
    throw new Error("projectPath must be a non-empty string.");
  }
  if (!fs.existsSync(projectPath)) {
    throw new Error(`Project path does not exist: ${projectPath}`);
  }
  const dataDir = path.join(projectPath, "data");
  if (!fs.existsSync(dataDir)) {
    throw new Error(
      `No 'data' directory found at: ${projectPath}. Is this an RPG Maker MV project?`
    );
  }
}

/**
 * Lists all JSON files in the data directory.
 */
export function listDataFiles(projectPath: string): string[] {
  validateProjectPath(projectPath);
  const dataDir = path.join(projectPath, "data");
  return fs
    .readdirSync(dataDir)
    .filter((f) => f.endsWith(".json"))
    .sort();
}

/**
 * Lists all map JSON files (MapXXX.json) in the data directory.
 */
export function listMapFiles(projectPath: string): string[] {
  return listDataFiles(projectPath).filter((f) =>
    /^Map\d{3}\.json$/.test(f)
  );
}

/**
 * Resolves the full path to a data file.
 * Accepts file names with or without the .json extension.
 */
export function resolveDataPath(projectPath: string, fileName: string): string {
  const name = fileName.endsWith(".json") ? fileName : `${fileName}.json`;
  return path.join(projectPath, "data", name);
}

/**
 * Reads a plugins file (js/plugins.js) which uses a special format.
 * RPG Maker MV stores plugins in a JS assignment, not pure JSON.
 */
export function readPluginsFile(projectPath: string): RPGPlugin[] {
  const filePath = path.join(projectPath, "js", "plugins.js");
  if (!fs.existsSync(filePath)) {
    throw new Error(`Plugins file not found: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  // Strip the JS variable assignment wrapper: var $plugins = [...];
  const match = raw.match(/var\s+\$plugins\s*=\s*(\[[\s\S]*\])\s*;?\s*$/m);
  if (!match) {
    throw new Error("Could not parse plugins.js – unexpected format.");
  }
  return JSON.parse(match[1]) as RPGPlugin[];
}

/**
 * Writes the plugins array back to js/plugins.js.
 */
export function writePluginsFile(
  projectPath: string,
  plugins: RPGPlugin[]
): void {
  const filePath = path.join(projectPath, "js", "plugins.js");

  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, filePath + ".bak");
  }

  const content = `// RPG Maker MV\nvar $plugins =\n${JSON.stringify(plugins, null, 2)};\n`;
  fs.writeFileSync(filePath, content, "utf-8");
}

/**
 * Finds a record by ID in an RPG Maker MV database array (index 0 is null).
 * Returns undefined if not found.
 */
export function findById<T extends { id: number }>(
  arr: (T | null)[],
  id: number
): T | undefined {
  if (id <= 0 || id >= arr.length) return undefined;
  return arr[id] ?? undefined;
}

/**
 * Upserts a record into an RPG Maker MV database array.
 * The array uses 1-based IDs (index 0 is always null).
 * If the record's ID is 0 or exceeds the array bounds, it is appended.
 */
export function upsertRecord<T extends { id: number }>(
  arr: (T | null)[],
  record: T
): (T | null)[] {
  const clone = [...arr];
  if (record.id > 0 && record.id < clone.length) {
    clone[record.id] = record;
  } else {
    // Assign next available ID
    record.id = clone.length;
    clone.push(record);
  }
  return clone;
}

/**
 * Deletes a record from an RPG Maker MV database array by setting it to null.
 */
export function deleteRecord<T extends { id: number }>(
  arr: (T | null)[],
  id: number
): (T | null)[] {
  const clone = [...arr];
  if (id > 0 && id < clone.length) {
    clone[id] = null;
  }
  return clone;
}
