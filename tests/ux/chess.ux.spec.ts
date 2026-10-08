import { expect, test, type Page } from "@playwright/test";
import { FIXED_TIME, visualGameId, visualUserState } from "../visual/fixtures";

const routes = [
  { path: "/train", selector: ".train-room" },
  { path: "/learn", selector: ".learn-v2" },
  { path: "/play", selector: ".play-v2" },
  { path: "/review", selector: ".review-v2" },
  { path: "/library", selector: ".library-v2" },
  { path: "/progress", selector: ".progress-v2" },
  { path: "/learn/tactics/tactics.pin", selector: ".lesson-page-v2" },
  { path: `/review/${encodeURIComponent(visualGameId)}`, selector: ".review-workstation" },
  { path: "/library/studies/p57-study", selector: ".library-workspace-v2" },
] as const;

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(FIXED_TIME));
  await page.addInitScript((state) => {
    try {
      localStorage.setItem("thiepn.chess.user-state.v1", JSON.stringify(state));
    } catch {
      // The init script may execute on a blank/opaque page before navigation.
    }
  }, visualUserState);
});

async function open(page: Page, path: string, selector: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await expect(page.locator(selector).first()).toBeVisible();
  await expect(page.locator(".route-loading")).toHaveCount(0);
}

async function assertNoHorizontalOverflow(page: Page, path: string) {
  const dims = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(dims.scroll, `${path} should not overflow the viewport ${JSON.stringify(dims)}`)
    .toBeLessThanOrEqual(dims.viewport + 2);
}

function primaryNav(page: Page) {
  return page.locator(".app-topnav:visible, .mobile-nav:visible").first();
}

test("nine real routes fit the device and hydrate without recovery pages", async ({ page }, info) => {
  const timings: { route: string; elapsedMs: number; width: number }[] = [];
  for (const route of routes) {
    const start = Date.now();
    await open(page, route.path, route.selector);
    await assertNoHorizontalOverflow(page, route.path);
    await expect(page.locator(".train-runtime-recovery, .play-game-recovery, .review-v2-recovery"))
      .toHaveCount(0);
    timings.push({ route: route.path, elapsedMs: Date.now() - start,
      width: await page.evaluate(() => innerWidth) });
  }
  await info.attach("route-qualification.json", {
    body: JSON.stringify({ project: info.project.name, timings }, null, 2),
    contentType: "application/json",
  });
  console.log(`P58_ROUTE_TIMINGS ${info.project.name} ${JSON.stringify(timings)}`);
});

test("primary navigation, browser history and keyboard activation remain usable", async ({ page }) => {
  await open(page, "/train", ".train-room");
  let nav = primaryNav(page);
  await expect(nav.getByRole("button", { name: "Learn" })).toBeVisible();
  const learn = nav.getByRole("button", { name: "Learn" });
  await learn.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".learn-v2")).toBeVisible();
  await expect(page).toHaveURL(/\/learn$/);
  await page.goBack();
  await expect(page.locator(".train-room")).toBeVisible();
  await page.goForward();
  await expect(page.locator(".learn-v2")).toBeVisible();
  nav = primaryNav(page);
  await nav.getByRole("button", { name: "Play" }).click();
  await expect(page.locator(".play-v2")).toBeVisible();
  await assertNoHorizontalOverflow(page, "/play");
});

test("train session opens and exits without losing the route", async ({ page }) => {
  await open(page, "/train", ".train-room");
  await page.locator(".train-room-start").click();
  await expect(page.locator(".train-runtime-page")).toBeVisible();
  await expect(page).toHaveURL(/\/train\/session\//);
  await page.getByRole("button", { name: "Leave training workspace" }).click();
  await expect(page).toHaveURL(/\/train$/);
  await expect(page.locator(".train-room")).toBeVisible();
  await assertNoHorizontalOverflow(page, "/train");
});

test("Play setup starts and exits an actual game on this viewport", async ({ page }) => {
  await open(page, "/play", ".play-v2");
  await page.locator(".play-v2-time-list").getByRole("button", { name: /Untimed/ }).click();
  await expect(page.locator(".play-v2-time-list").getByRole("button", { name: /Untimed/ }))
    .toHaveAttribute("aria-pressed", "true");
  await page.locator(".play-v2-start-block .primary").click();
  await expect(page.locator(".game-arena")).toBeVisible();
  await expect(page.locator(".game-arena [role='grid']")).toBeVisible();
  await expect(page).toHaveURL(/\/play\/game\//);
  await page.getByRole("button", { name: "Exit game" }).click();
  await expect(page).toHaveURL(/\/play$/);
  await expect(page.locator(".play-v2")).toBeVisible();
  await assertNoHorizontalOverflow(page, "/play");
});

test("saved Review and Library content survives deep links and reload", async ({ page }) => {
  await open(page, `/review/${encodeURIComponent(visualGameId)}`, ".review-workstation");
  await expect(page.locator("#review-game-title")).toContainText("Student");
  await page.reload();
  await expect(page.locator(".review-workstation")).toBeVisible();
  await page.locator(".review-v2-back").first().click();
  await expect(page.locator(".review-v2")).toBeVisible();

  await open(page, "/library/studies/p57-study", ".library-workspace-v2");
  await expect(page.locator("#library-workspace-title")).toHaveText("Italian development position");
  await page.reload();
  await expect(page.locator("#library-workspace-title")).toHaveText("Italian development position");
  await page.locator(".library-v2-back").first().click();
  await expect(page).toHaveURL(/\/library\/studies$/);
});

test("phone and tablet controls remain reachable with touch and scrolling", async ({ page, isMobile }) => {
  if (!isMobile) {
    await open(page, "/play", ".play-v2");
    await assertNoHorizontalOverflow(page, "/play");
    return;
  }
  await open(page, "/play", ".play-v2");
  const board = page.locator(".play-v2-board-column .chess-board-wrap");
  await expect(board).toBeInViewport({ ratio: 0.9 });
  const cta = page.locator(".play-v2-start-block .primary");
  await expect(cta).toBeInViewport({ ratio: 0.9 });
  const width = await cta.evaluate((node) => node.getBoundingClientRect().width);
  expect(width).toBeGreaterThanOrEqual(300);
  const nav = page.locator(".mobile-nav");
  if (await nav.isVisible()) {
    const sizes = await nav.locator("button").evaluateAll((buttons) =>
      buttons.map((button) => {
        const r = button.getBoundingClientRect();
        return { width: r.width, height: r.height };
      }));
    expect(sizes.length).toBe(5);
    for (const size of sizes) {
      expect(size.height).toBeGreaterThanOrEqual(44);
      expect(size.width).toBeGreaterThanOrEqual(44);
    }
  }
  await assertNoHorizontalOverflow(page, "/play");
});
