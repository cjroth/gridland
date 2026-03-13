import { useTheme } from "../theme/index"

export interface AsciiProps {
  text: string
  font?: "tiny" | "block" | "slick" | "shade"
  color?: string
}

export function Ascii({ text, font, color }: AsciiProps) {
  const theme = useTheme()
  const resolvedColor = color ?? theme.primary
  return <ascii-font text={text} font={font} style={{ fg: resolvedColor }} />
}
