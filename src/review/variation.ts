import { Chess } from "chess.js";
import type { GameStoryMoment } from "../games/types";

export interface LegalVariationStep {
  ply: number;
  uci: string;
  san: string;
  fen: string;
}

/** Replays only legal source-reported UCI moves. Never supplies a guessed continuation. */
export function legalVariation(fen: string, pv: readonly string[], limit = 8): LegalVariationStep[] {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return []; }
  if (!Array.isArray(pv)) return [];
  const steps: LegalVariationStep[] = [];
  const count = Math.max(0, Math.min(8, Math.floor(Number.isFinite(limit) ? limit : 0)));
  for (const uci of pv.slice(0, count)) {
    if (typeof uci !== "string" || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) break;
    try {
      const move = chess.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci.slice(4, 5) || "q",
      });
      if (!move) break;
      steps.push({ ply: steps.length + 1, uci, san: move.san, fen: chess.fen() });
    } catch {
      // The source PV may contain stale/malformed moves. Never display them as legal.
      break;
    }
  }
  return steps;
}

/** The reported first move must agree with the recorded best move for this exact FEN. */
export function momentVariation(moment: GameStoryMoment): LegalVariationStep[] {
  if (moment.bestMove === "(none)" || moment.principalVariation[0] !== moment.bestMove) return [];
  return legalVariation(moment.positionFen, moment.principalVariation);
}
