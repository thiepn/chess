import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const failures = [];

const index = read("index.html");
const tokens = read("src/design/tokens.css");
const train = read("src/styles/p47-train-native.css");
const learn = read("src/styles/p47-learn-native.css");
const play = read("src/styles/p47-play-native.css");
const review = read("src/styles/p47-review-native.css");
const library = read("src/styles/p47-library-native.css");
const progress = read("src/styles/p47-progress-native.css");

if (!index.includes("viewport-fit=cover")) {
  failures.push("index.html: viewport-fit=cover is required for safe-area layouts");
}

for (const token of [
  "--chess-mobile-topbar-safe-height",
  "--chess-mobile-nav-safe-height",
  "--chess-native-gutter",
  "--chess-native-inline-start",
  "--chess-native-inline-end",
  "--chess-touch-min",
]) {
  if (!tokens.includes(token)) {
    failures.push(`src/design/tokens.css: missing ${token}`);
  }
}

for (const [path, css] of [
  ["src/styles/p47-train-native.css", train],
  ["src/styles/p47-learn-native.css", learn],
  ["src/styles/p47-play-native.css", play],
  ["src/styles/p47-review-native.css", review],
  ["src/styles/p47-library-native.css", library],
  ["src/styles/p47-progress-native.css", progress],
]) {
  if (/margin-inline\s*:\s*-12px/.test(css)) {
    failures.push(`${path}: hard-coded -12px full-bleed margin can overflow narrow phones`);
  }

  if (/calc\((?:50|52)px \+ env\(safe-area-inset-top\)\)/.test(css)) {
    failures.push(`${path}: use the shared mobile topbar safe-height token`);
  }
}

for (const fragment of [
  "padding-left: var(--chess-native-inline-start)",
  "padding-right: var(--chess-native-inline-end)",
  "var(--chess-mobile-topbar-safe-height)",
  "var(--chess-mobile-nav-safe-height)",
]) {
  if (!train.includes(fragment)) {
    failures.push(`src/styles/p47-train-native.css: missing "${fragment}"`);
  }
}

for (const [path, css, selector] of [
  ["src/styles/p47-learn-native.css", learn, ".app-shell-v2:has(.lesson-page-v2) .mobile-nav"],
  ["src/styles/p47-review-native.css", review, ".app-shell-v2:has(.review-workstation) .mobile-nav"],
  ["src/styles/p47-library-native.css", library, ".app-shell-v2:has(.library-workspace-v2) .mobile-nav"],
]) {
  if (!css.includes(selector) || !css.slice(css.indexOf(selector), css.indexOf(selector) + 160).includes("display: none")) {
    failures.push(`${path}: constrained landscape workspace must suppress bottom navigation`);
  }
}

if (!play.includes("margin-left: calc(var(--chess-native-inline-start) * -1)")) {
  failures.push("src/styles/p47-play-native.css: sticky Play action bar must align to safe inline gutter");
}

if (!review.includes("@media (max-width: 720px) and (orientation: landscape) and (max-height: 650px)")) {
  failures.push("src/styles/p47-review-native.css: narrow-landscape Review fallback is required");
}

if (!review.includes("grid-template-columns: minmax(250px, 50vw) minmax(220px, 1fr)")) {
  failures.push("src/styles/p47-review-native.css: Review narrow-landscape columns must fit 568–667px devices");
}

if (!review.includes("min-height: var(--chess-touch-min)")) {
  failures.push("src/styles/p47-review-native.css: Review preview controls must remain touch-safe");
}

if (!learn.includes("min-height: var(--chess-touch-min)")) {
  failures.push("src/styles/p47-learn-native.css: compact Learn actions must remain touch-safe");
}

for (const [path, css] of [
  ["src/styles/p47-learn-native.css", learn],
  ["src/styles/p47-review-native.css", review],
  ["src/styles/p47-library-native.css", library],
]) {
  if (!css.includes("safe-area-inset-left") || !css.includes("safe-area-inset-right")) {
    failures.push(`${path}: constrained landscape must respect horizontal safe areas`);
  }
}

if (failures.length) {
  console.error("Mobile native audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Mobile native audit passed.");
