import {test,expect} from "@playwright/test";
test("Train start fits the phone without page scrolling",async({page})=>{
  await page.setViewportSize({width:360,height:700});
  await page.goto("/train");
  const start=page.locator(".train-room-start");
  await expect(start).toBeVisible();
  const b=await start.boundingBox();
  expect(b).not.toBeNull();
  expect(b!.y+b!.height).toBeLessThanOrEqual(701);
  expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBeLessThanOrEqual(701);
});
test("active training keeps its controls reachable",async({page})=>{
  await page.setViewportSize({width:360,height:700});
  await page.goto("/train");
  await page.locator(".train-room-start").click();
  await expect(page.locator(".train-runtime-page")).toBeVisible();
  const action=page.locator(".train-runtime-body .lesson-controls button:visible").first();
  if(await action.count()){
    const b=await action.boundingBox();
    expect(b).not.toBeNull();
    expect(b!.y).toBeGreaterThanOrEqual(0);
    expect(b!.y+b!.height).toBeLessThanOrEqual(701);
  }
});
