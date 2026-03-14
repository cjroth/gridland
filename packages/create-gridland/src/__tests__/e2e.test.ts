import { describe, it, expect, beforeAll, beforeEach, afterEach } from "bun:test"
import { execSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import os from "node:os"

const CLI_PATH = path.resolve(__dirname, "../../dist/index.js")
const MONOREPO_ROOT = path.resolve(__dirname, "../../../..")

// Pre-pack local packages as tarballs so e2e tests install real npm-like
// packages (not file: links which cause resolution issues with Vite/Rollup).
let tarballs: Record<string, string> = {}

beforeAll(() => {
  const tarballDir = fs.mkdtempSync(path.join(os.tmpdir(), "gridland-tarballs-"))
  const packages: Record<string, string> = {
    "@gridland/web": path.join(MONOREPO_ROOT, "packages/web"),
    "@gridland/demo": path.join(MONOREPO_ROOT, "packages/demo"),
  }
  for (const [name, pkgDir] of Object.entries(packages)) {
    const output = execSync(`npm pack --pack-destination ${tarballDir}`, {
      cwd: pkgDir,
      encoding: "utf-8",
      timeout: 30000,
    }).trim()
    // npm pack outputs the filename on the last line
    const filename = output.split("\n").pop()!.trim()
    tarballs[name] = path.join(tarballDir, filename)
  }
})

let tmpDir: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "create-gridland-e2e-"))
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

function runCli(args: string): string {
  return execSync(`bun ${CLI_PATH} ${args}`, {
    cwd: tmpDir,
    encoding: "utf-8",
    timeout: 30000,
  })
}

function runInProject(projectName: string, cmd: string): string {
  return execSync(cmd, {
    cwd: path.join(tmpDir, projectName),
    encoding: "utf-8",
    timeout: 120000,
  })
}

/**
 * Override @gridland/* dependencies with local tarball paths so e2e tests
 * work without requiring packages to be published to npm first.
 */
function useLocalPackages(projectName: string) {
  const projectDir = path.join(tmpDir, projectName)
  const pkgPath = path.join(projectDir, "package.json")
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"))

  for (const [name, tarball] of Object.entries(tarballs)) {
    if (pkg.dependencies?.[name]) {
      pkg.dependencies[name] = `file:${tarball}`
    }
  }

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n")
}

describe("e2e: vite project", () => {
  it("builds successfully", () => {
    runCli("test-vite --framework vite --no-git --no-install")
    useLocalPackages("test-vite")
    runInProject("test-vite", "bun install")
    runInProject("test-vite", "bun run build")

    expect(fs.existsSync(path.join(tmpDir, "test-vite", "dist"))).toBe(true)
  })

  it("typescript compiles clean", () => {
    runCli("test-vite-tsc --framework vite --no-git --no-install")
    useLocalPackages("test-vite-tsc")
    runInProject("test-vite-tsc", "bun install")
    runInProject("test-vite-tsc", "npx tsc --noEmit")
  })
})

describe("e2e: next project", () => {
  it("builds successfully", () => {
    runCli("test-next --framework next --no-git --no-install")
    useLocalPackages("test-next")
    runInProject("test-next", "bun install")
    runInProject("test-next", "bun run build")

    expect(fs.existsSync(path.join(tmpDir, "test-next", ".next"))).toBe(true)
  })

  it("typescript compiles clean", () => {
    runCli("test-next-tsc --framework next --no-git --no-install")
    useLocalPackages("test-next-tsc")
    runInProject("test-next-tsc", "bun install")
    runInProject("test-next-tsc", "npx tsc --noEmit")
  })
})
