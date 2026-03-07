import { source } from "@/lib/source"
import type { InferPageType } from "fumadocs-core/source"

export async function getLLMText(page: InferPageType<typeof source>) {
  const processed = await page.data.getText("processed")

  // Strip import statements and JSX component tags that leak through
  // the MDX processing in our webpack-based static export setup
  const cleaned = processed
    .split("\n")
    .filter((line) => !line.startsWith("import "))
    .join("\n")
    .replace(/^\s*<[A-Z][A-Za-z]*(?:\s[^>]*)?\/?>\s*$/gm, "")
    .replace(/^\s*<\/[A-Z][A-Za-z]*>\s*$/gm, "")

  return `# ${page.data.title} (${page.url})

${cleaned}`
}
