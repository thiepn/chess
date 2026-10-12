import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Keep warning/error diagnostics; do not ship verbose development logging.
  esbuild: { pure: ["console.log", "console.info", "console.debug"] },
  build: {
    target: "es2022",
    // Keep initial CSS under its independent 42 KiB per-file budget.
    cssCodeSplit: true,
    // Do not publish source maps in production: they reveal source-level
    // implementation details and can leak accidental embedded config.
    sourcemap: false,
    manifest: true,
    // Keep tree-shaken icons consolidated to avoid duplicate per-icon chunks.
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Share existing deferred page styles without including them in
          // the initial critical stylesheet. All original declarations remain.
          if (/[/\\\\]src[/\\\\]styles[/\\\\](?:(?:review|progress|library)-v2|p(?:47|51)-(?:review|progress|library|learn|play)-(?:native|large))\\.css$/.test(id))
            return "secondary-page-styles";
          if (id.indexOf("/node_modules/lucide-react/dist/esm/icons/") !== -1) return "chess-icons";
        },
      },
    },
  },
});
