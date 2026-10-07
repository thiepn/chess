import { describe, expect, it } from "vitest";
import { learnSkillPath, resolveLearnRoute } from "./learnRoutes";

describe("P42 Learn routes", () => {
  it("keeps the course root as the default Learn surface", () => {
    expect(resolveLearnRoute("/learn")).toEqual({ section: "course" });
  });

  it("resolves repertoire and model games as real subpages", () => {
    expect(resolveLearnRoute("/learn/openings")).toEqual({
      section: "openings",
    });
    expect(resolveLearnRoute("/learn/model-games")).toEqual({
      section: "model-games",
    });
  });

  it("resolves an individual lesson page", () => {
    expect(resolveLearnRoute("/learn/tactics/tactics.pin")).toEqual({
      section: "course",
      skillId: "tactics.pin",
    });
  });

  it("builds a stable domain/lesson path", () => {
    expect(
      learnSkillPath({
        id: "calculation.forcing-lines",
        domain: "calculation",
      }),
    ).toBe("/learn/calculation/calculation.forcing-lines");
  });
});
