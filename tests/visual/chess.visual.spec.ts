import { expect, test } from "@playwright/test";
import {
  FIXED_TIME,
  visualGameId,
  visualUserState,
} from "./fixtures";

const SCENARIOS = [
  { key: "train", path: "/train", selector: ".train-room" },
  { key: "learn", path: "/learn", selector: ".learn-v2" },
  { key: "play", path: "/play", selector: ".play-v2" },
  { key: "review", path: "/review", selector: ".review-v2" },
  { key: "library", path: "/library", selector: ".library-v2" },
  { key: "progress", path: "/progress", selector: ".progress-v2" },
  {
    key: "learn-lesson",
    path: "/learn/tactics/tactics.pin",
    selector: ".lesson-page-v2",
  },
  {
    key: "review-analysis",
    path: `/review/${encodeURIComponent(visualGameId)}`,
    selector: ".review-workstation",
  },
  {
    key: "library-workspace",
    path: "/library/studies/p57-study",
    selector: ".library-workspace-v2",
  },
] as const;

test.beforeEach(async ({ page }) => {
  // Fixed wall clock prevents next-due labels and relative dates from changing.
  await page.clock.setFixedTime(new Date(FIXED_TIME));
  await page.addInitScript((userState) => {
    try {
      localStorage.setItem("thiepn.chess.user-state.v1", JSON.stringify(userState));
    } catch {
      // The initialization script also runs on opaque origins.
    }
  }, visualUserState);
});

for (const scenario of SCENARIOS) {
  test(`${scenario.key} chess-native viewport`, async ({ page }) => {
    await page.goto(scenario.path, { waitUntil: "domcontentloaded" });
    await expect(page.locator(scenario.selector).first()).toBeVisible();
    await expect(page.locator(".route-loading")).toHaveCount(0);
    await page.evaluate(async () => {
      await document.fonts.ready;
      window.scrollTo(0, 0);
    });
    // Ensure layout and persisted state have settled after hydration.
    await page.waitForTimeout(250);
    if (scenario.key === "play" && page.viewportSize()?.width === 393) {
      const layout = await page.evaluate(() => {
        const selectors = [".play-v2", ".play-v2-board-column",
          ".play-v2-board-column .chess-board-wrap",
          ".play-v2-board-column .chess-board-v2", ".play-v2-setup"];
        return { viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth,
          nodes: selectors.map((selector) => {
            const node = document.querySelector<HTMLElement>(selector);
            const box = node?.getBoundingClientRect();
            const css = node ? getComputedStyle(node) : undefined;
            return { selector, x: box?.x, y: box?.y, width: box?.width,
              height: box?.height, display: css?.display, visibility: css?.visibility,
              opacity: css?.opacity, transform: css?.transform };
          }),
        };
      });
      console.log("P57_PLAY_PHONE_LAYOUT " + JSON.stringify(layout));
    }
    await expect(page).toHaveScreenshot(`${scenario.key}.png`, {
      animations: "disabled",
      caret: "hide",
      fullPage: false,
      threshold: 0.2,
      maxDiffPixelRatio: 0.005,
    });
  });
}
