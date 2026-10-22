import corpus from "../../public/data/lessons/p116-lesson-content-v1.json";
import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { deepTransferSkillIds, lessonForSkill, lessonScripts } from "./lessons";
import { isIndependentLessonPosition, lessonPositionKey } from "./lessonPositionKey";

describe("P116 complete on-demand lesson content", () => {
  it("preserves all original skill identities and content-backed lesson scripts", () => {
    expect(corpus.version).toBe(1);
    const originalIds = Object.keys(corpus.seeds);
    expect(originalIds).toHaveLength(86);
    expect(Object.keys(lessonScripts).sort()).toEqual(originalIds.sort());
    expect(deepTransferSkillIds.slice().sort()).toEqual(Object.keys(corpus.transferSeeds).sort());
    for (const skillId of originalIds) {
      const source = corpus.seeds[skillId as keyof typeof corpus.seeds];
      const lesson = lessonForSkill(skillId, source.title, source.summary);
      expect(lesson.skillId).toBe(skillId);
      expect(lesson.steps).toHaveLength(8);
      expect(lesson.steps[0].fen).toBe(source.fen);
      expect(lesson.steps[0].type).toBe("explain");
      if (lesson.steps[0].type === "explain") expect(lesson.steps[0].body).toBe(source.body);
    }
  });
  it("preserves all 37 P116 independent transfers and 49 honest retrieval fallbacks", () => {
    const deep = new Set(Object.keys(corpus.transferSeeds));
    expect(deep.size).toBe(37);
    for (const [skillId, source] of Object.entries(corpus.seeds)) {
      const lesson = lessonForSkill(skillId, "", "");
      const transfer = lesson.steps.find(step => step.id === "transfer");
      expect(transfer?.type, skillId).toBe("move");
      if (transfer?.type !== "move") continue;
      const authored = corpus.transferSeeds[skillId as keyof typeof corpus.transferSeeds];
      const independent = Boolean(authored);
      expect(isIndependentLessonPosition(source.fen, transfer.fen), skillId)
        .toBe(independent);
      expect(transfer.support, skillId).toBe(independent ? "transfer" : "retrieval");
    }
  });

  it("does not qualify a clock-only model replay as new P116 transfer evidence", () => {
    const model = corpus.seeds["fundamentals.attacked"].fen;
    const changedClocks = model.replace(/\s+\d+\s+\d+$/, " 49 100");
    expect(changedClocks).not.toBe(model);
    expect(lessonPositionKey(changedClocks)).toBe(lessonPositionKey(model));
    expect(isIndependentLessonPosition(model, changedClocks)).toBe(false);
    expect(isIndependentLessonPosition(model, model)).toBe(false);
    const actual = corpus.transferSeeds["fundamentals.attacked"].fen;
    expect(isIndependentLessonPosition(model, actual)).toBe(true);
    expect(isIndependentLessonPosition(model, changedClocks.replace(" w ", " b ")))
      .toBe(true);
  });

  it("keeps explicit transfer positions and authored move identities intact", () => {
    const entries = Object.entries(corpus.transferSeeds);
    expect(entries).toHaveLength(37);
    for (const [skillId, entry] of entries) {
      const lesson = lessonForSkill(skillId, "", "");
      const transfer = lesson.steps.find((step) => step.id === "transfer");
      expect(transfer?.type).toBe("move");
      if (transfer?.type !== "move") continue;
      expect(transfer.fen).toBe(entry.fen);
      expect(transfer.acceptedMoves).toEqual(entry.acceptedMoves);
      const board = new Chess(entry.fen);
      expect(board.moves({ verbose: true }).some((move) =>
        entry.acceptedMoves.includes(move.from + move.to + (move.promotion ?? "")))).toBe(true);
    }
  });
});
