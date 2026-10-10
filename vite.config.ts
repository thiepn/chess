import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    target: "es2022",
    // Do not publish source maps in production: they reveal source-level
    // implementation details and can leak accidental embedded config.
    sourcemap: false,
    manifest: true,
    // Consolidate tree-shaken Lucide icon modules; reduce per-icon JS chunk overhead.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/node_modules/lucide-react/dist/esm/icons/")) return "chess-icons";
        },
      },
    },
  },
});
