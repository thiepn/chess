import { describe, expect, it } from "vitest";
import original from "../../public/data/learning/g2-tactical-transfer-v1.json";
import historical from "../../public/data/learning/transfer-v1.json";
import { lessonForSkill } from "./lessons";
import { validateG2TacticalTransfer, g2TacticalSkillIds } from "./g2TacticalTransfer";
import { validateTransferCatalog } from "./transferCompletion";
import { assembleVerifiedLesson } from "./assembleVerifiedLesson";
import { g2ReplyComparison } from "./g2ReplyComparison";
import { summarizeLessonMastery } from "./mastery";

describe("G3 compare the two authored opponent replies", () => {
  const source = validateG2TacticalTransfer(original);
  const transfers = validateTransferCatalog(historical);

  it("exposes all 18 original tactical cases as 54 unscored, source-backed views", () => {
    let panels = 0;
    for (const skillId of g2TacticalSkillIds) {
      const base = lessonForSkill(skillId, "Original", "Original");
      const assembled = assembleVerifiedLesson(base, {
        transfer: transfers.get(skillId),
        tactical: source.get(skillId),
      });
      for (let i = 1; i <= 3; i++) {
        for (let reply = 1; reply <= 2; reply++) {
          const group = g2ReplyComparison(assembled, `g2-tactical-${i}-reply-${reply}`);
          expect(group?.options.map(option => option.id)).toEqual([
            `g2-tactical-${i}`,
            `g2-tactical-${i}-reply-1`,
            `g2-tactical-${i}-reply-2`,
          ]);
          const steps = assembled.steps;
          for (const option of group?.options ?? []) {
            expect(option.step).toBe(steps.find(step => step.id === option.id));
          }
          expect(group?.options[1].step.fen).not.toBe(group?.options[2].step.fen);
          panels++;
        }
      }
    }
    expect(panels).toBe(36);
  });

  it("never creates a graded choice or adds evidence from branch exploration", () => {
    const skillId = g2TacticalSkillIds[0];
    const assembled = assembleVerifiedLesson(
      lessonForSkill(skillId, "Original", "Original"),
      { transfer:transfers.get(skillId), tactical:source.get(skillId) },
    );
    const before = assembled.steps.filter(step => step.type === "move" || step.type === "choice");
    for (let i = 1; i <= 3; i++) {
      const compared = g2ReplyComparison(assembled, `g2-tactical-${i}-reply-1`)!;
      expect(compared.options[0].step.type).toBe("move");
      expect(compared.options[1].step.type).toBe("explain");
      expect(compared.options[2].step.type).toBe("explain");
      expect(compared.options[1].step).toMatchObject({ stage: "example" });
    }
    expect(assembled.steps.filter(step => step.type === "move" || step.type === "choice"))
      .toEqual(before);
    expect(summarizeLessonMastery(before.map(step => ({
      stepId:step.id, support:step.type === "choice" ? "retrieval" : step.support,
      correct:true, firstTry:true, hintsUsed:0, wrongAttempts:0,
    }))).masteryPassed).toBe(true);
  });

  it("fails closed on absent or duplicated original reply sources", () => {
    const skillId = g2TacticalSkillIds[0];
    const assembled = assembleVerifiedLesson(
      lessonForSkill(skillId, "Original", "Original"),
      {transfer:transfers.get(skillId), tactical:source.get(skillId)},
    );
    const id = "g2-tactical-1-reply-1";
    expect(g2ReplyComparison(assembled, id)).not.toBeNull();
    expect(g2ReplyComparison({...assembled,steps:assembled.steps.filter(step => step.id !== "g2-tactical-1-reply-2")}, id))
      .toBeNull();
    expect(g2ReplyComparison({...assembled,steps:[...assembled.steps, assembled.steps.find(step => step.id === id)!]}, id))
      .toBeNull();
    expect(g2ReplyComparison(assembled, "g2-tactical-1")).toBeNull();
    expect(g2ReplyComparison(assembled, "g2-tactical-0-reply-1")).toBeNull();
  });
});
