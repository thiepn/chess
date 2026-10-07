import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const uiFiles = [
  "src/App.tsx",
  "src/components/LearnView.tsx",
  "src/components/PlayView.tsx",
  "src/components/ReviewView.tsx",
  "src/components/LibraryView.tsx",
  "src/components/ProgressView.tsx",
  "src/components/OpeningsView.tsx",
  "src/components/ModelGamesView.tsx",
  "src/components/LessonRunner.tsx",
  "src/components/PuzzleRunner.tsx",
  "src/components/GameStoryView.tsx",
  "src/components/GameReviewCoach.tsx",
  "src/components/OpeningTrainer.tsx",
  "src/components/EndgameTechniqueRunner.tsx",
  "src/components/CalculationRunner.tsx",
  "src/components/AssessmentRunner.tsx",
  "src/components/SavedStudyTrainer.tsx",
  "src/components/PersonalMistakeRunner.tsx",
  "src/components/GameArena.tsx",
  "src/components/LichessSyncCard.tsx",
  "src/components/ModelGameRunner.tsx",
];

const forbiddenPhrases = [
  "No dashboard between you and the board.",
  "Placement diagnostic",
  "Take diagnostic",
  "adaptive session",
  "adaptive queue",
  "Adaptive retrieval practice",
  "CHECKPOINT REMEDIATION",
  "FROM YOUR WEAKNESSES",
  "Evidence & model diagnostics",
  "Calibration, intervention outcomes and coach validation",
  "Coach readout",
  "Real-game transfer",
  "REPAIR QUEUE",
  "No repair queue",
  "Repair now",
  "You found the repair.",
  "does not repair the mistake",
  "does not repair the moment",
  "recall evidence only",
  "training evidence only",
  "P8 story",
  "recognition evidence",
  "mastery evidence",
  "mistake bank",
  "player model",
  "adaptive training",
  "Hints reduce evidence",
  "coming soon",
  "lorem ipsum",
  "great job",
  "keep going",
  "you got this",
  "level up",
  "AI-powered",
  "powered by AI",
];

const failures = [];

for (const relative of uiFiles) {
  const source = fs.readFileSync(path.join(root, relative), "utf8");
  const lower = source.toLowerCase();

  for (const phrase of forbiddenPhrases) {
    if (lower.includes(phrase.toLowerCase())) {
      failures.push(`${relative}: forbidden player-facing phrase "${phrase}"`);
    }
  }

  if (source.includes("BrainCircuit")) {
    failures.push(`${relative}: generic BrainCircuit icon is not allowed on chess surfaces`);
  }

  if (source.includes("Gamepad2")) {
    failures.push(`${relative}: generic Gamepad2 icon is not allowed on chess surfaces`);
  }

  if (source.includes("Sparkles")) {
    failures.push(`${relative}: decorative Sparkles icon is not allowed on chess surfaces`);
  }
}

const experience = fs.readFileSync(
  path.join(root, "src/components/ExperienceControls.tsx"),
  "utf8",
);
if (!experience.includes("<Sparkles size={16} />")) {
  failures.push(
    "src/components/ExperienceControls.tsx: celebrations should keep their semantically appropriate sparkle icon",
  );
}

const app = fs.readFileSync(path.join(root, "src/App.tsx"), "utf8");
for (const fragment of [
  'return "FROM YOUR GAMES"',
  'return "NEEDS PRACTICE"',
  'return "COURSE"',
  'return "CHECKPOINT FOLLOW-UP"',
  '"Placement check"',
  '"Nothing is due right now. Open Learn to choose a concept."',
]) {
  if (!app.includes(fragment)) {
    failures.push(`src/App.tsx: missing P54 copy fragment ${fragment}`);
  }
}

const learn = fs.readFileSync(
  path.join(root, "src/components/LearnView.tsx"),
  "utf8",
);
for (const fragment of [
  '"More results needed"',
  '"Review needed"',
  '"Starting point set"',
  "Understanding {gate.metrics.mastery}% · recall {gate.metrics.retention}% · in games {gate.metrics.transfer}%",
  "A short placement check can skip lessons you already know.",
  "Find my level",
]) {
  if (!learn.includes(fragment)) {
    failures.push(`src/components/LearnView.tsx: missing P54 player-facing copy ${fragment}`);
  }
}

const play = fs.readFileSync(
  path.join(root, "src/components/PlayView.tsx"),
  "utf8",
);
if (!play.includes("Choose your color, time, and opponent, then play.")) {
  failures.push("src/components/PlayView.tsx: concrete setup copy is required");
}

const review = fs.readFileSync(
  path.join(root, "src/components/ReviewView.tsx"),
  "utf8",
);
for (const fragment of [
  "Analyze the game, inspect critical moments, and save positions you want to practice.",
  "PRACTICE AGAIN",
  "No positions to revisit",
]) {
  if (!review.includes(fragment)) {
    failures.push(`src/components/ReviewView.tsx: missing P54 Review copy ${fragment}`);
  }
}

const progress = fs.readFileSync(
  path.join(root, "src/components/ProgressView.tsx"),
  "utf8",
);
for (const fragment of [
  ">Skill level<",
  ">Recall<",
  ">In games<",
  "How training shows up",
  "How progress is estimated",
  "Training methods",
]) {
  if (!progress.includes(fragment)) {
    failures.push(`src/components/ProgressView.tsx: missing P54 Progress label ${fragment}`);
  }
}

if (failures.length) {
  console.error("Visual content audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Visual content audit passed: ${uiFiles.length} UI files checked.`);
