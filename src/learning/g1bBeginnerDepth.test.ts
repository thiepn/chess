import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import source from "../../public/data/learning/g1-beginner-practice-v1.json";
import { lessonForSkill } from "./lessons";
import { summarizeLessonMastery } from "./mastery";
import { beginnerSkillIds, validateBeginnerPractice, withBeginnerPractice } from "./beginnerPractice";

describe("G1B eight authentic positions per original beginner skill", () => {
  it("preserves all 16 identities and validates 128 distinct positions, including 64 new cases", () => {
    const catalog = validateBeginnerPractice(source);
    expect(source.version).toBe(2);
    expect(catalog.size).toBe(beginnerSkillIds.length);
    const cases = [...catalog.values()].flatMap(row => row.exercises);
    expect(cases).toHaveLength(128);
    expect(new Set(cases.map(row => row.fen)).size).toBe(128);
    for (const skillId of beginnerSkillIds) {
      const entry = catalog.get(skillId)!;
      expect(entry.exercises).toHaveLength(8);
      expect(entry.exercises[4].wrongMoveFeedback).toBeDefined();
      expect(entry.exercises[4].prompt).not.toEqual(entry.exercises[0].prompt);
    }
  });

  it("qualifies all actual chess.js moves, genuine initial checks and source-specific outcomes", () => {
    const catalog = validateBeginnerPractice(source);
    for (const [skillId, entry] of catalog) {
      for (const item of entry.exercises) {
        const chess = new Chess(item.fen);
        const before = chess.isCheck();
        const uci = item.acceptedMoves[0];
        const played = chess.move({
          from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4) || "q",
        });
        expect(played, skillId).toBeTruthy();
        if (skillId === "rules.mate") expect(chess.isCheckmate()).toBe(true);
        if (skillId === "rules.draws") expect(chess.isInsufficientMaterial()).toBe(true);
        if (skillId === "rules.check") expect(chess.isCheck()).toBe(true);
        if (skillId === "rules.check-responses") {
          expect(before).toBe(true);
          expect(chess.isCheck()).toBe(false);
        }
        if (skillId === "rules.castling") expect(["O-O", "O-O-O"]).toContain(played!.san);
        if (skillId === "rules.promotion") expect(played!.promotion).toBe("q");
        for (const alternative of Object.keys(item.wrongMoveFeedback ?? {})) {
          const board = new Chess(item.fen);
          expect(board.move({ from: alternative.slice(0, 2),
            to: alternative.slice(2, 4), promotion: alternative.slice(4) || "q" }), skillId).toBeTruthy();
        }
      }
    }
  });

  it("keeps G1's fourth transfer step and adds the eighth without a new mastery authority", () => {
    const catalog = validateBeginnerPractice(source);
    for (const skillId of beginnerSkillIds) {
      const lesson = lessonForSkill(skillId, "Beginner skill", "Original curriculum description");
      const expanded = withBeginnerPractice(lesson, catalog.get(skillId)!);
      expect(expanded.id).toBe(lesson.id);
      expect(expanded.steps).toHaveLength(lesson.steps.length + 8);
      const original = expanded.steps.filter(step => lesson.steps.some(previous => previous.id === step.id));
      expect(original).toEqual(lesson.steps);
      const added = expanded.steps.filter(step => step.id.startsWith("g1-practice-"));
      expect(added.map(step => step.id)).toEqual(Array.from({ length: 8 }, (_, i) => `g1-practice-${i + 1}`));
      expect(added.map(step => step.type === "move" ? step.support : "")).toEqual([
        "retrieval", "retrieval", "retrieval", "transfer",
        "retrieval", "retrieval", "retrieval", "transfer",
      ]);
      const correct = expanded.steps.filter(step => step.type === "move")
        .map(step => ({ stepId: step.id, support: step.support,
          correct: true, firstTry: true, hintsUsed: 0, wrongAttempts: 0 }));
      expect(summarizeLessonMastery(correct).masteryPassed).toBe(true);
      expect(summarizeLessonMastery(correct.map(item =>
        item.stepId === "g1-practice-8"
          ? { ...item, firstTry: false, hintsUsed: 1 } : item)).masteryPassed).toBe(false);
    }
  });

  it("rejects missing, repeated, and impossible source records before learner credit", () => {
    const short = structuredClone(source);
    short.items[0].exercises.pop();
    expect(() => validateBeginnerPractice(short)).toThrow();
    const repeated = structuredClone(source);
    repeated.items[1].exercises[4].fen = repeated.items[0].exercises[4].fen;
    expect(() => validateBeginnerPractice(repeated)).toThrow();
    const impossible = structuredClone(source);
    impossible.items[0].exercises[4].acceptedMoves = ["h1h1"];
    expect(() => validateBeginnerPractice(impossible)).toThrow();
    const oldVersion = structuredClone(source);
    oldVersion.version = 1;
    expect(() => validateBeginnerPractice(oldVersion)).toThrow();
  });
});
