import { configDefaults, defineConfig } from "vitest/config";

// Vite builds the app. Vitest only runs unit tests; Playwright owns screenshots.
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, "tests/visual/**"],
  },
});
