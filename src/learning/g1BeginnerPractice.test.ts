import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import content from "../../public/data/learning/g1-beginner-practice-v1.json";
import original from "../../public/data/lessons/p116-lesson-content-v1.json";
import p88 from "../../public/data/learning/transfer-v1.json";
import { lessonForSkill } from "./lessons";
import { summarizeLessonMastery } from "./mastery";
import { checkedTransfer, validateTransferCatalog } from "./transferCompletion";
import { beginnerSkillIds, validateBeginnerPractice, withBeginnerPractice } from "./beginnerPractice";

describe("G1 source-qualified beginner depth in the existing lesson system", () => {
  const originalP88 = validateTransferCatalog(p88);

  it("loads exactly four original positions per each of the historical 16 beginner skills", () => {
    const catalog = validateBeginnerPractice(content);
    expect(catalog.size).toBe(16);
    expect(new Set(catalog.keys())).toEqual(new Set(beginnerSkillIds));
    const positions = [...catalog.values()].flatMap(entry => entry.exercises);
    expect(positions).toHaveLength(64);
    expect(new Set(positions.map(position => position.fen)).size).toBe(64);
    expect(positions.every(position => position.prompt.length >= 45 &&
      position.success.length >= 45 && position.misconception.length >= 45)).toBe(true);
    expect([...catalog.values()].filter(entry =>
      !!entry.exercises[0]?.wrongMoveFeedback).length).toBe(16);
  });

  it("uses chess.js legal board moves and verifies each of the teaching outcomes", () => {
    const catalog = validateBeginnerPractice(content);
    for (const [skillId, entry] of catalog) {
      for (const example of entry.exercises) {
        const chess = new Chess(example.fen);
        const candidate = example.acceptedMoves[0];
        const move = chess.move({ from: candidate.slice(0, 2),
          to: candidate.slice(2, 4), promotion: candidate.slice(4) || "q" });
        expect(move, skillId).toBeTruthy();
        if (skillId === "rules.mate") expect(chess.isCheckmate()).toBe(true);
        if (skillId === "rules.draws") expect(chess.isInsufficientMaterial()).toBe(true);
        if (skillId === "rules.check") expect(chess.isCheck()).toBe(true);
      }
    }
  });

  it("preserves every historical lesson step and never counts assisted practice as independent mastery", () => {
    const catalog = validateBeginnerPractice(content);
    for (const skillId of beginnerSkillIds) {
      const seed = original.seeds[skillId];
      const lesson = lessonForSkill(skillId, seed.title, seed.summary);
      const supplement = originalP88.get(skillId);
      const originalLesson = supplement ? checkedTransfer(lesson, supplement) : lesson;
      const updated = withBeginnerPractice(originalLesson, catalog.get(skillId)!);
      // Never count a worked P116/P88 board as one of the newly authored positions.
      const known = [seed.fen, ...originalLesson.steps.map(step => step.fen)];
      for (const exercise of catalog.get(skillId)!.exercises) {
        expect(known, skillId).not.toContain(exercise.fen);
      }
      expect(updated.id).toBe(originalLesson.id);
      expect(updated.skillId).toBe(skillId);
      expect(updated.steps).toHaveLength(originalLesson.steps.length + 4);
      for (const old of originalLesson.steps)
        expect(updated.steps.find(step => step.id === old.id)).toEqual(old);
      const extra = updated.steps.filter(step => step.id.startsWith("g1-practice-"));
      expect(extra.map(step => step.id)).toEqual(["g1-practice-1", "g1-practice-2",
        "g1-practice-3", "g1-practice-4"]);
      expect(extra.map(step => step.type === "move" ? step.support : "")).toEqual([
        "retrieval", "retrieval", "retrieval", "transfer",
      ]);
      const scored = updated.steps.filter(step => step.type === "move")
        .map(step => ({ stepId: step.id, support: step.support,
          correct: true, firstTry: true, hintsUsed: 0, wrongAttempts: 0 }));
      expect(summarizeLessonMastery(scored).masteryPassed).toBe(true);
      const assisted = scored.map(item => item.stepId === "g1-practice-4"
        ? { ...item, firstTry: false, hintsUsed: 1 } : item);
      expect(summarizeLessonMastery(assisted).masteryPassed).toBe(false);
    }
  });

  it("rejects forged moves, reused boards and missing content instead of awarding lesson credit", () => {
    const missing = structuredClone(content);
    missing.items.pop();
    expect(() => validateBeginnerPractice(missing)).toThrow();
    const forged = structuredClone(content);
    forged.items[0].exercises[0].acceptedMoves = ["a1a1"];
    expect(() => validateBeginnerPractice(forged)).toThrow();
    const duplicate = structuredClone(content);
    duplicate.items[1].exercises[0].fen = duplicate.items[0].exercises[0].fen;
    expect(() => validateBeginnerPractice(duplicate)).toThrow();
  });
});
