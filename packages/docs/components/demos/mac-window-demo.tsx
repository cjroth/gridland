// @ts-nocheck — OpenTUI intrinsic elements conflict with React's HTML/SVG types
"use client"
import { TUI } from "@gridland/web"
import { TerminalWindow, textStyle, useTheme } from "@gridland/ui"

function TerminalApp() {
  const theme = useTheme()
  return (
    <box flexDirection="column" padding={1}>
      <text style={textStyle({ fg: theme.secondary })}>$ echo "Hello from TerminalWindow"</text>
      <text>Hello from TerminalWindow</text>
      <text style={textStyle({ fg: theme.secondary })}>$ _</text>
    </box>
  )
}

export default function TerminalWindowDemo() {
  return (
    <TerminalWindow title="Terminal" minWidth={400}>
      <TUI style={{ width: "100%", height: 120 }}>
        <TerminalApp />
      </TUI>
    </TerminalWindow>
  )
}
