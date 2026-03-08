import * as readline from "readline"

function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
}

function ask(question: string): Promise<string> {
  const rl = createInterface()
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

function askYesNo(question: string, defaultYes = true): Promise<boolean> {
  const hint = defaultYes ? "Y/n" : "y/N"
  return ask(`${question} (${hint}): `).then((answer) => {
    if (!answer) return defaultYes
    return answer.toLowerCase().startsWith("y")
  })
}

export async function promptProjectName(initial?: string): Promise<string> {
  if (initial) return initial
  const answer = await ask("Project name (my-gridland-app): ")
  return answer || "my-gridland-app"
}

export async function promptFramework(): Promise<"vite" | "next"> {
  console.log("\nFramework:")
  console.log("  1. Vite")
  console.log("  2. Next.js")
  const answer = await ask("\nSelect framework (1): ")
  if (answer === "2" || answer.toLowerCase() === "next") return "next"
  return "vite"
}

export async function promptInstallDeps(): Promise<boolean> {
  return askYesNo("\nInstall dependencies?")
}

export async function promptInitGit(): Promise<boolean> {
  return askYesNo("Initialize git repository?")
}
