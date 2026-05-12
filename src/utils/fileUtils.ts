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
  try {
    return JSON.parse(raw) as T;
  } catch (e) {
    throw new Error(
      `Failed to parse JSON in ${filePath}: ${(e as Error).message}`
    );
  }
}

/**
 * Atomically writes string content to a file by writing to a sibling
 * temp file and renaming over the destination. This prevents partial
 * writes from corrupting RPG Maker MV project data on crash / power loss.
 */
function atomicWriteFile(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.writeFileSync(tmpPath, content, "utf-8");
    fs.renameSync(tmpPath, filePath);
  } catch (e) {
    // Best-effort cleanup of stray temp file
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch {
      /* ignore */
    }
    throw e;
  }
}

/**
 * Writes data to a JSON file in the RPG Maker MV project data directory.
 * Creates a .bak backup of the original file before writing, and writes
 * atomically to prevent partial-write corruption.
 */
export function writeDataFile(
  projectPath: string,
  fileName: string,
  data: unknown
): void {
  const filePath = resolveDataPath(projectPath, fileName);

  // Create backup if file exists
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, filePath + ".bak");
  }

  const content = JSON.stringify(data, null, 2);
  atomicWriteFile(filePath, content);
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
 *
 * Hardened against path-traversal: the file name must be a plain
 * file name (no directory separators, no `..` segments, not absolute)
 * and must resolve to a path inside the project's `data/` directory.
 */
export function resolveDataPath(projectPath: string, fileName: string): string {
  if (typeof fileName !== "string" || fileName.length === 0) {
    throw new Error("fileName must be a non-empty string.");
  }
  const name = fileName.endsWith(".json") ? fileName : `${fileName}.json`;
  assertSafeRelativeName(name, "fileName");

  const dataDir = path.resolve(projectPath, "data");
  const resolved = path.resolve(dataDir, name);
  // Ensure the resolved path stays inside the data directory.
  const rel = path.relative(dataDir, resolved);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`Unsafe fileName rejected: ${fileName}`);
  }
  return resolved;
}

/**
 * Validates that a name is a safe single-segment relative file name.
 * Rejects absolute paths, parent traversals, and path separators.
 */
function assertSafeRelativeName(name: string, label: string): void {
  if (
    name.includes("\0") ||
    name.includes("/") ||
    name.includes("\\") ||
    name === "." ||
    name === ".." ||
    name.split(/[\\/]/).some((seg) => seg === "..") ||
    path.isAbsolute(name)
  ) {
    throw new Error(`Unsafe ${label} rejected: ${name}`);
  }
}

/**
 * Reads a plugins file (js/plugins.js) which uses a special format.
 * RPG Maker MV stores plugins in a JS assignment, not pure JSON.
 *
 * Tolerates `var`, `let`, `const`, optional trailing semicolon and
 * any trailing whitespace/comments after the array literal.
 */
export function readPluginsFile(projectPath: string): RPGPlugin[] {
  const filePath = path.join(projectPath, "js", "plugins.js");
  if (!fs.existsSync(filePath)) {
    throw new Error(`Plugins file not found: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  // Strip the JS variable assignment wrapper: (var|let|const) $plugins = [...];
  const match = raw.match(
    /(?:var|let|const)\s+\$plugins\s*=\s*(\[[\s\S]*\])\s*;?/
  );
  if (!match) {
    throw new Error("Could not parse plugins.js – unexpected format.");
  }
  try {
    return JSON.parse(match[1]) as RPGPlugin[];
  } catch (e) {
    throw new Error(
      `Could not parse plugins.js – invalid JSON in $plugins array: ${
        (e as Error).message
      }`
    );
  }
}

/**
 * Writes the plugins array back to js/plugins.js (atomically, with a .bak).
 */
export function writePluginsFile(
  projectPath: string,
  plugins: RPGPlugin[]
): void {
  const filePath = path.join(projectPath, "js", "plugins.js");

  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, filePath + ".bak");
  }

  const content = `// RPG Maker MV\nvar $plugins =\n${JSON.stringify(
    plugins,
    null,
    2
  )};\n`;
  atomicWriteFile(filePath, content);
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
 * If the record's ID is 0 or exceeds the array bounds, it is appended
 * and assigned the next available ID.
 */
export function upsertRecord<T extends { id: number }>(
  arr: (T | null)[],
  record: T
): (T | null)[] {
  const clone = [...arr];
  // Ensure RPG Maker MV's 1-based-ID invariant: index 0 must be null.
  if (clone.length === 0) {
    clone.push(null);
  } else if (clone[0] !== null) {
    clone.unshift(null);
  }
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
