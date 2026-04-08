import { build } from "esbuild";
import { mkdirSync } from "fs";

mkdirSync("dist", { recursive: true });

await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: "dist/index.js",
  external: ["@modelcontextprotocol/sdk", "zod"],
  sourcemap: true,
  target: "node20",
  logLevel: "info",
});
