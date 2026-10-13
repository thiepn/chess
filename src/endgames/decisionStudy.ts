import { Chess } from "chess.js";
import type { CalculationPosition } from "../calculation/types";
import { legalOpeningContinuation } from "../openings/transitionStudy";

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
  const converted = input.map(variation => legalOpeningContinuation(position.fen, variation.moves));
  if (converted.some(line => !line)) return null;
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
