import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import a103 from "../../public/data/calculation/p103-structures-a-v1.json";
import a104 from "../../public/data/calculation/p104-rooks-bishops-v1.json";
import a105 from "../../public/data/calculation/p105-checking-networks-v1.json";
import a106 from "../../public/data/calculation/p106-active-defense-v1.json";
import a109 from "../../public/data/calculation/p109-imbalances-a-v1.json";
import a110 from "../../public/data/calculation/p110-prophylaxis-a-v1.json";
import a111 from "../../public/data/calculation/p111-opening-bridges-a-v1.json";
import a112 from "../../public/data/calculation/p112-endgame-decisions-a-v1.json";
import { skillById } from "../domain/curriculum";
import type { CalculationPosition } from "./types";
import { alignSourceStudySkills, sourceStudyKind, sourceStudyTheme } from "./studySkillAlignment";

const samples = [a103, a104, a105, a106, a109, a110, a111, a112]
  .flatMap(asset => asset.positions) as unknown as CalculationPosition[];

describe("G0 source-qualified, unscored study routing", () => {
  it("routes actual authored themes, not generic tactical or unrelated stages", () => {
    const expected = [
      ["calc:p103-01", "pawns.iqp"],
      ["calc:p104-01", "strategy.coordination"],
      ["calc:p105-01", "attack.open-lines"],
      ["calc:p106-01", "defense.counterplay"],
      ["calc:p109-01", "strategy.imbalances"],
      ["calc:p110-01", "defense.prophylaxis"],
      ["calc:p111-01", "strategy.repertoire-middlegames"],
      ["calc:p112-01", "endgames.rook-activity"],
    ] as const;
    for (const [id,skillId] of expected) {
      const source = samples.find(item=>item.id===id);
      expect(source, id).toBeDefined();
      const aligned = alignSourceStudySkills(source!);
      expect(aligned.skillIds).toContain(skillId);
      expect(source!.id).toBe(aligned.id);
      expect(source!.fen).toBe(aligned.fen);
      expect(source!.bestMove).toBe(aligned.bestMove);
      expect(aligned.assessmentStatus).toBe("instructional-only");
    }
  });
  it("retains lawful authored source IDs and never creates non-existent skills", () => {
    for (const source of samples) {
      expect(sourceStudyKind(source)).not.toBeNull();
      expect(sourceStudyTheme(source).length).toBeGreaterThan(3);
      const aligned = alignSourceStudySkills(source);
      expect(new Set(aligned.skillIds).size).toBe(aligned.skillIds.length);
      expect(aligned.skillIds.every(id=>Boolean(skillById[id]))).toBe(true);
      expect(aligned.principalVariation).toEqual(source.principalVariation);
      expect(new Chess(aligned.fen).fen()).toBe(new Chess(source.fen).fen());
    }
  });
  it("does not change scored/personal-game sources or invent a study category", () => {
    const sample = samples[0];
    const unqualified = { ...sample, assessmentStatus: undefined };
    expect(alignSourceStudySkills(unqualified)).toBe(unqualified);
    expect(sourceStudyKind(unqualified)).toBeNull();
    const privateSource = { ...sample, source: "personal-game" as const, id: "calc:mistake:owned" };
    expect(alignSourceStudySkills(privateSource)).toBe(privateSource);
  });
});
