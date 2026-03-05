// @ts-nocheck — OpenTUI intrinsic elements conflict with React's HTML/SVG types
"use client"
import { TUI } from "@polyterm.io/web"
import { TerminalWindow } from "@polyterm.io/ui"
import { textStyle } from "@polyterm.io/ui"

function TerminalApp() {
  return (
    <box flexDirection="column" padding={1}>
      <text style={textStyle({ fg: "green" })}>$ echo "Hello from TerminalWindow"</text>
      <text>Hello from TerminalWindow</text>
      <text style={textStyle({ fg: "green" })}>$ _</text>
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
