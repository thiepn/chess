/**
 * P92 source-v1 challenge ownership, independent of Chess.js. The historical
 * authored checks cannot be dropped or moved without a versioned migration:
 * doing so silently reduces graded independent transfer requirements.
 */
export const p92ChallengeSkillIds: ReadonlySet<string> = new Set([
  "rules.board",
  "rules.pieces",
  "rules.capture",
  "rules.check",
  "rules.check-responses",
  "rules.mate",
  "rules.castling",
  "rules.promotion",
  "fundamentals.values",
  "fundamentals.defended",
  "fundamentals.trades",
  "openings.principles",
  "openings.development",
  "openings.center",
  "openings.king-safety",
  "openings.queen-timing",
  "openings.tempo",
  "strategy.piece-activity",
  "strategy.worst-piece",
  "calculation.move-order",
  "strategy.open-files",
  "strategy.outposts",
  "pawns.breaks",
  "pawns.weaknesses",
  "defense.prophylaxis",
  "practical.plan",
]);

export function assertP92ChallengeOwnership(
  items: readonly { skillId: string; challenge?: unknown }[],
): void {
  const seen = new Set<string>();
  for (const entry of items) {
    if (!entry || typeof entry.skillId !== "string" || seen.has(entry.skillId))
      throw Error("Invalid historical P88 source identity");
    seen.add(entry.skillId);
    const required = p92ChallengeSkillIds.has(entry.skillId);
    const supplied = entry.challenge !== undefined && entry.challenge !== null;
    if (required !== supplied ||
        (supplied && (typeof entry.challenge !== "object" || Array.isArray(entry.challenge))))
      throw Error("Incomplete authored P92 transfer");
  }
  if ([...p92ChallengeSkillIds].some(id => !seen.has(id)))
    throw Error("Missing historical P92 challenge owner");
}
