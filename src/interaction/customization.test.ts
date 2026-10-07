import { describe, expect, it } from "vitest";
import {
  appThemeOptions,
  boardThemeOptions,
  normalizeExperienceSettings,
  pieceStyleOptions,
} from "./customization";
import { defaultExperienceSettings } from "./types";

describe("experience customization", () => {
  it("keeps the curated option sets intentionally small", () => {
    expect(appThemeOptions.map((option) => option.id)).toEqual([
      "graphite",
      "obsidian",
      "warm-graphite",
    ]);
    expect(boardThemeOptions.map((option) => option.id)).toEqual([
      "tournament",
      "walnut",
      "slate",
    ]);
    expect(pieceStyleOptions.map((option) => option.id)).toEqual([
      "classic",
      "club",
      "minimal",
    ]);
  });

  it("upgrades pre-P53 settings with customization defaults", () => {
    expect(
      normalizeExperienceSettings({
        motion: "reduced",
        sound: true,
        haptics: false,
        celebrations: false,
      }),
    ).toEqual({
      ...defaultExperienceSettings,
      motion: "reduced",
      sound: true,
      haptics: false,
      celebrations: false,
    });
  });

  it("preserves valid saved customization", () => {
    const settings = normalizeExperienceSettings({
      ...defaultExperienceSettings,
      appTheme: "obsidian",
      boardTheme: "walnut",
      pieceStyle: "club",
    });

    expect(settings.appTheme).toBe("obsidian");
    expect(settings.boardTheme).toBe("walnut");
    expect(settings.pieceStyle).toBe("club");
  });

  it("falls back from invalid persisted customization values", () => {
    const settings = normalizeExperienceSettings({
      ...defaultExperienceSettings,
      appTheme: "neon" as never,
      boardTheme: "rainbow" as never,
      pieceStyle: "emoji" as never,
    });

    expect(settings.appTheme).toBe(defaultExperienceSettings.appTheme);
    expect(settings.boardTheme).toBe(defaultExperienceSettings.boardTheme);
    expect(settings.pieceStyle).toBe(defaultExperienceSettings.pieceStyle);
  });
});
