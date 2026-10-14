import { describe, expect, it } from "vitest";
import authored from "../../public/data/lessons/p116-lesson-content-v1.json";
import { originalPrimaryAssessmentPosition } from "./primaryLessonMoves";
import { buildPlacementAssessment, buildStageCheckpoint } from "./engine";
import { curriculumStages } from "../domain/curriculum";

describe("P116 original assessment source continuity", () => {
  it("keeps every original primary lesson FEN and move, without loading the full curriculum at startup", () => {
    for (const [id, value] of Object.entries(authored.seeds)) {
      expect(originalPrimaryAssessmentPosition(id), id).toEqual({
        fen: value.fen,
        move: value.move,
      });
    }
    expect(originalPrimaryAssessmentPosition("unknown-skill")).toBeUndefined();
  });
  it("keeps original placement and stage checkpoint constructors legal and synchronous", () => {
    const placement = buildPlacementAssessment(new Date("2026-10-14T00:00:00Z"));
    expect(placement.items.length).toBeGreaterThan(0);
    for (const stage of curriculumStages) {
      const checkpoint = buildStageCheckpoint(stage.id, 0, new Date("2026-10-14T00:00:00Z"));
      for (const item of checkpoint.items) {
        expect(item.fen).toBe(originalPrimaryAssessmentPosition(item.skillId)?.fen);
        expect(item.acceptedMoves).toEqual([originalPrimaryAssessmentPosition(item.skillId)?.move]);
      }
    }
  });
});
