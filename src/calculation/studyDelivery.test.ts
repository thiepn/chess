import { describe, expect, it } from "vitest";
import { studyMaterialFor } from "./studyDelivery";
import type { CalculationPosition } from "./types";
import pawn from "../../public/data/calculation/p103-structures-a-v1.json";
import coordination from "../../public/data/calculation/p104-rooks-bishops-v1.json";
import attack from "../../public/data/calculation/p105-checking-networks-v1.json";
import defense from "../../public/data/calculation/p106-active-defense-v1.json";
import minor from "../../public/data/calculation/p100-minor-piece-v1.json";

describe("P107 independent source study adapters", () => {
  const cases = [
    ["pawn structures", pawn.positions, 3],
    ["piece coordination", coordination.positions, 3],
    ["king attack", attack.positions, 3],
    ["defensive technique", defense.positions, 3],
    ["earlier position with defensive question", minor.positions, 1],
  ] as const;
  for (const [name, positions, expected] of cases) {
    it(`turns authored ${name} into answerable model comparisons`, () => {
      for (const position of positions) {
        const study = studyMaterialFor(position as CalculationPosition);
        expect(study?.questions).toHaveLength(expected);
        for (const question of study?.questions ?? []) {
          expect(question.prompt.trim().length).toBeGreaterThan(10);
          expect(question.answer.trim().length).toBeGreaterThan(20);
          expect(question.prompt).not.toBe(question.answer);
        }
        expect(study?.reflection?.length).toBeGreaterThan(20);
      }
    });
  }
  it("does not fabricate answers for a position without study authority", () => {
    const position = {
      ...defense.positions[0], defensiveStudy: undefined,
      defensiveTechniqueStudy: undefined,
    } as unknown as CalculationPosition;
    expect(studyMaterialFor(position)).toBeNull();
  });
});
