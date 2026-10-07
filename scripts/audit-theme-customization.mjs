import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const failures = [];

const types = read("src/interaction/types.ts");
const customization = read("src/interaction/customization.ts");
const provider = read("src/interaction/ExperienceProvider.tsx");
const controls = read("src/components/ExperienceControls.tsx");
const board = read("src/components/ChessBoard.tsx");
const piece = read("src/components/ChessPiece.tsx");
const game = read("src/components/GameArena.tsx");
const css = read("src/styles/p53-customization.css");
const main = read("src/main.tsx");

const requireIn = (source, fragment, path) => {
  if (!source.includes(fragment)) failures.push(`${path}: missing "${fragment}"`);
};

for (const fragment of [
  'export type AppTheme = "graphite" | "obsidian" | "warm-graphite"',
  'export type BoardTheme = "tournament" | "walnut" | "slate"',
  'export type PieceStyle = "classic" | "club" | "minimal"',
  'appTheme: "graphite"',
  'boardTheme: "tournament"',
  'pieceStyle: "classic"',
]) {
  requireIn(types, fragment, "src/interaction/types.ts");
}

for (const fragment of [
  'normalizeExperienceSettings',
  'appThemeOptions',
  'boardThemeOptions',
  'pieceStyleOptions',
  'settings?.appTheme && appThemes.has(settings.appTheme)',
  'settings?.boardTheme && boardThemes.has(settings.boardTheme)',
  'settings?.pieceStyle && pieceStyles.has(settings.pieceStyle)',
]) {
  requireIn(customization, fragment, "src/interaction/customization.ts");
}

for (const fragment of [
  'normalizeExperienceSettings(settings)',
  'root.dataset.appTheme = resolvedSettings.appTheme',
  'root.dataset.boardTheme = resolvedSettings.boardTheme',
  'root.dataset.pieceStyle = resolvedSettings.pieceStyle',
  'onChange({ ...resolvedSettings, ...patch })',
]) {
  requireIn(provider, fragment, "src/interaction/ExperienceProvider.tsx");
}

for (const fragment of [
  'aria-pressed={settings.appTheme === option.id}',
  'aria-pressed={settings.boardTheme === option.id}',
  'aria-pressed={settings.pieceStyle === option.id}',
  'data-preview-app-theme={option.id}',
  'data-preview-board-theme={option.id}',
]) {
  requireIn(controls, fragment, "src/components/ExperienceControls.tsx");
}

requireIn(board, 'styleVariant={settings.pieceStyle}', "src/components/ChessBoard.tsx");
requireIn(game, 'styleVariant={settings.pieceStyle}', "src/components/GameArena.tsx");
requireIn(piece, '`piece-style-${styleVariant}`', "src/components/ChessPiece.tsx");

for (const fragment of [
  'html[data-app-theme="graphite"]',
  'html[data-app-theme="obsidian"]',
  'html[data-app-theme="warm-graphite"]',
  'html[data-board-theme="tournament"]',
  'html[data-board-theme="walnut"]',
  'html[data-board-theme="slate"]',
  '.chess-piece-svg.piece-style-classic',
  '.chess-piece-svg.piece-style-club',
  '.chess-piece-svg.piece-style-minimal',
]) {
  requireIn(css, fragment, "src/styles/p53-customization.css");
}

for (const protectedToken of [
  "--chess-color-accent:",
  "--chess-color-correct:",
  "--chess-color-error:",
  "--chess-color-concept:",
]) {
  if (css.includes(protectedToken)) {
    failures.push(
      `src/styles/p53-customization.css: functional semantic token ${protectedToken} must not be theme-customizable`,
    );
  }
}

const customizationImport = main.indexOf('import "./styles/p53-customization.css";');
const accessibilityImport = main.indexOf('import "./styles/p52-accessibility.css";');
if (customizationImport < 0 || accessibilityImport < 0 || customizationImport > accessibilityImport) {
  failures.push("src/main.tsx: P53 customization must load before the P52 accessibility override layer");
}

if (failures.length) {
  console.error("Theme customization audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Theme customization audit passed.");
