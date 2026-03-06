import { Tab, Tabs } from "fumadocs-ui/components/tabs"
import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock"

export function RunDemo({ name }: { name: string }) {
  return (
    <>
      <h2>Run demo</h2>
      <Tabs items={["bunx", "npx", "curl"]}>
        <Tab value="bunx">
          <DynamicCodeBlock lang="bash" code={`bunx @gridland/demo ${name}`} codeblock={{ title: "Terminal" }} />
        </Tab>
        <Tab value="npx">
          <DynamicCodeBlock lang="bash" code={`npx @gridland/demo ${name}`} codeblock={{ title: "Terminal" }} />
        </Tab>
        <Tab value="curl">
          <DynamicCodeBlock lang="bash" code={`curl -fsSL https://raw.githubusercontent.com/cjroth/gridland/main/scripts/run-demo.sh | bash -s ${name}`} codeblock={{ title: "Terminal" }} />
        </Tab>
      </Tabs>
    </>
  )
}
