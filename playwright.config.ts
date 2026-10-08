import { defineConfig, devices } from "@playwright/test";

const root = "http://127.0.0.1:4173";
export default defineConfig({
  testDir: "./tests/visual",
  testMatch: "**/*.visual.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }]]
    : [["list"]],
  use: {
    baseURL: root,
    browserName: "chromium",
    locale: "en-US",
    timezoneId: "Europe/Berlin",
    colorScheme: "light",
    reducedMotion: "reduce",
    deviceScaleFactor: 1,
    serviceWorkers: "block",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
      },
    },
    {
      name: "phone",
      use: {
        ...devices["Pixel 7"],
        viewport: { width: 393, height: 852 },
        deviceScaleFactor: 1,
      },
    },
  ],
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4173 --strictPort",
    url: root,
    timeout: 60_000,
    reuseExistingServer: !process.env.CI,
  },
});
