import { describe, expect, it } from "vitest";
import { scoreCalculationAttempt } from "./scoring";

describe("P29 calculation scoring", () => {
  it("rewards generating and calculating the full reference line", () => {
    const result = scoreCalculationAttempt({
      positionId: "calc:test",
      source: "authored",
      candidates: [
        { uci: "f5d6", san: "Nd6+" },
        { uci: "f5h4", san: "Nh4" },
      ],
      selectedMove: "f5d6",
      bestMove: "f5d6",
      predictedReply: "e8d8",
      bestReply: "e8d8",
      predictedContinuation: "d6c8",
      bestContinuation: "d6c8",
      visualizationUsed: true,
    });

    expect(result.success).toBe(true);
    expect(result.quality).toBe(1);
    expect(result.evidence.lineDepth).toBe(3);
    expect(result.evidence.visualizationUsed).toBe(true);
  });

  it("separates candidate generation from selecting the best candidate", () => {
    const result = scoreCalculationAttempt({
      positionId: "calc:test",
      source: "authored",
      candidates: [
        { uci: "f5d6", san: "Nd6+" },
        { uci: "f5h4", san: "Nh4" },
      ],
      selectedMove: "f5h4",
      bestMove: "f5d6",
      predictedReply: "e8d8",
      bestReply: "e8d8",
      predictedContinuation: "h4f5",
      bestContinuation: "d6c8",
      visualizationUsed: false,
    });

    expect(result.evidence.candidateScore).toBe(1);
    expect(result.evidence.selectedMoveScore).toBe(0);
    expect(result.evidence.lineDepth).toBe(0);
    expect(result.success).toBe(false);
  });

  it("does not hide a broken reply behind a correct first move", () => {
    const result = scoreCalculationAttempt({
      positionId: "calc:test",
      source: "personal-game",
      candidates: [
        { uci: "f5d6", san: "Nd6+" },
      ],
      selectedMove: "f5d6",
      bestMove: "f5d6",
      predictedReply: "e8f8",
      bestReply: "e8d8",
      predictedContinuation: "d6c8",
      bestContinuation: "d6c8",
      visualizationUsed: false,
    });

    expect(result.evidence.lineDepth).toBe(1);
    expect(result.evidence.replyScore).toBe(0);
    expect(result.success).toBe(false);
  });
});
