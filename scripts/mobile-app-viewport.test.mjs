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

test("standalone PWA manifest has real install icon sizes and a scoped start", () => {
  const manifest = JSON.parse(readFileSync("public/manifest.webmanifest", "utf8"));
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.scope, "/");
  assert.ok(manifest.icons.some(icon => icon.sizes === "192x192"));
  assert.ok(manifest.icons.some(icon => icon.sizes === "512x512"));
  assert.match(html, /rel="manifest"/);
  for (const size of [192, 512]) {
    const png = readFileSync(`public/icons/chess-${size}.png`);
    assert.equal(png.toString("hex", 0, 8), "89504e470d0a1a0a");
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
  }
});

test("mobile activity geometry uses one authored CSS rule set", () => {
  assert.equal((css.match(/@media/g) ?? []).length, 2);
  assert.doesNotMatch(css, /Mobile progression regression/);
  assert.match(css, /\.train-runtime-body\.board-first-sheet \.lesson-stage/);
  assert.match(css, /\.train-runtime-body\.board-first-sheet \.lesson-instruction > :first-child/);
  assert.match(css, /\.train-runtime-body\.board-first-sheet \.lesson-controls/);
  assert.match(css, /\.train-runtime-body\.board-first-sheet \.lesson-button-row/);
  assert.match(css, /\.game-session-actions/);
  assert.match(css, /44svh/);
  assert.doesNotMatch(css, /z-index: 85/);
});

test("lazy route components no longer inject CSS after the viewport contract", () => {
  const styles = [
    "review-v2.css", "library-v2.css", "progress-v2.css",
    "p47-train-native.css", "p47-learn-native.css", "p47-play-native.css",
    "p47-review-native.css", "p47-library-native.css", "p47-progress-native.css",
    "p51-train-large.css", "p51-learn-large.css", "p51-play-large.css",
    "p51-review-large.css", "p51-library-large.css", "p51-progress-large.css",
  ];
  const finalCssImport = entry.indexOf('import "./styles/mobile-app-viewport.css"');
  for (const style of styles) {
    const declaration = "import \"./styles/" + style + "\";";
    const index = entry.indexOf(declaration);
    assert.ok(index >= 0 && index < finalCssImport, style + " must load before viewport rules");
  }
  for (const file of [
    "src/App.tsx", "src/components/LearnView.tsx", "src/components/PlayView.tsx",
    "src/components/ReviewView.tsx", "src/components/ProgressView.tsx",
    "src/components/LibraryView.tsx",
  ]) {
    assert.doesNotMatch(readFileSync(file, "utf8"), /import\s+["'][.][.]?\/styles\/[^"']+\.css["']/);
  }
});
