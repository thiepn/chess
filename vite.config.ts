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
    // Let Rollup co-locate tree-shaken icon implementations with their actual
    // lazy page consumers; retain all icons and native route split points.
  },
});
