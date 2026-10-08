import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Browser tests are run only by Playwright, not Vitest.
  test: { exclude: [...configDefaults.exclude, "tests/visual/**"] },
  build: {
    target: "es2022",
    sourcemap: true,
    manifest: true,
  },
});
