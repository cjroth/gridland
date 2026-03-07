import { describe, it, expect } from "bun:test"
import { HeadlessRenderer, setHeadlessRootRenderableClass } from "../headless-renderer"
import { bufferToText } from "../buffer-to-text"
import { RootRenderable } from "../core-shims/index"

// Set up the RootRenderable class for headless rendering
setHeadlessRootRenderableClass(RootRenderable)

describe("HeadlessRenderer", () => {
  it("creates with correct dimensions", () => {
    const renderer = new HeadlessRenderer({ cols: 80, rows: 24 })
    expect(renderer.buffer.width).toBe(80)
    expect(renderer.buffer.height).toBe(24)
    expect(renderer.renderContext.width).toBe(80)
    expect(renderer.renderContext.height).toBe(24)
    expect(renderer.root).toBeDefined()
  })

  it("renderOnce clears and populates buffer", () => {
    const renderer = new HeadlessRenderer({ cols: 40, rows: 10 })
    // renderOnce should run without errors even with an empty tree
    renderer.renderOnce()
    // Buffer should be cleared (all spaces)
    expect(bufferToText(renderer.buffer)).toBe("")
  })

  it("toText returns buffer content as string", () => {
    const renderer = new HeadlessRenderer({ cols: 20, rows: 5 })
    renderer.renderOnce()
    const text = renderer.toText()
    expect(typeof text).toBe("string")
  })

  it("resize updates dimensions", () => {
    const renderer = new HeadlessRenderer({ cols: 40, rows: 10 })
    renderer.resize(60, 20)
    expect(renderer.buffer.width).toBe(60)
    expect(renderer.buffer.height).toBe(20)
    expect(renderer.renderContext.width).toBe(60)
    expect(renderer.renderContext.height).toBe(20)
  })

  it("throws without RootRenderableClass", () => {
    // Temporarily unset the class
    const savedClass = (HeadlessRenderer as any).__test_getRootClass?.()
    setHeadlessRootRenderableClass(null as any)
    expect(() => new HeadlessRenderer({ cols: 10, rows: 5 })).toThrow(
      "RootRenderableClass not set",
    )
    // Restore
    setHeadlessRootRenderableClass(RootRenderable)
  })
})
