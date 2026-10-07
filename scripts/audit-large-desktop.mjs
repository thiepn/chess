import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const failures = [];

const routes = {
  train: read("src/styles/p51-train-large.css"),
  learn: read("src/styles/p51-learn-large.css"),
  play: read("src/styles/p51-play-large.css"),
  review: read("src/styles/p51-review-large.css"),
  library: read("src/styles/p51-library-large.css"),
  progress: read("src/styles/p51-progress-large.css"),
};

const tokens = read("src/design/tokens.css");
const app = read("src/App.tsx");
const learnView = read("src/components/LearnView.tsx");
const playView = read("src/components/PlayView.tsx");
const reviewView = read("src/components/ReviewView.tsx");
const libraryView = read("src/components/LibraryView.tsx");
const progressView = read("src/components/ProgressView.tsx");

for (const token of [
  "--chess-board-max-large",
  "--chess-board-max-review-large",
  "--chess-context-width-large",
  "--chess-rail-width-large",
  "--chess-workspace-max-wide",
  "--chess-workspace-max-analysis",
  "--chess-reading-max",
]) {
  if (!tokens.includes(token)) failures.push(`src/design/tokens.css: missing ${token}`);
}

for (const [name, css] of Object.entries(routes)) {
  if (!css.includes("@media (min-width: 1536px)")) {
    failures.push(`p51-${name}: large desktop rules must begin at 1536px+`);
  }

  if (/max-width:\s*(?:820|900|1024|1180)px/.test(css)) {
    failures.push(`p51-${name}: large desktop CSS must not contain mobile/tablet max-width breakpoints`);
  }

  if (/(?:linear|radial)-gradient\s*\(/i.test(css)) {
    failures.push(`p51-${name}: decorative gradients are not allowed`);
  }

  if (/border-radius\s*:\s*(?:1[6-9]|[2-9]\d)px/i.test(css)) {
    failures.push(`p51-${name}: oversized radii are not allowed`);
  }
}

const importChecks = [
  [app, './styles/p51-train-large.css', "src/App.tsx"],
  [learnView, '../styles/p51-learn-large.css', "src/components/LearnView.tsx"],
  [playView, '../styles/p51-play-large.css', "src/components/PlayView.tsx"],
  [reviewView, '../styles/p51-review-large.css', "src/components/ReviewView.tsx"],
  [libraryView, '../styles/p51-library-large.css', "src/components/LibraryView.tsx"],
  [progressView, '../styles/p51-progress-large.css', "src/components/ProgressView.tsx"],
];

for (const [source, fragment, path] of importChecks) {
  if (!source.includes(fragment)) failures.push(`${path}: missing ${fragment}`);
}

if (!routes.train.includes("var(--chess-board-max-large)")) {
  failures.push("Train: large desktop board cap must use --chess-board-max-large");
}

if (!routes.review.includes("var(--chess-board-max-review-large)")) {
  failures.push("Review: large desktop board cap must use --chess-board-max-review-large");
}

for (const [name, css] of Object.entries(routes)) {
  if (!css.includes("min-width: 1920px")) {
    failures.push(`${name}: explicit ultrawide composition is required`);
  }
}

if (!routes.learn.includes("var(--chess-reading-max)")) {
  failures.push("Learn: reading measure must remain bounded on large displays");
}

if (!routes.progress.includes("var(--chess-reading-max)")) {
  failures.push("Progress: explanatory text measure must remain bounded");
}

if (failures.length) {
  console.error("Large desktop audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Large desktop audit passed.");
