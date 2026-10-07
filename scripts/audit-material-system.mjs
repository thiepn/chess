import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const flatCssFiles = [
  "src/styles/review-v2.css",
  "src/styles/library-v2.css",
  "src/styles/progress-v2.css",
  "src/styles/p47-learn-native.css",
  "src/styles/p47-play-native.css",
  "src/styles/p47-review-native.css",
  "src/styles/p47-library-native.css",
  "src/styles/p47-progress-native.css",
  "src/styles/p47-train-native.css",
  "src/styles/p48-material.css",
];

const componentDir = path.join(root, "src", "components");
const componentFiles = fs
  .readdirSync(componentDir)
  .filter((name) => name.endsWith(".tsx"))
  .map((name) => path.join(componentDir, name));

const sourceFiles = [path.join(root, "src", "App.tsx"), ...componentFiles];

const bannedSurfaceClasses = [
  "hero",
  "section-hero",
  "session-card",
  "play-normal-card",
  "story-hero",
  "latest-story-card",
  "study-card",
  "reference-card",
  "train-home-hero",
  "home-progress-card",
  "progress-panel",
  "curriculum-card",
  "ai-profile-card",
  "scenario-card",
];

const failures = [];

for (const relative of flatCssFiles) {
  const file = path.join(root, relative);
  const css = fs.readFileSync(file, "utf8");

  if (/(?:linear|radial)-gradient\s*\(/i.test(css)) {
    failures.push(`${relative}: gradients are not allowed in rebuilt route/material CSS`);
  }

  const largeRadius = css.match(/border-radius\s*:\s*(?:1[6-9]|[2-9]\d)px/gi);
  if (largeRadius?.length) {
    failures.push(
      `${relative}: found ${largeRadius.length} border radius value(s) >= 16px`,
    );
  }
}

for (const file of sourceFiles) {
  const source = fs.readFileSync(file, "utf8");
  for (const className of bannedSurfaceClasses) {
    const pattern = new RegExp(
      `(?:className\\s*=\\s*["'`][^"'\\`]*\\b|\\b)${className.replace(
        /[-/\\^$*+?.()|[\]{}]/g,
        "\\$&",
      )}\\b`,
      "g",
    );
    if (pattern.test(source)) {
      failures.push(
        `${path.relative(root, file)}: legacy surface class "${className}" is not allowed`,
      );
    }
  }
}

const mainSource = fs.readFileSync(path.join(root, "src", "main.tsx"), "utf8");
if (!mainSource.includes('import "./styles/p48-material.css";')) {
  failures.push("src/main.tsx: P48 material layer must load after global styles");
}

if (failures.length) {
  console.error("Material system audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Material system audit passed: ${flatCssFiles.length} flat CSS files and ${sourceFiles.length} TSX files checked.`,
);
