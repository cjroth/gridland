import type { ReactNode } from "react"
import { useTheme } from "../theme/index"

export type UnderlineStyle = "solid" | "dashed" | "dotted" | "none"

// Attribute bits matching opentui core TextAttributes
const UNDERLINE = 1 << 3
const UNDERLINE_DASHED = 1 << 4
const UNDERLINE_DOTTED = 1 << 6

export interface LinkProps {
  children: ReactNode
  url: string
  underline?: UnderlineStyle
  color?: string
}

export function Link({ children, url, underline = "solid", color }: LinkProps) {
  const theme = useTheme()
  const resolvedColor = color ?? theme.accent

  let attributes = 0
  if (underline === "solid") {
    attributes = UNDERLINE
  } else if (underline === "dashed") {
    attributes = UNDERLINE | UNDERLINE_DASHED
  } else if (underline === "dotted") {
    attributes = UNDERLINE | UNDERLINE_DOTTED
  }

  return (
    <text>
      <a href={url} style={{ attributes, fg: resolvedColor }}>{children}</a>
    </text>
  )
}
