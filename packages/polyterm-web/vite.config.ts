import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { polytermWebPlugin } from "./src/vite-plugin"

export default defineConfig({
  plugins: [
    ...polytermWebPlugin(),
    react(),
  ],
  build: {
    target: "esnext",
  },
  esbuild: {
    target: "esnext",
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "esnext",
    },
  },
})
