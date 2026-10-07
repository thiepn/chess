import { describe, expect, it } from "vitest";
import {
  playGameKey,
  playGamePath,
  resolvePlayRoute,
  setupFromGameKey,
} from "./playRoutes";

describe("P43 Play routes", () => {
  it("uses /play as the compact pre-game setup page", () => {
    expect(resolvePlayRoute("/play")).toEqual({ mode: "setup" });
  });

  it("creates a stable standard-game URL", () => {
    const setup = {
      mode: "standard" as const,
      playerColor: "b" as const,
      aiProfileId: "adaptive" as const,
      timeControl: "10+0" as const,
    };
    expect(playGameKey(setup)).toBe("standard:b:adaptive:10+0");
    expect(playGamePath(setup)).toBe(
      "/play/game/standard%3Ab%3Aadaptive%3A10%2B0",
    );
  });

  it("creates stable scenario URLs", () => {
    const setup = {
      mode: "defense" as const,
      playerColor: "w" as const,
      aiProfileId: "club" as const,
      scenarioId: "defense-hold-rook",
    };
    expect(playGameKey(setup)).toBe(
      "scenario:defense-hold-rook:club",
    );
    expect(setupFromGameKey(playGameKey(setup))).toMatchObject({
      scenarioId: "defense-hold-rook",
      aiProfileId: "club",
    });
  });

  it("resolves the active game route", () => {
    expect(
      resolvePlayRoute("/play/game/standard%3Aw%3Aclub%3A15%2B10"),
    ).toEqual({
      mode: "game",
      gameKey: "standard:w:club:15+10",
    });
  });
});
