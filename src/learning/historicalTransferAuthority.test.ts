import { describe, expect, it } from "vitest";
import type { LessonScript } from "./types";
import { p88TransferSkillIds } from "./p92ChallengeIntegrity";
import { assertHistoricalTransferSource, assertOriginalTransferSlot } from "./historicalTransferAuthority";

const original: LessonScript = {
  id: "lesson-rules.board",
  skillId: "rules.board",
  title: "Board", summary: "Original source",
  steps: [
    {
      id: "model", type: "explain", stage: "model", title: "Model",
      body: "Original teaching", fen: "8/8/8/8/8/8/8/K6k w - - 0 1",
    },
    {
      id: "transfer", type: "move", stage: "transfer", support: "retrieval",
      title: "Original transfer slot", prompt: "Find the move",
      fen: "8/8/8/8/8/8/8/K6k w - - 0 1", acceptedMoves: ["a1a2"],
      successTitle: "Correct", successBody: "Completed", hints: [],
    },
  ],
};

describe("mandatory historical P88 handoff", () => {
  it("requires the original source for every one of the 49 P88 skills", () => {
    expect(p88TransferSkillIds.size).toBe(49);
    for (const skillId of p88TransferSkillIds) {
      expect(() => assertHistoricalTransferSource(skillId, false)).toThrow(/P88 requires/);
      expect(() => assertHistoricalTransferSource(skillId, true)).not.toThrow();
    }
    expect(() => assertHistoricalTransferSource("tactics.pin", false)).not.toThrow();
  });

  it("requires exactly one original movable transfer anchor", () => {
    expect(() => assertOriginalTransferSlot(original)).not.toThrow();
    expect(() => assertOriginalTransferSlot({
      ...original, steps: original.steps.filter(step => step.id !== "transfer"),
    })).toThrow(/Original transfer slot/);
    expect(() => assertOriginalTransferSlot({
      ...original, steps: [...original.steps, original.steps[1]],
    })).toThrow(/Original transfer slot/);
    expect(() => assertOriginalTransferSlot({
      ...original, steps: original.steps.map(step => step.id === "transfer"
        ? { ...original.steps[0], id: "transfer" } : step),
    })).toThrow(/Original transfer slot/);
  });
});
