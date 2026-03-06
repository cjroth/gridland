// @ts-nocheck — OpenTUI intrinsic elements conflict with React's HTML/SVG types
"use client"
import { TUI } from "@gridland/web"
import { TerminalWindow } from "@/components/ui/mac-window"
import { TextInput, useTheme } from "@gridland/ui"

function TextInputApp() {
  const theme = useTheme()
  return (
    <box padding={1} flexDirection="column" gap={1}>
      <text style={{ fg: theme.text }} bold>Enter your name:</text>
      <TextInput placeholder="Type something..." prompt="> " />
    </box>
  )
}

export default function TextInputDemo() {
  return (
    <TerminalWindow title="TextInput">
      <TUI style={{ width: "100%", height: 80 }}>
        <TextInputApp />
      </TUI>
    </TerminalWindow>
  )
}
