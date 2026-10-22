import type { LessonScript, LessonStep } from "./types";

export interface G2ComparisonOption {
  id: string;
  label: string;
  step: LessonStep;
}

export interface G2ReplyComparison {
  caseNumber: number;
  options: readonly G2ComparisonOption[];
}

/**
 * Compare only the original G2 lesson's pre-authored boards. Both defenses
 * are examples, not competing correct answers or extra scored attempts.
 * Never invent a branch or accept a mismatched/missing source step.
 */
export function g2ReplyComparison(
  lesson: LessonScript,
  currentStepId: string,
): G2ReplyComparison | null {
  const match = /^g2-tactical-([1-9]\d*)-reply-([12])$/.exec(currentStepId);
  if (!match) return null;
  const caseNumber = Number(match[1]);
  if (!Number.isSafeInteger(caseNumber)) return null;
  const prefix = `g2-tactical-${caseNumber}`;
  const initial = lesson.steps.filter(step => step.id === prefix);
  const reply1 = lesson.steps.filter(step => step.id === `${prefix}-reply-1`);
  const reply2 = lesson.steps.filter(step => step.id === `${prefix}-reply-2`);
  if (initial.length !== 1 || reply1.length !== 1 || reply2.length !== 1 ||
      initial[0].type !== "move" || initial[0].stage !== "transfer" ||
      initial[0].support !== "transfer" ||
      reply1[0].type !== "explain" || reply1[0].stage !== "example" ||
      reply2[0].type !== "explain" || reply2[0].stage !== "example") return null;

  // Keep the original source's setup, titles, conditional explanations and
  // board FENs. Source adapters have already checked chess move legality.
  return {
    caseNumber,
    options: [
      { id:initial[0].id, label:"Original setup", step:initial[0] },
      { id:reply1[0].id, label:"Defense 1", step:reply1[0] },
      { id:reply2[0].id, label:"Defense 2", step:reply2[0] },
    ],
  };
}
