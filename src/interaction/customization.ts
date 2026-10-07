import {
  defaultExperienceSettings,
  type AppTheme,
  type BoardTheme,
  type ExperienceSettings,
  type PieceStyle,
} from "./types";

export interface CustomizationOption<T extends string> {
  id: T;
  label: string;
  description: string;
}

export const appThemeOptions: readonly CustomizationOption<AppTheme>[] = [
  {
    id: "graphite",
    label: "Graphite",
    description: "The default neutral tournament-workspace finish.",
  },
  {
    id: "obsidian",
    label: "Obsidian",
    description: "Deeper black surfaces with the same restrained blue system.",
  },
  {
    id: "warm-graphite",
    label: "Warm graphite",
    description: "A slightly warmer charcoal shell for long study sessions.",
  },
] as const;

export const boardThemeOptions: readonly CustomizationOption<BoardTheme>[] = [
  {
    id: "tournament",
    label: "Tournament",
    description: "Ivory and graphite — the default THIEPN board.",
  },
  {
    id: "walnut",
    label: "Walnut",
    description: "Warm wood-like squares without decorative texture.",
  },
  {
    id: "slate",
    label: "Slate",
    description: "Cool stone-gray squares with restrained contrast.",
  },
] as const;

export const pieceStyleOptions: readonly CustomizationOption<PieceStyle>[] = [
  {
    id: "classic",
    label: "Classic",
    description: "Balanced Staunton-inspired proportions and detail.",
  },
  {
    id: "club",
    label: "Club",
    description: "Heavier tournament silhouettes and stronger outlines.",
  },
  {
    id: "minimal",
    label: "Minimal",
    description: "Flatter, quieter pieces for dense analysis work.",
  },
] as const;

const appThemes = new Set<AppTheme>(appThemeOptions.map((option) => option.id));
const boardThemes = new Set<BoardTheme>(boardThemeOptions.map((option) => option.id));
const pieceStyles = new Set<PieceStyle>(pieceStyleOptions.map((option) => option.id));

export function normalizeExperienceSettings(
  settings?: Partial<ExperienceSettings> | null,
): ExperienceSettings {
  return {
    ...defaultExperienceSettings,
    ...settings,
    appTheme:
      settings?.appTheme && appThemes.has(settings.appTheme)
        ? settings.appTheme
        : defaultExperienceSettings.appTheme,
    boardTheme:
      settings?.boardTheme && boardThemes.has(settings.boardTheme)
        ? settings.boardTheme
        : defaultExperienceSettings.boardTheme,
    pieceStyle:
      settings?.pieceStyle && pieceStyles.has(settings.pieceStyle)
        ? settings.pieceStyle
        : defaultExperienceSettings.pieceStyle,
  };
}
