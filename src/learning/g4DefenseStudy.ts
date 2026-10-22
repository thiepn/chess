import type { G2ComparisonOption, G2ReplyComparison } from "./g2ReplyComparison";

export interface G4DefenseStudyView {
  /** Board to display: unchanged setup until a chosen defense is revealed. */
  frame: G2ComparisonOption;
  chosen: G2ComparisonOption | null;
  isRevealed: boolean;
  revealedReplies: readonly G2ComparisonOption[];
  canCompare: boolean;
}

/**
 * Deliberate, unscored tactical reading of the original G2 reply positions.
 * A learner's prediction never becomes completion or mastery evidence.
 * Hidden replies must not leak their board, move arrow or authored explanation.
 */
export function g4DefenseStudy(
  source: G2ReplyComparison,
  selectedId: string | null,
  revealedIds: readonly string[],
): G4DefenseStudyView {
  const setup = source.options[0];
  const replies = source.options.slice(1).filter(option =>
    option.step.type === "explain" && option.step.stage === "example",
  );
  const chosen = replies.find(option => option.id === selectedId) ?? null;
  const revealed = replies.filter(option => revealedIds.includes(option.id));
  const isRevealed = chosen !== null && revealed.some(option => option.id === chosen.id);

  return {
    frame: isRevealed && chosen ? chosen : setup,
    chosen,
    isRevealed,
    revealedReplies: revealed,
    canCompare: replies.length === 2 && revealed.length === 2,
  };
}

/** Keep local study notes only across the two replies of the same G2 case. */
export function continuesG4Case(currentId: string, nextId: string): boolean {
  const pattern = /^g2-tactical-([1-9]\d*)-reply-[12]$/;
  const current = pattern.exec(currentId);
  const next = pattern.exec(nextId);
  return Boolean(current && next && current[1] === next[1] && currentId !== nextId);
}
