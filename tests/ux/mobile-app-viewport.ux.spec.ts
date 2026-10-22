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
