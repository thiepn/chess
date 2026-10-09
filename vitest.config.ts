import { configDefaults, defineConfig } from "vitest/config";

// Vite builds the app. Vitest only runs unit tests; Playwright owns screenshots.
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, "tests/visual/**", "tests/ux/**",
      // This is a Node.js built-in test suite, executed separately in Quality.
      "scripts/release-approval.test.mjs",
      "scripts/build-visual-review.test.mjs",
      "scripts/p71-acceptance.test.mjs",
      "scripts/p72-device-acceptance.test.mjs",
      "scripts/p72-visual-reconcile.test.mjs"],
  },
});
