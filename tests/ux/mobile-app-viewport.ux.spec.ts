import { test, expect } from "@playwright/test";

test.describe("mobile app viewport and standalone install", () => {
  test("mobile Train keeps the start action in the visual viewport", async ({ page }) => {
    const size = page.viewportSize();
    test.skip(!size || size.width > 820, "Mobile portrait only");
    await page.goto("/train");
    const start = page.locator(".train-room-start");
    await expect(start).toBeVisible();
    const bounds = await start.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(size!.height + 1);
    await page.evaluate(() => window.scrollTo(0, 500));
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });

  test("manifest installs as a scoped standalone app with sized icons", async ({ request }) => {
    const response = await request.get("/manifest.webmanifest");
    expect(response.ok()).toBe(true);
    const data = await response.json();
    expect(data.display).toBe("standalone");
    expect(data.start_url).toBe("/");
    for (const size of [192, 512]) {
      const icon = data.icons.find((item: { sizes: string }) => item.sizes === `${size}x${size}`);
      expect(icon).toBeDefined();
      const asset = await request.get(icon.src);
      expect(asset.ok()).toBe(true);
      expect(asset.headers()["content-type"]).toContain("image/png");
    }
  });
});

test("short phone keeps every rendered training progression action reachable", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto("/train");
  const start = page.locator(".train-room-start");
  await expect(start).toBeInViewport({ ratio: 0.99 });
  await start.click();
  await expect(page.locator(".train-runtime-page")).toBeVisible();
  const body = page.locator(".train-runtime-body");
  const lesson = body.locator(".lesson-stage");
  if (await lesson.isVisible()) {
    await expect(body).toHaveCSS("overflow-y", "hidden");
    await expect(lesson.locator(".chess-board-wrap")).toBeInViewport({ ratio: 0.99 });
    const controls = body.locator(".lesson-controls button:visible");
    expect(await controls.count()).toBeGreaterThan(0);
    for (const control of await controls.all()) {
      await expect(control).toBeInViewport({ ratio: 0.99 });
    }
  }
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test("active game keeps both clocks and session actions accessible at compact heights", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto("/play");
  await page.locator(".play-v2-start-block button.primary").click();
  const arena = page.locator(".game-arena");
  await expect(arena).toBeVisible();
  await expect(arena.locator(".game-player-strip.opponent")).toBeInViewport({ ratio: 0.99 });
  await expect(arena.locator(".game-player-strip.player")).toBeInViewport({ ratio: 0.99 });
  await expect(arena.locator(".chess-board-wrap")).toBeInViewport({ ratio: 0.99 });
  const actions = arena.locator(".game-session-actions button:visible");
  expect(await actions.count()).toBeGreaterThan(0);
  for (const action of await actions.all()) {
    await expect(action).toBeInViewport({ ratio: 0.99 });
  }
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});
