import { describe, expect, it } from "vitest";
import tacticsSource from "../../public/data/learning/g2-tactical-transfer-v1.json";
import historicalSource from "../../public/data/learning/transfer-v1.json";
import { lessonForSkill } from "./lessons";
import { assembleVerifiedLesson } from "./assembleVerifiedLesson";
import { g2TacticalSkillIds, validateG2TacticalTransfer } from "./g2TacticalTransfer";
import { g2ReplyComparison } from "./g2ReplyComparison";
import { continuesG4Case, g4DefenseStudy } from "./g4DefenseStudy";
import { validateTransferCatalog } from "./transferCompletion";

describe("G4 — predict, reveal and compare original defenses", () => {
  const tactics = validateG2TacticalTransfer(tacticsSource);
  const historical = validateTransferCatalog(historicalSource);

  it("keeps all 18 original cases hidden until explicitly revealed", () => {
    let cases = 0;
    for (const skillId of g2TacticalSkillIds) {
      const original = lessonForSkill(skillId, "Original", "Original");
      const lesson = assembleVerifiedLesson(original, {
        transfer: historical.get(skillId),
        tactical: tactics.get(skillId),
      });
      for (let caseNumber = 1; caseNumber <= 3; caseNumber++) {
        const group = g2ReplyComparison(lesson, `g2-tactical-${caseNumber}-reply-1`);
        expect(group).not.toBeNull();
        if (!group) continue;
        const setup = group.options[0];
        const defense1 = group.options[1];
        const defense2 = group.options[2];
        const untouched = g4DefenseStudy(group, null, []);
        expect(untouched.frame.step).toBe(setup.step);
        expect(untouched.chosen).toBeNull();
        expect(untouched.isRevealed).toBe(false);
        expect(untouched.canCompare).toBe(false);
        expect(untouched.revealedReplies).toHaveLength(0);

        for (const defense of [defense1, defense2]) {
          const hidden = g4DefenseStudy(group, defense.id, []);
          expect(hidden.chosen).toBe(defense);
          expect(hidden.frame).toBe(setup); // No FEN, arrow or answer leaked.
          expect(hidden.isRevealed).toBe(false);
          const revealed = g4DefenseStudy(group, defense.id, [defense.id]);
          expect(revealed.frame).toBe(defense);
          expect(revealed.isRevealed).toBe(true);
          expect(revealed.canCompare).toBe(false);
          expect(revealed.revealedReplies).toEqual([defense]);
        }

        const both = g4DefenseStudy(group, defense2.id, [defense1.id, defense2.id]);
        expect(both.canCompare).toBe(true);
        expect(both.revealedReplies).toEqual([defense1, defense2]);
        expect(both.revealedReplies.map(item => item.step.type)).toEqual(["explain", "explain"]);
        expect(both.frame.step.fen).toBe(defense2.step.fen);
        expect(lesson.steps).toEqual(assembleVerifiedLesson(original, {
          transfer: historical.get(skillId),
          tactical: tactics.get(skillId),
        }).steps); // No authored step changes or fake grades.
        cases++;
      }
    }
    expect(cases).toBe(18);
  });

  it("never exposes a defense from forged selection or forged reveal IDs", () => {
    const id = g2TacticalSkillIds[0];
    const lesson = assembleVerifiedLesson(lessonForSkill(id, "Original", "Original"), {
      transfer: historical.get(id), tactical: tactics.get(id),
    });
    const group = g2ReplyComparison(lesson, "g2-tactical-1-reply-1")!;
    const bogus = g4DefenseStudy(group, "g2-tactical-999-reply-1", [group.options[1].id]);
    expect(bogus.frame.step).toBe(group.options[0].step);
    expect(bogus.chosen).toBeNull();
    const hidden = g4DefenseStudy(group, group.options[2].id, [group.options[1].id, "forged"]);
    expect(hidden.frame.step).toBe(group.options[0].step);
    expect(hidden.canCompare).toBe(false);
  });

  it("preserves temporary reading notes only between original replies in one case", () => {
    expect(continuesG4Case("g2-tactical-1-reply-1", "g2-tactical-1-reply-2")).toBe(true);
    expect(continuesG4Case("g2-tactical-1-reply-2", "g2-tactical-1-reply-1")).toBe(true);
    for (const next of [
      "g2-tactical-2-reply-1", "g2-tactical-1", "transfer",
      "g1-practice-1", "g2-tactical-1-reply-1", "g2-tactical-1-reply-3",
    ]) {
      expect(continuesG4Case("g2-tactical-1-reply-1", next), next).toBe(false);
    }
  });
});
