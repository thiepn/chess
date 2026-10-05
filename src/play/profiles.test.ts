import { describe, expect, it } from "vitest";
import { emptyMastery } from "../domain/mastery";
import { adaptiveAiProfile, resolveAiProfile } from "./profiles";

function mastery(value: number) {
  const item = emptyMastery("fundamentals.hanging");
  item.effectiveMastery = value;
  return {
    "fundamentals.hanging": item,
    "fundamentals.blunder-check": { ...item, skillId: "fundamentals.blunder-check" },
    "tactics.double-attack": { ...item, skillId: "tactics.double-attack" },
    "tactics.pin": { ...item, skillId: "tactics.pin" },
    "calculation.candidates": { ...item, skillId: "calculation.candidates" },
    "calculation.reply": { ...item, skillId: "calculation.reply" },
    "openings.principles": { ...item, skillId: "openings.principles" },
    "endgames.opposition": { ...item, skillId: "endgames.opposition" },
    "defense.threats": { ...item, skillId: "defense.threats" },
    "conversion.simplify": { ...item, skillId: "conversion.simplify" },
  };
}

describe("adaptive AI profiles", () => {
  it("increases engine resistance with player mastery", () => {
    const low = adaptiveAiProfile(mastery(20));
    const high = adaptiveAiProfile(mastery(85));

    expect(high.skillLevel).toBeGreaterThan(low.skillLevel);
    expect(high.depth).toBeGreaterThan(low.depth);
  });

  it("keeps manual profiles stable regardless of mastery", () => {
    const low = resolveAiProfile("club", mastery(10));
    const high = resolveAiProfile("club", mastery(90));

    expect(low.skillLevel).toBe(high.skillLevel);
    expect(low.depth).toBe(high.depth);
  });
});
