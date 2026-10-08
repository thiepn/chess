import { defineConfig, devices } from "@playwright/test";

const root = "http://127.0.0.1:4173";
export default defineConfig({
  testDir: "./tests/ux",
  testMatch: "**/*.ux.spec.ts",
  fullyParallel: false,
  workers: process.env.CI ? 2 : 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 12_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: root,
    locale: "en-US",
    timezoneId: "Europe/Berlin",
    colorScheme: "light",
    reducedMotion: "reduce",
    serviceWorkers: "block",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "android-compact", use: { ...devices["Pixel 7"], browserName: "chromium", viewport: { width: 360, height: 800 }, deviceScaleFactor: 1 } },
    { name: "android-phone", use: { ...devices["Pixel 7"], browserName: "chromium", viewport: { width: 393, height: 852 }, deviceScaleFactor: 1 } },
    { name: "tablet-portrait", use: { ...devices["iPad Mini"], browserName: "chromium", viewport: { width: 768, height: 1024 }, deviceScaleFactor: 1 } },
    { name: "tablet-landscape", use: { ...devices["iPad Mini"], browserName: "chromium", viewport: { width: 1024, height: 768 }, deviceScaleFactor: 1 } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 } },
    { name: "mobile-webkit", use: { ...devices["iPhone 13"], browserName: "webkit", viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 } },
  ],
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4173 --strictPort",
    url: root,
    timeout: 60_000,
    reuseExistingServer: !process.env.CI,
  },
});
