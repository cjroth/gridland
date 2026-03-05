// @ts-nocheck — OpenTUI intrinsic elements conflict with React's HTML/SVG types
"use client"
import { TUI } from "@polyterm.io/web"
import { TerminalWindow } from "@/components/ui/mac-window"
import { Spinner } from "@polyterm.io/ui"

export default function SpinnerDemo() {
  return (
    <TerminalWindow title="Spinner">
      <TUI style={{ width: "100%", height: 80 }}>
        <box padding={1} flexDirection="column" gap={1}>
          <Spinner text="Loading..." color="cyan" />
          <Spinner text="Processing" color="#a3be8c" />
        </box>
      </TUI>
    </TerminalWindow>
  )
}
