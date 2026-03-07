// Headless entry point for @gridland/web
// Use this for server-side rendering and text extraction without a browser.
// This runs on Node.js — no DOM, canvas, or RAF dependencies.

export { bufferToText } from "./buffer-to-text"
export { HeadlessRenderer, setHeadlessRootRenderableClass } from "./headless-renderer"
export type { HeadlessRendererOptions } from "./headless-renderer"
export { createHeadlessRoot } from "./create-headless-root"
export type { HeadlessRoot } from "./create-headless-root"

// Re-export building blocks that headless consumers may need
export { BrowserBuffer } from "./browser-buffer"
export type { WidthMethod } from "./browser-buffer"
export { BrowserRenderContext } from "./browser-render-context"
