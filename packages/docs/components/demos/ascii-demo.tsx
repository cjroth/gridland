// @ts-nocheck — OpenTUI intrinsic elements conflict with React's HTML/SVG types
"use client"
import { TUI } from "@polyterm.io/web"
import { TerminalWindow } from "@/components/ui/mac-window"
import figlet from "figlet"
// @ts-ignore — importable-fonts has no type declarations
import ansiShadow from "figlet/importable-fonts/ANSI Shadow.js"

figlet.parseFont("ANSI Shadow", ansiShadow)

const art = figlet.textSync("OpenTUI", { font: "ANSI Shadow" as any })
const lines = art.split("\n").filter((l) => l.trimEnd().length > 0)

export default function AsciiDemo() {
  return (
    <TerminalWindow title="Ascii">
      <TUI style={{ width: "100%", height: 220 }}>
        <box padding={1} flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
          {lines.map((line, i) => (
            <text key={i} fg="#88c0d0" bold>
              {line}
            </text>
          ))}
        </box>
      </TUI>
    </TerminalWindow>
  )
}
