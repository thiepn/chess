import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const failures = [];

const app = read("src/App.tsx");
const board = read("src/components/ChessBoard.tsx");
const experience = read("src/components/ExperienceControls.tsx");
const coach = read("src/components/GameReviewCoach.tsx");
const lesson = read("src/components/LessonRunner.tsx");
const puzzle = read("src/components/PuzzleRunner.tsx");
const opening = read("src/components/OpeningTrainer.tsx");
const endgame = read("src/components/EndgameTechniqueRunner.tsx");
const calculation = read("src/components/CalculationRunner.tsx");
const assessment = read("src/components/AssessmentRunner.tsx");
const review = read("src/components/ReviewView.tsx");
const story = read("src/components/GameStoryView.tsx");
const library = read("src/components/LibraryView.tsx");
const game = read("src/components/GameArena.tsx");
const lichess = read("src/components/LichessSyncCard.tsx");
const css = read("src/styles/p52-accessibility.css");
const main = read("src/main.tsx");

const requireIn = (source, fragment, path) => {
  if (!source.includes(fragment)) {
    failures.push(`${path}: missing "${fragment}"`);
  }
};

for (const fragment of [
  'className="skip-link"',
  'href="#main-content"',
  'id="main-content"',
  'ref={mainContentRef}',
  'tabIndex={-1}',
  'mainContentRef.current?.focus',
  'document.title =',
]) {
  requireIn(app, fragment, "src/App.tsx");
}

for (const fragment of [
  'role="grid"',
  'aria-rowcount={8}',
  'aria-colcount={8}',
  'aria-describedby={instructionsId}',
  'role="status"',
  'aria-atomic="true"',
  '"legal capture target"',
  '"legal move target"',
  '"king in check"',
  '"last move origin"',
  '"last move destination, promotion"',
  '"last move destination, castling"',
]) {
  requireIn(board, fragment, "src/components/ChessBoard.tsx");
}

for (const fragment of [
  'aria-haspopup="dialog"',
  'aria-controls={dialogId}',
  'role="dialog"',
  'aria-labelledby={headingId}',
  'dialogRef.current',
]) {
  requireIn(experience, fragment, "src/components/ExperienceControls.tsx");
}

for (const fragment of [
  'aria-modal="true"',
  'aria-labelledby={headingId}',
  'event.key === "Escape"',
  'event.key !== "Tab"',
  'previousFocus?.focus()',
  'querySelectorAll<HTMLElement>(focusableSelector)',
]) {
  requireIn(coach, fragment, "src/components/GameReviewCoach.tsx");
}

for (const [path, source] of [
  ["src/components/LessonRunner.tsx", lesson],
  ["src/components/PuzzleRunner.tsx", puzzle],
  ["src/components/OpeningTrainer.tsx", opening],
]) {
  requireIn(source, 'role="alert"', path);
  requireIn(source, 'role="status"', path);
}

for (const fragment of [
  'aria-pressed={recognitionChoice === option.id}',
  'role={recognitionCorrect ? "status" : "alert"}',
  'className="endgame-status-chip" role="status"',
  'className="endgame-result-card"',
]) {
  requireIn(endgame, fragment, "src/components/EndgameTechniqueRunner.tsx");
}

for (const fragment of [
  'aria-current={id === phase ? "step" : undefined}',
  'role="status"',
  'className="calculation-engine-state" role="status"',
]) {
  requireIn(calculation, fragment, "src/components/CalculationRunner.tsx");
}

for (const fragment of [
  'role="progressbar"',
  'aria-valuemin={0}',
  'aria-valuemax={session.items.length}',
  'aria-valuenow={index + (answered ? 1 : 0)}',
  'role="status"',
]) {
  requireIn(assessment, fragment, "src/components/AssessmentRunner.tsx");
}

for (const fragment of [
  'role="group" aria-label="Your color"',
  'aria-pressed={playerColor === "w"}',
  'aria-pressed={playerColor === "b"}',
  'role="progressbar"',
  'className="analysis-error" role="alert"',
]) {
  requireIn(review, fragment, "src/components/ReviewView.tsx");
}

for (const fragment of [
  'aria-pressed={selectedPhase?.phase === phase.phase}',
  'aria-pressed={preview === "position"}',
  'aria-current={selectedPly === move.ply ? "step" : undefined}',
]) {
  requireIn(story, fragment, "src/components/GameStoryView.tsx");
}

for (const fragment of [
  'aria-pressed={study.favorite}',
  'aria-current={cursor === 0 ? "step" : undefined}',
  'aria-current={cursor === index + 1 ? "step" : undefined}',
  'className="library-workspace-status" role="status"',
]) {
  requireIn(library, fragment, "src/components/LibraryView.tsx");
}

for (const fragment of [
  'role="timer"',
  'aria-live="off"',
  'aria-label={`${profile.name} clock',
  'aria-label={`Your clock',
]) {
  requireIn(game, fragment, "src/components/GameArena.tsx");
}

for (const fragment of [
  'aria-label="Lichess username"',
  'role="status" aria-live="polite"',
  'role="alert"',
]) {
  requireIn(lichess, fragment, "src/components/LichessSyncCard.tsx");
}

for (const fragment of [
  ".skip-link",
  "a:focus-visible",
  "outline: 3px solid",
  "@media (prefers-contrast: more)",
  "@media (forced-colors: active)",
  ".chess-board-v2 .board-square:focus-visible",
]) {
  requireIn(css, fragment, "src/styles/p52-accessibility.css");
}

requireIn(main, 'import "./styles/p52-accessibility.css";', "src/main.tsx");

if (failures.length) {
  console.error("Accessibility audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Accessibility audit passed.");
