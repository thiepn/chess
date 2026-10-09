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

test.beforeEach(async ({ page }, testInfo) => {
  // Playwright's synthetic wall clock is needed for deterministic historical
  // analytics fixtures, but is inappropriate for repeated *real-time* game
  // reload qualification. Avoid injecting clock shims into those two tests,
  // retaining all their recovery, idle-worker and second-reload assertions.
  if (!/P62 game survives route reload|P65 idle untimed White game/.test(testInfo.title)) {
    await page.clock.setFixedTime(new Date(FIXED_TIME));
  }
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
  const configuredWidth = page.viewportSize()?.width ?? 1440;
  const dims = await page.evaluate((expectedWidth) => {
    const offenders = [...document.querySelectorAll<HTMLElement>("body *")]
      .map((node) => {
        const b = node.getBoundingClientRect();
        return { tag: node.tagName, cls: String(node.className).slice(0, 75),
          right: Math.round(b.right), left: Math.round(b.left), width: Math.round(b.width) };
      })
      .filter((n) => n.right > expectedWidth + 2 && n.width > 0)
      .sort((a, b) => b.right - a.right).slice(0, 8);
    return { scroll: document.documentElement.scrollWidth, viewport: innerWidth,
      client: document.documentElement.clientWidth,
      visual: window.visualViewport?.width, offenders };
  }, configuredWidth);
  if (dims.scroll > configuredWidth + 2) {
    console.log("P58_OVERFLOW " + JSON.stringify({ path, configuredWidth, ...dims }));
  }
  expect(dims.scroll, `${path} should fit ${configuredWidth}px: ${JSON.stringify(dims)}`)
    .toBeLessThanOrEqual(configuredWidth + 2);
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
  // The outer app cannot scroll sideways, but its intentionally horizontal
  // carousels must still move under touch/drag rather than being clipped.
  const scenarioList = page.locator(".play-v2-scenario-list");
  if (await scenarioList.evaluate((node) => node.scrollWidth > node.clientWidth + 20)) {
    await scenarioList.evaluate((node) => { node.scrollLeft = node.scrollWidth - node.clientWidth; });
    expect(await scenarioList.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
  }
  await assertNoHorizontalOverflow(page, "/play");

  await open(page, "/train", ".train-room");
  const trainingQueue = page.locator(".train-queue");
  if (await trainingQueue.evaluate((node) => node.scrollWidth > node.clientWidth + 20)) {
    await trainingQueue.evaluate((node) => { node.scrollLeft = node.scrollWidth - node.clientWidth; });
    expect(await trainingQueue.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
  }
  await assertNoHorizontalOverflow(page, "/train");
});


test("P59 mobile Library navigation and lesson controls avoid occlusion", async ({ page, isMobile }) => {
  if (!isMobile || page.viewportSize()?.width !== 393) return;
  await open(page, "/library", ".library-v2");
  const boxes = await page.evaluate(() => {
    const get = (selector: string) => {
      const box = document.querySelector(selector)?.getBoundingClientRect();
      return box ? { top: box.top, bottom: box.bottom, height: box.height } : null;
    };
    return { topbar: get(".app-topbar"), rail: get(".library-v2-rail"),
      title: get(".library-v2-root"), action: get(".library-v2-new-study"),
      navigation: get(".library-v2-rail nav"), index: get(".library-v2-index") };
  });
  console.log("P59_LIBRARY_LAYOUT " + JSON.stringify(boxes));
  expect(boxes.title).not.toBeNull();
  expect(boxes.topbar).not.toBeNull();
  expect(boxes.title!.top - boxes.topbar!.bottom).toBeLessThanOrEqual(30);
  expect(Math.abs(boxes.title!.top - boxes.action!.top)).toBeLessThanOrEqual(14);
  await open(page, "/learn/tactics/tactics.pin", ".lesson-page-v2");
  const lesson = await page.evaluate(() => {
    const reading = document.querySelector(".learn-v2-reading-body")?.getBoundingClientRect();
    const nav = document.querySelector(".learn-v2-reading-nav");
    const rect = nav?.getBoundingClientRect();
    return { readingBottom: reading?.bottom, navTop: rect?.top,
      navPosition: nav ? getComputedStyle(nav).position : null };
  });
  console.log("P59_LESSON_LAYOUT " + JSON.stringify(lesson));
  expect(lesson.navPosition).toBe("static");
  expect(lesson.navTop ?? 0).toBeGreaterThanOrEqual((lesson.readingBottom ?? 0) - 1);
});

test("P59B Review prioritizes a saved position and offers import as secondary", async ({ page }) => {
  await open(page, "/review", ".review-v2");
  const feature = page.locator(".review-v2-feature");
  await expect(feature.locator(".chess-board-wrap")).toBeVisible();
  await expect(feature.getByRole("heading", { name: /Student.*Training Opponent/ })).toBeVisible();
  const importDrawer = page.locator(".review-v2-import-drawer");
  await expect(importDrawer).not.toHaveAttribute("open", "");
  await importDrawer.locator("summary").click();
  await expect(importDrawer).toHaveAttribute("open", "");
  await expect(page.locator("#review-pgn")).toBeVisible();
  // React input updates must not silently collapse a user-opened disclosure.
  await page.locator("#review-pgn").fill('[Event "Study"]');
  await expect(importDrawer).toHaveAttribute("open", "");
  await importDrawer.locator("summary").click();
  await feature.getByRole("button", { name: "Open game review" }).click();
  await expect(page).toHaveURL(/\/review\/[^/]+$/);
  await expect(page.locator(".review-workstation")).toBeVisible();
});

test("P59B first-time users see the import form without a dummy chessboard", async ({ browser }) => {
  // Use an isolated context, not the preloaded P57 game fixture.
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:4173",
  });
  const fresh = await context.newPage();
  try {
    await fresh.goto("/review", { waitUntil: "domcontentloaded" });
    await expect(fresh.locator(".review-v2")).toBeVisible();
    await expect(fresh.locator(".review-v2-feature")).toHaveCount(0);
    await expect(fresh.locator(".review-v2-import-drawer")).toHaveAttribute("open", "");
    await expect(fresh.locator("#review-pgn")).toBeVisible();
    await expect(fresh.locator("#review-lichess-url")).toBeVisible();
  } finally {
    await context.close();
  }
});


test("P62 game survives route reload with exact legal move history", async ({ page }) => {
  let workerStarts = 0;
  await page.route("**/engine/manifest.json", async (route) => {
    workerStarts += 1;
    await route.continue();
  });
  await open(page, "/play", ".play-v2");
  await page.locator(".play-v2-time-list").getByRole("button", { name: /Untimed/ }).click();
  await page.locator(".play-v2-start-block .primary").click();
  await expect(page.locator(".game-arena")).toBeVisible();
  const gameUrl = page.url();
  const storageKey = "chess:play-session-v2:guest";
  const saved = await page.evaluate((key) => localStorage.getItem(key), storageKey);
  expect(saved).toBeTruthy();
  await page.evaluate((key) => {
    const record = JSON.parse(localStorage.getItem(key) ?? "{}");
    record.checkpoint = {
      version: 1,
      initialFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      moves: ["e2e4", "e7e5", "g1f3", "b8c6"],
      clock: { whiteMs: 0, blackMs: 0, active: "w", updatedAt: Date.now() },
    };
    localStorage.setItem(key, JSON.stringify(record));
  }, storageKey);
  await page.reload();
  await expect(page.locator(".game-arena")).toBeVisible();
  await expect(page).toHaveURL(gameUrl);
  await expect(page.locator('.game-arena [data-square="e4"] [data-piece="wp"]')).toBeVisible();
  await expect(page.locator('.game-arena [data-square="e5"] [data-piece="bp"]')).toBeVisible();
  await expect(page.locator('.game-arena [data-square="f3"] [data-piece="wn"]')).toBeVisible();
  await expect(page.locator(".move-list")).toContainText("Nf3");
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator('.game-arena [data-square="f3"] [data-piece="wn"]')).toBeVisible();
  // A recovered position with the human to move must not eagerly start
  // Stockfish on every reload; this is critical for mobile WebKit stability.
  expect(workerStarts).toBe(0);
});

test("P62 invalid recovered PGN remains exportable instead of silently restarting", async ({ page }) => {
  await open(page, "/play", ".play-v2");
  await page.locator(".play-v2-start-block .primary").click();
  await expect(page.locator(".game-arena")).toBeVisible();
  const key = "chess:play-session-v2:guest";
  // Inject at the next navigation's document start. Mutating storage in
  // the live tab races GameArena's 500ms autosave and can be overwritten
  // before WebKit begins the reload; this is a test-fixture race, not a
  // faithful corrupted-on-disk recovery scenario.
  await page.addInitScript((storageKey) => {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return;
    const record = JSON.parse(raw);
    record.checkpoint = {
      version: 1,
      initialFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      moves: ["e2e5"],
      clock: { whiteMs: 900000, blackMs: 900000, active: "w", updatedAt: Date.now() },
    };
    localStorage.setItem(storageKey, JSON.stringify(record));
  }, key);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByText("Saved game needs recovery")).toBeVisible();
  await expect(page.getByRole("button", { name: "Export recovery file" })).toBeVisible();
  expect(await page.evaluate((storageKey) => localStorage.getItem(storageKey), key)).toContain("e2e5");
});


test("P64 Progress does not draw a misleading trajectory for an empty account", async ({ page }) => {
  await page.addInitScript(() => {
    // Scope before startup hydration; intentionally supersedes demo v1 state.
    localStorage.setItem("thiepn.chess.user-state.v2.guest.state", JSON.stringify({
      mastery: {}, weaknesses: [], recentDomainMinutes: {},
    }));
  });
  await open(page, "/progress", ".progress-v2");
  await expect(page.locator(".progress-v2-trend-empty")).toBeVisible();
  await expect(page.locator(".progress-v2-chart svg")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Return to training/ })).toBeVisible();
  await assertNoHorizontalOverflow(page, "/progress");
});

test("P64 chessboard and core navigation retain legible controls", async ({ page }) => {
  await open(page, "/play", ".play-v2");
  const board = page.locator(".play-v2-board-column .chess-board-wrap");
  await expect(board).toBeVisible();
  const metrics = await page.evaluate(() => {
    const board = document.querySelector(".play-v2-board-column .chess-board-wrap");
    const square = board?.querySelector(".board-square");
    const label = square?.querySelector(".file-label,.rank-label");
    if (!board || !square) return null;
    const r = board.getBoundingClientRect();
    return {
      width: r.width,
      squareCount: board.querySelectorAll(".board-square").length,
      coordinateSize: label ? parseFloat(getComputedStyle(label).fontSize) : null,
    };
  });
  expect(metrics).not.toBeNull();
  expect(metrics?.squareCount).toBe(64);
  expect(metrics?.width).toBeGreaterThan(290);
  if (metrics?.coordinateSize !== null) expect(metrics?.coordinateSize).toBeGreaterThanOrEqual(8);
  await assertNoHorizontalOverflow(page, "/play");
});


test("P65 idle untimed White game does not load a WASM worker on repeated reload", async ({ page }) => {
  let manifestRequests = 0;
  await page.route("**/engine/manifest.json", async (route) => {
    manifestRequests += 1;
    await route.continue();
  });
  await open(page, "/play", ".play-v2");
  await page.locator(".play-v2-time-list").getByRole("button", { name: /Untimed/ }).click();
  await page.locator(".play-v2-start-block .primary").click();
  await expect(page.locator(".game-arena")).toBeVisible();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator(".game-arena")).toBeVisible();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator(".game-arena")).toBeVisible();
  expect(manifestRequests).toBe(0);
});


test("P68 control: Play setup survives two same-tab document reloads", async ({ page }) => {
  // Control for the GameArena-specific repeated reload crashes. This test
  // intentionally does not mount the game/Stockfish workspace at all.
  // It distinguishes an application game lifecycle regression from a
  // generic Playwright-WebKit reload failure on the same route.
  await open(page, "/play", ".play-v2");
  for (let i = 0; i < 2; i += 1) {
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator(".play-v2")).toBeVisible();
    await expect(page.locator(".game-arena")).toHaveCount(0);
  }
});
