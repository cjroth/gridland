// @ts-nocheck — OpenTUI intrinsic elements conflict with React's HTML/SVG types
"use client"
import { TUI } from "@polyterm.io/web"
import { useKeyboard } from "@opentui/react"
import { TerminalWindow } from "@/components/ui/mac-window"
import { LinkDemo as LinkDemoComponent } from "@polyterm.io/ui"

export default function LinkDemo() {
  return (
    <TerminalWindow title="Link">
      <TUI style={{ width: "100%", height: 120 }}>
        <box padding={1}>
          <LinkDemoComponent useKeyboard={useKeyboard} />
        </box>
      </TUI>
    </TerminalWindow>
  )
}
