// @ts-nocheck
import { useMatrix } from "./use-matrix"

interface MatrixBackgroundProps {
  width: number
  height: number
}

const MUTED_GREENS = [
  "#0a1a0a",
  "#0d2a0d",
  "#103510",
  "#154015",
  "#1a4a1a",
]

function greenForBrightness(b: number): string {
  if (b >= 1.0) return MUTED_GREENS[4]
  const idx = Math.min(Math.floor(b * (MUTED_GREENS.length - 1)), MUTED_GREENS.length - 2)
  return MUTED_GREENS[idx]
}

export function MatrixBackground({ width, height }: MatrixBackgroundProps) {
  const { grid, brightness } = useMatrix(width, height)

  return (
    <box flexDirection="column">
      {grid.map((row, y) => (
        <text key={y}>
          {row.map((cell, x) => {
            if (cell === " ") {
              return <span key={x}>{cell}</span>
            }
            return (
              <span
                key={x}
                style={{
                  fg: greenForBrightness(brightness[y][x]),
                }}
              >
                {cell}
              </span>
            )
          })}
        </text>
      ))}
    </box>
  )
}
