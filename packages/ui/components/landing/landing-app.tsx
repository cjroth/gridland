// @ts-nocheck
import { useState } from "react"
import { StatusBar } from "../status-bar/status-bar"
import { useBreakpoints } from "../breakpoints/use-breakpoints"
import { useTheme } from "../theme/index"
import { Logo } from "./logo"
import { InstallBox } from "./install-box"
import { LinksBox } from "./links-box"
import { MatrixBackground } from "./matrix-background"
import { AboutModal } from "./about-modal"

interface LandingAppProps {
  useKeyboard: any
}

export function LandingApp({ useKeyboard }: LandingAppProps) {
  const theme = useTheme()
  const { width, height, isNarrow, isTiny, isMobile } = useBreakpoints()
  const [showAbout, setShowAbout] = useState(false)

  useKeyboard((event: any) => {
    if (event.name === "a" && !showAbout) {
      setShowAbout(true)
    }
  })

  if (showAbout) {
    return (
      <box flexDirection="column" width="100%" height="100%">
        <box flexGrow={1}>
          <AboutModal onClose={() => setShowAbout(false)} useKeyboard={useKeyboard} />
        </box>
        <StatusBar items={[{ key: "Esc", label: "close" }]} />
      </box>
    )
  }

  return (
    <box width="100%" height="100%" position="relative">
      <MatrixBackground width={width} height={height} />
      <box
        position="absolute"
        top={0}
        left={0}
        width="100%"
        height="100%"
        zIndex={1}
        flexDirection="column"
        shouldFill={false}
      >
        <box flexGrow={1} flexDirection="column" paddingTop={3} paddingLeft={1} paddingRight={1} paddingBottom={1} gap={isMobile ? 0 : 1} shouldFill={false}>
          <box flexShrink={0} shouldFill={false}>
            <Logo compact={isTiny} narrow={isNarrow} mobile={isMobile} />
          </box>
          <box flexDirection={isNarrow ? "column" : "row"} gap={isMobile ? 0 : 1} flexShrink={0} shouldFill={false}>
            <InstallBox />
            <LinksBox />
          </box>
          <box
            flexGrow={1}
            border
            borderStyle="rounded"
            borderColor={theme.border}
            shouldFill={false}
          />
        </box>
        <StatusBar
          items={[
            { key: "a", label: "about" },
          ]}
        />
      </box>
    </box>
  )
}
