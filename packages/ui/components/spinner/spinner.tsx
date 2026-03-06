import { useEffect, useState } from "react"
import { useTheme } from "../theme/index"

export interface SpinnerProps {
  text?: string
  color?: string
  interval?: number
}

const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]

export function Spinner({ text = "Loading", color, interval = 100 }: SpinnerProps) {
  const theme = useTheme()
  const resolvedColor = color ?? theme.muted
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((prev) => (prev + 1) % frames.length)
    }, interval)
    return () => clearInterval(timer)
  }, [interval])

  return (
    <text style={{ fg: resolvedColor }}>
      {frames[frame]} {text}
    </text>
  )
}
