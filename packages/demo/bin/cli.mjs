#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { execSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const AVAILABLE_DEMOS = JSON.parse(
  readFileSync(join(__dirname, "../dist/demo-names.json"), "utf-8")
);

const name = process.argv[2];

if (!name || name === "--help" || name === "-h") {
  console.log("Usage: gridland-demo <demo-name>\n");
  console.log("Available demos:");
  for (const d of AVAILABLE_DEMOS) {
    console.log(`  ${d}`);
  }
  console.log("\nExamples:");
  console.log("  bunx @gridland/demo ascii");
  console.log("  bunx @gridland/demo gradient");
  process.exit(name ? 0 : 1);
}

if (!AVAILABLE_DEMOS.includes(name)) {
  console.error(`Unknown demo: "${name}"`);
  console.error(`Available: ${AVAILABLE_DEMOS.join(", ")}`);
  process.exit(1);
}

// @opentui/core uses bun:ffi for the native terminal renderer, so we must run under bun
let hasBun = false;
try {
  execSync("bun --version", { stdio: "ignore" });
  hasBun = true;
} catch {}

if (!hasBun) {
  console.error("Error: bun is required to run gridland demos.");
  console.error("Install it with: curl -fsSL https://bun.sh/install | bash");
  console.error("\nThen run: bunx @gridland/demo " + name);
  process.exit(1);
}

const runPath = join(__dirname, "../dist/run.js");
const { status } = spawnSync("bun", ["-e", `import("${runPath}").then(m => m.runDemo("${name}"))`], {
  stdio: "inherit",
});
process.exit(status ?? 1);
