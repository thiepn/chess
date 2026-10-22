import { describe, expect, it } from "vitest";
import { mobileShellRoute } from "./mobileShell";

describe("mobile shell navigation", () => {
  it("keeps all five primary destinations in browsing mode", () => {
    for (const page of ["train", "learn", "play", "review", "library"] as const) {
      const screen = mobileShellRoute(page, "/" + page, false, false);
      expect(screen.mode).toBe("browse");
      expect(screen.showPrimaryNav).toBe(true);
    }
  });

  it("gives active games and training their own full-height screen", () => {
    expect(mobileShellRoute("play", "/play/game/abc", false, true)).toMatchObject({
      mode: "session", title: "Game", showPrimaryNav: false,
    });
    expect(mobileShellRoute("train", "/train/session/one", true, false)).toMatchObject({
      mode: "session", title: "Training", showPrimaryNav: false,
    });
  });

  it("retains a visible parent exit for deep reading and review", () => {
    expect(mobileShellRoute("learn", "/learn/tactics/tactics.pin", false, false).returnPath).toBe("/learn");
    expect(mobileShellRoute("review", "/review/game-1", false, false).returnPath).toBe("/review");
    expect(mobileShellRoute("library", "/library/studies/study-1", false, false).returnPath).toBe("/library");
    expect(mobileShellRoute("library", "/library/workspace", false, false).returnPath).toBe("/library");
    expect(mobileShellRoute("library", "/library/studies", false, false).showPrimaryNav).toBe(true);
  });

  it("never loses Progress or Settings navigation", () => {
    expect(mobileShellRoute("progress", "/progress", false, false).showPrimaryNav).toBe(true);
    expect(mobileShellRoute("settings", "/settings", false, false).showPrimaryNav).toBe(true);
  });
});
