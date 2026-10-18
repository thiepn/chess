import type { LessonScript } from "./types";
import { checkedTransfer, type TransferExercise } from "./transferCompletion";
import { withBeginnerPractice, type BeginnerPracticeEntry } from "./beginnerPractice";
import { withG2TacticalTransfer, type G2Entry } from "./g2TacticalTransfer";

export interface VerifiedLessonSources {
  transfer?: TransferExercise;
  beginner?: BeginnerPracticeEntry;
  tactical?: G2Entry;
}

/**
 * Compose only the existing, author-validated lesson adapters. An adapter can
 * reject an otherwise well-formed source if it duplicates a historical board
 * or lacks the original transfer anchor. Never render a partially composed
 * scored lesson, nor replace original step identities or grading authority.
 */
export function assembleVerifiedLesson(
  base: LessonScript,
  sources: VerifiedLessonSources,
): LessonScript {
  // G2 is defined as *additional* transfer after the verified P88 exercise.
  // The fallback model-position transfer in a base script is not that evidence.
  if (sources.tactical && !sources.transfer)
    throw Error("G2 requires its verified historical transfer source");
  const withTransfer = sources.transfer
    ? checkedTransfer(base, sources.transfer) : base;
  const withBeginner = sources.beginner
    ? withBeginnerPractice(withTransfer, sources.beginner) : withTransfer;
  const lesson = sources.tactical
    ? withG2TacticalTransfer(withBeginner, sources.tactical) : withBeginner;

  const ids = lesson.steps.map(step => step.id);
  if (!ids.length || ids.some(id => !id.trim()) || new Set(ids).size !== ids.length)
    throw Error("Original lesson contains missing or duplicate step identities");
  // A source mismatch must never become a scored lesson from another skill.
  if (lesson.skillId !== base.skillId || lesson.id !== base.id)
    throw Error("Original lesson identity changed during source assembly");
  return lesson;
}
