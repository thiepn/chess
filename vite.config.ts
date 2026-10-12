import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Keep warning/error diagnostics; do not ship verbose development logging.
  esbuild: { pure: ["console.log", "console.info", "console.debug"] },
  build: {
    target: "es2022",
    // Do not publish source maps in production: they reveal source-level
    // implementation details and can leak accidental embedded config.
    sourcemap: false,
    manifest: true,
    // Keep tree-shaken icons consolidated to avoid duplicate per-icon chunks.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.indexOf("/node_modules/lucide-react/dist/esm/icons/") !== -1) return "chess-icons";
        },
      },
    },
  },
});
