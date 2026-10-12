/** Small projection of the original theme/seed-supported curriculum set.
 * Do not ship the entire authoring theme-map merely to enable buttons. */
const ids = new Set(`attack.defenders,attack.king-safety,attack.mating-net,attack.open-lines,attack.sacrifice,calculation.forcing-lines,calculation.quiet,conversion.simplify,defense.counterplay,defense.exchange-attackers,defense.prophylaxis,defense.threats,endgames.key-squares,endgames.lucena,endgames.opposition,endgames.pawn-races,endgames.philidor,endgames.rook-activity,fundamentals.attacked,fundamentals.defended,fundamentals.hanging,openings.center,openings.development,openings.king-safety,openings.principles,openings.tempo,pawns.passed,rules.mate,rules.promotion,strategy.open-files,strategy.outposts,strategy.piece-activity,strategy.worst-piece,tactics.back-rank,tactics.clearance,tactics.combinations,tactics.decoy,tactics.defensive-resources,tactics.deflection,tactics.discovered,tactics.double-attack,tactics.knight-fork,tactics.overload,tactics.pin,tactics.removing-defender,tactics.skewer`.split(","));
export const puzzleSupportedSkillIds = ids;
export function supportsPuzzlePractice(skillId: string) {
  return ids.has(skillId);
}
