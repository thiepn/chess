import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import source from "../../public/data/learning/g2-tactical-transfer-v1.json";
import historicalTransfers from "../../public/data/learning/transfer-v1.json";
import { deepTransferSkillIds, lessonForSkill } from "./lessons";
import { lessonPositionKey } from "./lessonPositionKey";
import { summarizeLessonMastery } from "./mastery";
import beginnerSource from "../../public/data/learning/g1-beginner-practice-v1.json";
import { validateBeginnerPractice } from "./beginnerPractice";
import { assembleVerifiedLesson } from "./assembleVerifiedLesson";
import { checkedTransfer, validateTransferCatalog } from "./transferCompletion";
import {
  g2TacticalSkillIds, validateG2TacticalTransfer, withG2TacticalTransfer,
} from "./g2TacticalTransfer";

describe("G2 authored original tactical transfer and differentiated defense", () => {
  it("validates exactly six source skills, eighteen unfamiliar boards, and both opponent replies", () => {
    const rows = validateG2TacticalTransfer(source);
    expect(rows.size).toBe(6);
    expect([...rows.keys()].sort()).toEqual([...g2TacticalSkillIds].sort());
    const positions = [...rows.values()].flatMap(row => row.cases);
    expect(positions).toHaveLength(18);
    expect(new Set(positions.map(item => item.fen)).size).toBe(18);
    expect(positions.flatMap(item => item.replies)).toHaveLength(36);
    expect(positions.every(item => Object.keys(item.wrongMoveFeedback).length === 1)).toBe(true);
    const historical = validateTransferCatalog(historicalTransfers);
    for (const skillId of g2TacticalSkillIds) {
      const original = historical.get(skillId)!;
      expect(original.challenge).toBeUndefined();
      for (const item of rows.get(skillId)!.cases) {
        expect(item.fen).not.toBe(original.fen);
      }
    }
  });

  it("uses chess.js for the original move, each conditional reply and mistaken legal alternative", () => {
    const rows = validateG2TacticalTransfer(source);
    for (const [skillId, entry] of rows) {
      for (const item of entry.cases) {
        const before = new Chess(item.fen);
        expect(before.isCheck(), skillId).toBe(false);
        const answer = item.acceptedMoves[0];
        expect(before.move({ from: answer.slice(0, 2),
          to: answer.slice(2, 4) }), skillId).toBeTruthy();
        if (skillId === "tactics.skewer" || skillId === "tactics.clearance")
          expect(before.isCheck(), skillId).toBe(true);
        for (const reply of item.replies) {
          const branch = new Chess(before.fen());
          expect(branch.move({ from: reply.uci.slice(0, 2),
            to: reply.uci.slice(2, 4) }), skillId).toBeTruthy();
          expect(branch.fen()).not.toBe(before.fen());
        }
        for (const wrong of Object.keys(item.wrongMoveFeedback)) {
          const alternate = new Chess(item.fen);
          expect(alternate.move({ from: wrong.slice(0, 2),
            to: wrong.slice(2, 4) }), skillId).toBeTruthy();
        }
      }
    }
  });

  it("preserves native historical transfer and appends exactly 3 scored checks with 6 unscored branch boards", () => {
    const historical = validateTransferCatalog(historicalTransfers);
    const cases = validateG2TacticalTransfer(source);
    for (const skillId of g2TacticalSkillIds) {
      const original = checkedTransfer(lessonForSkill(skillId, "Original", "Original"), historical.get(skillId)!);
      const updated = withG2TacticalTransfer(original, cases.get(skillId)!);
      expect(updated.id).toBe(original.id);
      expect(updated.skillId).toBe(skillId);
      expect(updated.steps).toHaveLength(original.steps.length + 9);
      const initialSteps = updated.steps.filter(step => original.steps.some(old => old.id === step.id));
      expect(initialSteps).toEqual(original.steps);
      const prompts = updated.steps.filter(step => step.id.startsWith("g2-tactical-") &&
        !step.id.includes("-reply-"));
      const replies = updated.steps.filter(step => step.id.includes("-reply-"));
      expect(prompts).toHaveLength(3);
      expect(replies).toHaveLength(6);
      for (const prompt of prompts)
        expect(prompt.type === "move" ? prompt.support : null).toBe("transfer");
      for (const reply of replies)
        expect(reply.type).toBe("explain");
      for (let i = 0; i < 3; i++) {
        const candidate = cases.get(skillId)!.cases[i];
        const after = new Chess(candidate.fen);
        after.move({from: candidate.acceptedMoves[0].slice(0, 2),
          to: candidate.acceptedMoves[0].slice(2, 4)});
        for (let j = 0; j < 2; j++) {
          const branch = new Chess(after.fen());
          const uci = candidate.replies[j].uci;
          branch.move({from: uci.slice(0, 2), to: uci.slice(2, 4)});
          const step = replies.find(item => item.id === `g2-tactical-${i + 1}-reply-${j + 1}`);
          expect(step?.fen).toBe(branch.fen());
          if (step?.type !== "explain") throw Error("Expected authored reply explanation");
          expect(step.arrows).toEqual([{
            from: uci.slice(0, 2), to: uci.slice(2, 4), tone: "focus",
          }]);
          expect(step.highlights).toEqual([{square:uci.slice(2, 4), tone:"focus"}]);
        }
      }
      const clean = updated.steps.filter(step => step.type === "move")
        .map(step => ({stepId: step.id, support: step.support,
          correct: true, firstTry: true, hintsUsed: 0, wrongAttempts: 0}));
      expect(summarizeLessonMastery(clean).masteryPassed).toBe(true);
      const assisted = clean.map(item => item.stepId === "g2-tactical-3"
        ? { ...item, firstTry: false, hintsUsed: 1 } : item);
      expect(summarizeLessonMastery(assisted).masteryPassed).toBe(false);
    }
  });


  it("assembles genuine G1 and G2 native lessons without rewriting their identities", () => {
    const historical = validateTransferCatalog(historicalTransfers);
    const tactics = validateG2TacticalTransfer(source);
    const beginner = validateBeginnerPractice(beginnerSource);
    const tacticalSkill = g2TacticalSkillIds[0];
    const tacticalBase = lessonForSkill(tacticalSkill, "Original", "Original");
    const tactical = assembleVerifiedLesson(tacticalBase, {
      transfer: historical.get(tacticalSkill),
      tactical: tactics.get(tacticalSkill),
    });
    expect(tactical.id).toBe(tacticalBase.id);
    expect(tactical.steps.filter(step => step.id.startsWith("g2-tactical-"))).toHaveLength(9);
    expect(tactical.steps.find(step => step.id === "transfer")).toBeDefined();

    const beginnerSkill = "rules.board";
    const beginnerBase = lessonForSkill(beginnerSkill, "Original", "Original");
    const assembledBeginner = assembleVerifiedLesson(beginnerBase, {
      transfer: historical.get(beginnerSkill),
      beginner: beginner.get(beginnerSkill),
    });
    expect(assembledBeginner.id).toBe(beginnerBase.id);
    expect(assembledBeginner.steps.filter(step => step.id.startsWith("g1-practice-"))).toHaveLength(8);
    expect(assembledBeginner.steps.find(step => step.id === "g1-practice-4")).toMatchObject({
      support: "transfer",
    });
    expect(assembledBeginner.steps.find(step => step.id === "g1-practice-8")).toMatchObject({
      support: "transfer",
    });
    // The base script's same-position retrieval is not the mandatory P88
    // transfer; G1 practice cannot silently replace that historical check.
    expect(() => assembleVerifiedLesson(beginnerBase, {
      beginner: beginner.get(beginnerSkill),
    })).toThrow(/P88 requires its verified historical transfer source/);
  });

  it("rejects inconsistent native lessons before rendering or awarding credit", () => {
    const historical = validateTransferCatalog(historicalTransfers);
    const tactics = validateG2TacticalTransfer(source);
    const skillId = g2TacticalSkillIds[0];
    const base = lessonForSkill(skillId, "Original", "Original");

    // G2 requires the historical independent anchor and cannot bypass P88.
    expect(() => assembleVerifiedLesson(base, { tactical: tactics.get(skillId) }))
      .toThrow(/verified historical transfer source/);

    const corrupted = { ...base, steps: [...base.steps, { ...base.steps[0] }] };
    expect(() => assembleVerifiedLesson(corrupted, {transfer: historical.get(skillId)}))
      .toThrow(/duplicate step identities/);

    // A syntactically sound independent item can still collide with the
    // original model position, which should fail the entire assembly.
    const collision = structuredClone(tactics.get(skillId)!);
    collision.cases[0].fen = base.steps[0].fen;
    expect(() => assembleVerifiedLesson(base, {
      transfer: historical.get(skillId), tactical: collision,
    })).toThrow(/reused an original transfer board/);
  });

  it("treats clock-only FEN changes as the same training position", () => {
    const same = source.items[0].cases[0].fen;
    const differentClocks = same.replace(/\s+\d+\s+\d+$/, " 48 96");
    expect(differentClocks).not.toBe(same);
    expect(lessonPositionKey(differentClocks)).toBe(lessonPositionKey(same));

    const tactical = structuredClone(source);
    tactical.items[1].cases[1].fen = differentClocks;
    expect(() => validateG2TacticalTransfer(tactical)).toThrow();

    const beginner = structuredClone(beginnerSource);
    const beginnerFen = beginner.items[0].exercises[0].fen;
    beginner.items[0].exercises[1].fen = beginnerFen.replace(/\s+\d+\s+\d+$/, " 48 96");
    expect(() => validateBeginnerPractice(beginner)).toThrow();

    // Individually legal source positions must not repeat a historical board
    // simply by changing the non-positional halfmove/fullmove counters.
    const historical = validateTransferCatalog(historicalTransfers);
    const skillId = g2TacticalSkillIds[0];
    const base = lessonForSkill(skillId, "Original", "Original");
    const collided = structuredClone(validateG2TacticalTransfer(source).get(skillId)!);
    collided.cases[0].fen = base.steps[0].fen.replace(/\s+\d+\s+\d+$/, " 48 96");
    expect(() => assembleVerifiedLesson(base, {
      transfer: historical.get(skillId), tactical: collided,
    })).toThrow(/reused an original transfer board/);
  });

  it("assembles every original beginner and G2 skill with its proper source authority", () => {
    const historical = validateTransferCatalog(historicalTransfers);
    const tactics = validateG2TacticalTransfer(source);
    const beginner = validateBeginnerPractice(beginnerSource);
    for (const [skillId, entry] of beginner) {
      const base = lessonForSkill(skillId, "Original", "Original");
      const lesson = assembleVerifiedLesson(base, {
        transfer: deepTransferSkillIds.includes(skillId) ? undefined : historical.get(skillId),
        beginner: entry,
      });
      expect(lesson.steps.filter(step => step.id.startsWith("g1-practice-"))).toHaveLength(8);
      expect(lesson.id).toBe(base.id);
    }
    for (const [skillId, entry] of tactics) {
      const base = lessonForSkill(skillId, "Original", "Original");
      const lesson = assembleVerifiedLesson(base, {
        transfer: historical.get(skillId), tactical: entry,
      });
      expect(lesson.steps.filter(step => step.id.startsWith("g2-tactical-"))).toHaveLength(9);
      expect(lesson.id).toBe(base.id);
    }
  });

  it("fails closed on missing, repeated, unsupported or illegal authored tactical evidence", () => {
    const missing = structuredClone(source);
    missing.items[0].cases.pop();
    expect(() => validateG2TacticalTransfer(missing)).toThrow();
    const repeat = structuredClone(source);
    repeat.items[1].cases[1].fen = repeat.items[0].cases[0].fen;
    expect(() => validateG2TacticalTransfer(repeat)).toThrow();
    const wrongReply = structuredClone(source);
    wrongReply.items[0].cases[0].replies[1].uci = "a1a1";
    expect(() => validateG2TacticalTransfer(wrongReply)).toThrow();
    const invalidAlternative = structuredClone(source);
    invalidAlternative.items[0].cases[0].wrongMoveFeedback = {
      "a1a1": "This is deliberately an invalid move with a long text entry which must not qualify as legal user feedback.",
    };
    expect(() => validateG2TacticalTransfer(invalidAlternative)).toThrow();
    const wrongSide = structuredClone(source);
    const originalFen = wrongSide.items[0].cases[0].fen;
    wrongSide.items[0].cases[0].fen = originalFen.replace(" w ", " b ");
    expect(() => validateG2TacticalTransfer(wrongSide)).toThrow();
    const rows = validateG2TacticalTransfer(source);
    const skillId = g2TacticalSkillIds[0];
    const original = lessonForSkill(skillId, "Original", "Original");
    expect(() => withG2TacticalTransfer(original, rows.get(skillId)!)).not.toThrow();
    const noTransfer = {...original, steps: original.steps.filter(step => step.id !== "transfer")};
    expect(() => withG2TacticalTransfer(noTransfer, rows.get(skillId)!)).toThrow();
  });
});
