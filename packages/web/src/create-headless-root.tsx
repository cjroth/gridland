import React, { type ReactNode } from "react"
import type { HeadlessRenderer } from "./headless-renderer"
import { BrowserContext } from "./browser-context"

// Import from opentui react through Vite aliases
import { _render } from "../../../opentui/packages/react/src/reconciler/reconciler"
import { AppContext } from "../../../opentui/packages/react/src/components/app"
// eslint-disable-next-line @typescript-eslint/no-require-imports
import { ErrorBoundary as _ErrorBoundary } from "../../../opentui/packages/react/src/components/error-boundary"

const ErrorBoundary = _ErrorBoundary as unknown as React.ComponentType<{ children: React.ReactNode }>

export interface HeadlessRoot {
  render(node: ReactNode): void
  renderToText(node: ReactNode): Promise<string>
  unmount(): void
}

export function createHeadlessRoot(renderer: HeadlessRenderer): HeadlessRoot {
  let unmountFn: (() => void) | null = null

  return {
    render(node: ReactNode) {
      const element = (
        <BrowserContext.Provider value={{ renderContext: renderer.renderContext }}>
          <AppContext.Provider value={{ keyHandler: renderer.renderContext.keyInput as any, renderer: renderer.renderContext as any }}>
            <ErrorBoundary>{node}</ErrorBoundary>
          </AppContext.Provider>
        </BrowserContext.Provider>
      )
      unmountFn = _render(element, renderer.root)
    },
    async renderToText(node: ReactNode): Promise<string> {
      this.render(node)
      // Flush reconciler — the opentui reconciler may schedule via microtasks
      await new Promise((r) => setTimeout(r, 0))
      renderer.renderOnce()
      return renderer.toText()
    },
    unmount() {
      if (unmountFn) {
        // Reconciler cleanup would happen here
      }
    },
  }
}
