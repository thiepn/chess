import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { test } from "node:test";

const css = readFileSync("src/styles/mobile-app-viewport.css", "utf8");
const entry = readFileSync("src/main.tsx", "utf8");
const html = readFileSync("index.html", "utf8");
test("mobile app viewport rules load last, keeping training controls in a non-scrolling footer", () => {
  assert.ok(entry.includes('import "./styles/mobile-app-viewport.css"'));
  assert.ok(entry.indexOf('import "./styles/mobile-app-viewport.css"') > entry.indexOf('import "./styles/p107-study.css"'));
  assert.match(css, /\.train-runtime-body\.board-first-sheet \.lesson-instruction > :first-child/);
  assert.match(css, /\.train-runtime-body\.board-first-sheet \.lesson-controls/);
  assert.match(css, /overflow-y: auto/);
  assert.match(css, /\.train-room \.train-task-actions/);
  assert.match(css, /\.play-v2 \.play-v2-start-block/);
  assert.match(css, /100dvh/);
});
test("browser zoom remains accessible while double-tap actions are handled", () => {
  assert.match(html, /viewport-fit=cover/);
  assert.doesNotMatch(html, /user-scalable=no|maximum-scale=1/);
  assert.match(css, /touch-action: manipulation/);
});
