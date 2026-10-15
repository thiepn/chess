import type { CalculationPosition } from "../calculation/types";
import { sourceStudyKind, sourceStudyTheme } from "../calculation/studySkillAlignment";

/** Contextual study discovery must be grounded in original author-assigned study
 * family + theme. A legal illustrative position is NOT an engine-certified
 * best move, nor does a related theme make the original skill ID equivalent. */
const originalThemes: Readonly<Record<string, Readonly<Record<string, RegExp>>>> = {
  "tactics.combinations": { kingAttackStudy: /check|queen.bishop|initiative|rook|mate|sacrifice/i },
  "tactics.defensive-resources": { defensiveTechniqueStudy: /counter|interpos|defen|trade|flight|shield|fortress|rook|king/i },
  "calculation.branching": { strategicImbalanceStudy: /material|activity|exchange|plan|initiative/i },
  "calculation.evaluation": { strategicImbalanceStudy: /material|activity|compensation|king|space|pawn/i },
  "strategy.imbalances": { strategicImbalanceStudy: /./ },
  "strategy.bishop-vs-knight": {
    strategicImbalanceStudy: /bishop versus knight/i,
    pieceCoordinationStudy: /knight outpost versus bishop/i,
  },
  "strategy.exchanges": {
    strategicImbalanceStudy: /favorable exchanges/i,
    defensiveTechniqueStudy: /trade|exchange|recapture/i,
    pieceCoordinationStudy: /piece harmony and exchanges/i,
    endgameDecisionStudy: /exchange or preserve/i,
  },
  "strategy.restriction": {
    prophylaxisStudy: /restriction|weak.square|minor.piece restraint|invasion prevention/i,
    pawnStructureStudy: /fixed color complexes|space and piece placement/i,
    pieceCoordinationStudy: /prophylaxis before expansion|knight blockades and king coordination/i,
  },
  "strategy.coordination": {
    pieceCoordinationStudy: /harmony|coordination|rook lifts|diagonal|piece|bishop rehabilitation/i,
    strategicImbalanceStudy: /coordination and revising/i,
  },
  "pawns.iqp": { pawnStructureStudy: /^isolated queen.s pawn$/i },
  "pawns.hanging": { pawnStructureStudy: /^hanging c- and d-pawns$/i },
  "pawns.minority": { pawnStructureStudy: /^carlsbad minority attack$/i },
  "strategy.repertoire-middlegames": { openingTransitionStudy: /./ },
  "endgames.rook-checks": {
    defensiveTechniqueStudy: /rook checks|king flight under forcing rook/i,
    endgameDecisionStudy: /rook behind|exchange or preserve the rook/i,
  },
  "endgames.opposite-bishops": { endgameDecisionStudy: /opposite.colou?red bishops/i },
  "endgames.minor-piece": { endgameDecisionStudy: /minor piece versus active king/i },
  "conversion.two-weaknesses": {
    pawnStructureStudy: /pawn islands and wing targets/i,
    strategicImbalanceStudy: /pawn weaknesses and compensation|weak squares and color/i,
  },
  "practical.complications": {
    kingAttackStudy: /initiative at material cost|poisoned blocking rook|queen|rook checks/i,
    defensiveTechniqueStudy: /countercheck|queen counterplay|fortress/i,
  },
};
export function originalAdvancedThemeMatch(skillId: string, position: CalculationPosition): boolean {
  if (position.source !== "authored") return false;
  const kind = sourceStudyKind(position);
  const predicate = kind && originalThemes[skillId]?.[kind];
  return Boolean(predicate && predicate.test(sourceStudyTheme(position)));
}
