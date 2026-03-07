import { BrowserBuffer } from "./browser-buffer"
import { BrowserRenderContext } from "./browser-render-context"
import { bufferToText } from "./buffer-to-text"

// Same lazy-init pattern as BrowserRenderer
let RootRenderableClass: any = null

export function setHeadlessRootRenderableClass(cls: any): void {
  RootRenderableClass = cls
}

export interface HeadlessRendererOptions {
  cols: number
  rows: number
}

export class HeadlessRenderer {
  public buffer: BrowserBuffer
  public renderContext: BrowserRenderContext
  public root: any // RootRenderable

  private cols: number
  private rows: number

  constructor(options: HeadlessRendererOptions) {
    this.cols = options.cols
    this.rows = options.rows

    // Create buffer (no canvas needed)
    this.buffer = BrowserBuffer.create(this.cols, this.rows, "wcwidth")

    // Create render context (no DOM deps)
    this.renderContext = new BrowserRenderContext(this.cols, this.rows)

    // Create root renderable
    if (!RootRenderableClass) {
      throw new Error(
        "RootRenderableClass not set. Call setHeadlessRootRenderableClass before creating HeadlessRenderer.",
      )
    }
    this.root = new RootRenderableClass(this.renderContext)
  }

  renderOnce(): void {
    // Clear buffer
    this.buffer.clear()

    // Run lifecycle passes
    const lifecyclePasses = this.renderContext.getLifecyclePasses()
    for (const renderable of lifecyclePasses) {
      if (renderable.onLifecyclePass) {
        renderable.onLifecyclePass()
      }
    }

    // Calculate layout
    this.root.calculateLayout()

    // Collect render commands
    const renderList: any[] = []
    this.root.updateLayout(0, renderList)

    // Execute render commands
    for (const cmd of renderList) {
      switch (cmd.action) {
        case "pushScissorRect":
          this.buffer.pushScissorRect(cmd.x, cmd.y, cmd.width, cmd.height)
          break
        case "popScissorRect":
          this.buffer.popScissorRect()
          break
        case "pushOpacity":
          this.buffer.pushOpacity(cmd.opacity)
          break
        case "popOpacity":
          this.buffer.popOpacity()
          break
        case "render":
          cmd.renderable.render(this.buffer, 0)
          break
      }
    }

    // Clear stacks
    this.buffer.clearScissorRects()
    this.buffer.clearOpacity()
  }

  toText(): string {
    return bufferToText(this.buffer)
  }

  resize(cols: number, rows: number): void {
    this.cols = cols
    this.rows = rows
    this.buffer.resize(cols, rows)
    this.renderContext.resize(cols, rows)
    this.root.resize(cols, rows)
  }
}
