import { Chess } from "chess.js";
import type { CalculationPosition } from "../calculation/types";
import { legalOpeningContinuation } from "../openings/transitionStudy";
import { legalCalculationBranch } from "../calculation/branchFeedback";

/** Board-source legality only: neither a result predictor nor an evaluation writer. */
export function hydrateEndgameDecision(position: CalculationPosition): CalculationPosition | null {
  const study = position.endgameDecisionStudy;
  if (!study) return position;
  if (!position.id.startsWith("calc:p112-") || position.assessmentStatus !== "instructional-only" ||
      !/^calc:p10[12]-[0-9]{2}$/.test(study.sourceId) ||
      !Number.isInteger(study.stage) || study.stage < 1 || study.stage > 3 ||
      study.stageCount !== 3) return null;
  let chess: Chess;
  try { chess = new Chess(position.fen); }
  catch { return null; }
  if (chess.turn() !== position.playerColor || chess.isGameOver()) return null;
  const main = legalOpeningContinuation(position.fen, position.principalVariation);
  if (!main || main.join(" ") !== position.principalVariation.join(" ")) return null;
  const input = position.defensiveStudy?.variations;
  if (!input || input.length < 2 || input.length > 3) return null;
  const converted = input.map((variation, i) => {
    const extended = legalOpeningContinuation(position.fen, variation.moves);
    if (extended) return extended;
    // Some source-authored three-ply branches end in a no-move/drawn position.
    // Preserve that exact legally checked prefix rather than fabricating moves.
    if (i > 0 && variation.moves.length === 3 &&
        legalCalculationBranch({
          ...position, bestMove: variation.moves[0],
          principalVariation: variation.moves,
        })?.length === 3) return variation.moves;
    return null;
  });
  if (converted.some(line => !line || (line.length !== 3 && line.length !== 5))) return null;
  if (converted[0]?.length !== 5) return null;
  const branches = [main, ...converted as string[][]];
  if (new Set(branches.map(line => line.join(" "))).size !== branches.length) return null;
  return {
    ...position,
    bestMove: main[0],
    defensiveStudy: { ...position.defensiveStudy!,
      variations: input.map((variation, i) => ({ ...variation, moves: converted[i]! })),
    },
  };
}
