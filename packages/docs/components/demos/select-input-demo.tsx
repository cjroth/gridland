// @ts-nocheck — OpenTUI intrinsic elements conflict with React's HTML/SVG types
"use client"
import { TUI } from "@gridland/web"
import { TerminalWindow } from "@/components/ui/mac-window"
import { SelectInput, useTheme, ThemeProvider, darkTheme } from "@gridland/ui"

const items = [
  { label: "TypeScript", value: "ts" },
  { label: "JavaScript", value: "js" },
  { label: "Python", value: "py" },
  { label: "Rust", value: "rs" },
]

function SelectInputApp() {
  const theme = useTheme()
  return (
    <box padding={1} flexDirection="column" gap={1}>
      <text style={{ fg: theme.text }} bold>Choose a language:</text>
      <text> </text>
      <SelectInput items={items} />
    </box>
  )
}

export default function SelectInputDemo() {
  return (
    <TerminalWindow title="SelectInput">
      <TUI style={{ width: "100%", height: 160 }}>
        <SelectInputApp />
      </TUI>
    </TerminalWindow>
  )
}
