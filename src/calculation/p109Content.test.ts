import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import a from "../../public/data/calculation/p109-imbalances-a-v1.json";
import b from "../../public/data/calculation/p109-imbalances-b-v1.json";
import type { CalculationPosition } from "./types";
import { legalCalculationBranch } from "./branchFeedback";
import { verifiedDeepBranches } from "./deepCalculation";
import { studyMaterialFor } from "./studyDelivery";

const cases = [...a.positions, ...b.positions] as unknown as CalculationPosition[];

describe("P109 original positional-imbalance studies", () => {
  it("contains 40 distinct, balanced and explicitly unscored strategic situations", () => {
    expect(cases).toHaveLength(40);
    expect(new Set(cases.map(item => item.id)).size).toBe(40);
    expect(new Set(cases.map(item => item.fen)).size).toBe(40);
    expect(cases.filter(item => item.playerColor === "w")).toHaveLength(20);
    expect(cases.filter(item => item.playerColor === "b")).toHaveLength(20);
    const themes = cases.map(item => item.strategicImbalanceStudy?.theme);
    expect(new Set(themes).size).toBe(10);
    for (const theme of new Set(themes))
      expect(themes.filter(item => item === theme)).toHaveLength(4);
  });

  it("legally replays main and independent defender lines on the exact FEN", () => {
    for (const position of cases) {
      expect(position.id).toMatch(/^calc:p109-\d{2}$/);
      expect(position.assessmentStatus).toBe("instructional-only");
      expect(new Chess(position.fen).turn()).toBe(position.playerColor);
      const main = legalCalculationBranch(position);
      expect(main?.length).toBe(5);
      expect(main?.at(-1)?.afterFen).toBeTruthy();
      const branches = verifiedDeepBranches(position);
      expect(branches.length).toBeGreaterThanOrEqual(2);
      expect(branches[0].plies).toHaveLength(5);
      expect(branches[1].plies).toHaveLength(5);
      expect(branches[0].plies.map(row => row.uci).join(" "))
        .not.toBe(branches[1].plies.map(row => row.uci).join(" "));
    }
  });

  it("exposes three complete independently answerable practical decisions per source", () => {
    for (const position of cases) {
      const study = studyMaterialFor(position);
      expect(study?.questions).toHaveLength(3);
      for (const question of study?.questions ?? []) {
        expect(question.prompt.length).toBeGreaterThan(70);
        expect(question.answer.length).toBeGreaterThan(140);
        expect(question.repair.length).toBeGreaterThan(80);
      }
      expect(position.defensiveStudy?.variations).toHaveLength(1);
      expect(position.strategicImbalanceStudy?.planContrast.length).toBeGreaterThan(75);
      expect(position.explanation.length).toBeGreaterThan(300);
    }
  });
});
