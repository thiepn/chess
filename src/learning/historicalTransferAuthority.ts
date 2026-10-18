import type { LessonScript } from "./types";
import { p88TransferSkillIds } from "./p92ChallengeIntegrity";

/** Original P88 authored sources are mandatory for all 49 P88 skills. */
export function assertHistoricalTransferSource(skillId: string, supplied: boolean): void {
  if (p88TransferSkillIds.has(skillId) && !supplied)
    throw Error("P88 requires its verified historical transfer source");
}

/** Never silently discard the P88 adapter when a base lesson is incomplete. */
export function assertOriginalTransferSlot(lesson: LessonScript): void {
  const slots = lesson.steps.filter(step => step.id === "transfer");
  if (slots.length !== 1 || slots[0].type !== "move" || slots[0].stage !== "transfer")
    throw Error("Original transfer slot missing or invalid");
}
