import path from "path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { gridlandWebPlugin } from "@gridland/web/vite-plugin"

export default defineConfig({
  plugins: [react(), gridlandWebPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: { target: "esnext" },
  esbuild: { target: "esnext" },
  optimizeDeps: { esbuildOptions: { target: "esnext" } },
})
