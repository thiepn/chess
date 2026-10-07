import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const failures = [];

const motion = read("src/styles/p49-motion.css");
const router = read("src/routing/appRouter.ts");
const types = read("src/interaction/types.ts");
const provider = read("src/interaction/ExperienceProvider.tsx");
const board = read("src/components/ChessBoard.tsx");
const lesson = read("src/components/LessonRunner.tsx");
const reviewCoach = read("src/components/GameReviewCoach.tsx");
const main = read("src/main.tsx");

const requiredMotionFragments = [
  "::view-transition-old(chess-main)",
  "::view-transition-new(chess-main)",
  ".board-square.move-origin::before",
  ".board-square.move-destination::before",
  ".piece-land-capture",
  ".piece-land-promotion",
  ".piece-land-castle",
  ".lesson-feedback.success",
  ".puzzle-explanation-card",
  ".library-engine-result",
  ".progress-v2-line",
  'html[data-motion="reduced"]',
];

for (const fragment of requiredMotionFragments) {
  if (!motion.includes(fragment)) {
    failures.push(`src/styles/p49-motion.css: missing "${fragment}"`);
  }
}

if (!router.includes("startViewTransition")) {
  failures.push("src/routing/appRouter.ts: route transitions must use startViewTransition when available");
}

if (!router.includes('dataset.motion === "reduced"')) {
  failures.push("src/routing/appRouter.ts: reduced-motion route-transition bypass is required");
}

for (const event of ['"castle"', '"promotion"', '"reveal"']) {
  if (!types.includes(event)) {
    failures.push(`src/interaction/types.ts: missing feedback event ${event}`);
  }
  if (!provider.includes(event.replaceAll('"', "") + ":")) {
    failures.push(`src/interaction/ExperienceProvider.tsx: missing feedback mapping for ${event}`);
  }
}

for (const fragment of [
  'feedback("promotion")',
  'feedback("castle")',
  '"move-origin"',
  '"move-destination"',
  "move-impact-",
]) {
  if (!board.includes(fragment)) {
    failures.push(`src/components/ChessBoard.tsx: missing "${fragment}"`);
  }
}

if (!lesson.includes('feedback: "reveal"')) {
  failures.push("src/components/LessonRunner.tsx: hint reveal feedback is required");
}

if (!reviewCoach.includes('feedback: "reveal"')) {
  failures.push("src/components/GameReviewCoach.tsx: best-move reveal feedback is required");
}

if (!main.includes('import "./styles/p49-motion.css";')) {
  failures.push("src/main.tsx: P49 motion layer must load after the material layer");
}

if (failures.length) {
  console.error("Motion system audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Motion system audit passed.");
