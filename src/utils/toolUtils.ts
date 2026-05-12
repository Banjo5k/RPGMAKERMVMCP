/**
 * Shared helpers for MCP tool handlers.
 */

export interface McpTextContent {
  type: "text";
  text: string;
}

export interface McpToolResult {
  content: McpTextContent[];
  isError?: boolean;
}

/**
 * Wraps a tool handler so that any thrown error is converted into a
 * friendly MCP error response instead of crashing the server / leaking
 * a stack trace through stdio.
 */
export function safeHandler<Args>(
  handler: (args: Args) => Promise<McpToolResult> | McpToolResult
): (args: Args) => Promise<McpToolResult> {
  return async (args: Args) => {
    try {
      return await handler(args);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        isError: true,
        content: [{ type: "text", text: `Error: ${msg}` }],
      };
    }
  };
}

/**
 * Parses a JSON string and ensures it represents a plain object
 * (not null, not an array, not a primitive). Used by the various
 * `update_*` / `upsert_*` tools that merge user-supplied properties
 * into existing objects via spread/Object.assign.
 */
export function parseJsonObject(
  input: string,
  label = "input"
): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch (e) {
    throw new Error(`Invalid JSON for ${label}: ${(e as Error).message}`);
  }
  if (
    parsed === null ||
    typeof parsed !== "object" ||
    Array.isArray(parsed)
  ) {
    throw new Error(
      `${label} must be a JSON object (got ${
        Array.isArray(parsed) ? "array" : typeof parsed
      }).`
    );
  }
  return parsed as Record<string, unknown>;
}

/**
 * Returns a 3-digit zero-padded map file base name (e.g. 1 -> "Map001").
 */
export function mapBaseName(mapId: number): string {
  return `Map${String(mapId).padStart(3, "0")}`;
}
