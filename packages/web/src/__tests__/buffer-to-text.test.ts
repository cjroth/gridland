import { describe, it, expect } from "bun:test"
import { BrowserBuffer } from "../browser-buffer"
import { RGBA } from "../core-shims/rgba"
import { bufferToText } from "../buffer-to-text"

const white = RGBA.fromValues(1, 1, 1, 1)
const transparent = RGBA.fromValues(0, 0, 0, 0)

describe("bufferToText", () => {
  it("returns empty string for a buffer with only spaces", () => {
    const buf = BrowserBuffer.create(10, 3, "wcwidth")
    // Buffer is filled with spaces (0x20) by default
    expect(bufferToText(buf)).toBe("")
  })

  it("extracts text written to the buffer", () => {
    const buf = BrowserBuffer.create(20, 5, "wcwidth")
    buf.drawText("Hello", 0, 0, white, transparent)
    buf.drawText("World", 0, 1, white, transparent)
    const text = bufferToText(buf)
    expect(text).toBe("Hello\nWorld")
  })

  it("trims trailing spaces on each line", () => {
    const buf = BrowserBuffer.create(20, 3, "wcwidth")
    buf.drawText("Hi", 0, 0, white, transparent)
    buf.drawText("There", 5, 0, white, transparent)
    const text = bufferToText(buf)
    // "Hi" at col 0-1, spaces at col 2-4, "There" at col 5-9, then trailing spaces trimmed
    expect(text).toBe("Hi   There")
  })

  it("trims trailing empty lines", () => {
    const buf = BrowserBuffer.create(20, 10, "wcwidth")
    buf.drawText("Line 1", 0, 0, white, transparent)
    buf.drawText("Line 3", 0, 2, white, transparent)
    const text = bufferToText(buf)
    expect(text).toBe("Line 1\n\nLine 3")
  })

  it("handles unicode characters", () => {
    const buf = BrowserBuffer.create(20, 3, "wcwidth")
    buf.drawText("café", 0, 0, white, transparent)
    const text = bufferToText(buf)
    expect(text).toBe("café")
  })

  it("handles box drawing characters", () => {
    const buf = BrowserBuffer.create(10, 3, "wcwidth")
    const borderColor = RGBA.fromValues(1, 1, 1, 1)
    const bgColor = RGBA.fromValues(0, 0, 0, 1)
    buf.drawBox({
      x: 0,
      y: 0,
      width: 5,
      height: 3,
      border: true,
      borderColor,
      backgroundColor: bgColor,
    })
    const text = bufferToText(buf)
    // Should contain box drawing characters (rounded corners by default)
    expect(text).toContain("╭")
    expect(text).toContain("╮")
    expect(text).toContain("╰")
    expect(text).toContain("╯")
  })

  it("treats null char codes as spaces", () => {
    const buf = BrowserBuffer.create(10, 2, "wcwidth")
    // Manually set some chars to 0 (null)
    buf.char[0] = 0
    buf.char[1] = "A".codePointAt(0)!
    buf.char[2] = 0
    const text = bufferToText(buf)
    expect(text).toBe(" A")
  })
})
