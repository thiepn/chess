import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import first from "../../public/data/calculation/p110-prophylaxis-a-v1.json";
import second from "../../public/data/calculation/p110-prophylaxis-b-v1.json";
import a109 from "../../public/data/calculation/p109-imbalances-a-v1.json";
import b109 from "../../public/data/calculation/p109-imbalances-b-v1.json";
import type { CalculationPosition } from "./types";
import { legalCalculationBranch } from "./branchFeedback";
import { verifiedDeepBranches } from "./deepCalculation";
import { studyMaterialFor } from "./studyDelivery";

const cases = [...first.positions, ...second.positions] as unknown as CalculationPosition[];
const old = [...a109.positions, ...b109.positions] as unknown as CalculationPosition[];

describe("P110 prophylaxis and defense: actual legal unscored sources", () => {
  it("has 40 distinct cases across ten prevention themes and both sides", () => {
    expect(cases).toHaveLength(40);
    expect(new Set(cases.map(p => p.id)).size).toBe(40);
    expect(new Set(cases.map(p => p.fen)).size).toBe(40);
    expect(cases.filter(p => p.playerColor === "w")).toHaveLength(20);
    expect(cases.filter(p => p.playerColor === "b")).toHaveLength(20);
    const counts = new Map<string, number>();
    const previousFen = new Set(old.map(p => p.fen));
    for (const position of cases) {
      expect(previousFen.has(position.fen)).toBe(false);
      const theme = position.prophylaxisStudy?.theme;
      expect(theme).toBeTruthy();
      counts.set(theme!, (counts.get(theme!) ?? 0) + 1);
      expect(position.assessmentStatus).toBe("instructional-only");
      expect(position.source).toBe("authored");
      expect(new Chess(position.fen).turn()).toBe(position.playerColor);
    }
    expect(counts.size).toBe(10);
    for (const count of counts.values()) expect(count).toBe(4);
  });

  it("has actual five-ply, chess.js-legal independent alternatives", () => {
    for (const position of cases) {
      expect(position.bestMove).toBe(position.principalVariation[0]);
      expect(legalCalculationBranch(position)).toHaveLength(5);
      expect(position.defensiveStudy?.variations).toHaveLength(2);
      const sourceLines = [
        position.principalVariation,
        ...(position.defensiveStudy?.variations ?? []).map(v => v.moves),
      ];
      for (const line of sourceLines) {
        expect(line).toHaveLength(5);
        expect(legalCalculationBranch({
          fen: position.fen, playerColor: position.playerColor,
          bestMove: line[0], principalVariation: line,
        })).toHaveLength(5);
      }
      expect(new Set(sourceLines.map(line => line.join(" "))).size).toBeGreaterThanOrEqual(2);
      expect(verifiedDeepBranches(position).length).toBeGreaterThanOrEqual(2);
    }
  });

  it("offers substantial independent prediction, reply and replanning with specific repairs", () => {
    for (const position of cases) {
      const study = position.prophylaxisStudy!;
      expect(study.focus.length).toBeGreaterThan(60);
      expect(study.threat.length).toBeGreaterThan(110);
      expect(study.situationalDetail.length).toBeGreaterThan(120);
      expect(study.assessmentNote).toMatch(/unscored/i);
      expect(position.explanation.length).toBeGreaterThan(600);
      expect(studyMaterialFor(position)?.questions).toHaveLength(3);
      for (const question of studyMaterialFor(position)?.questions ?? []) {
        expect(question.prompt.length).toBeGreaterThan(80);
        expect(question.answer.length).toBeGreaterThan(260);
        expect(question.repair.length).toBeGreaterThan(150);
        expect(question.prompt).not.toBe(question.answer);
      }
    }
  });
});
