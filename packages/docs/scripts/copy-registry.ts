import fs from "node:fs"
import path from "node:path"

const registryDir = path.resolve(import.meta.dirname, "../../ui/registry")
const outDir = path.resolve(import.meta.dirname, "../public/r")

fs.mkdirSync(outDir, { recursive: true })

// Copy each registry item JSON
for (const file of fs.readdirSync(registryDir)) {
  if (!file.endsWith(".json")) continue
  fs.copyFileSync(path.join(registryDir, file), path.join(outDir, file))
}

// Copy top-level registry.json as index
fs.copyFileSync(
  path.resolve(import.meta.dirname, "../../ui/registry.json"),
  path.join(outDir, "index.json"),
)

console.log(`Copied registry items to ${outDir}`)
