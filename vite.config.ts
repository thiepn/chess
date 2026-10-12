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
          const style = id.split("?")[0].split("/").at(-1) ?? "";
          if (id.includes("/src/styles/") && [
            "review-v2.css", "p47-review-native.css", "p51-review-large.css",
            "progress-v2.css", "p47-progress-native.css", "p51-progress-large.css",
            "library-v2.css", "p47-library-native.css", "p51-library-large.css",
            "p47-learn-native.css", "p51-learn-large.css",
            "p47-play-native.css", "p51-play-large.css",
          ].includes(style)) return "secondary-page-styles";
          if (id.indexOf("/node_modules/lucide-react/dist/esm/icons/") !== -1) return "chess-icons";
        },
      },
    },
  },
});
