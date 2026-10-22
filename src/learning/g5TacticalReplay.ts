import { Chess, type Square } from "chess.js";
import type { G2Entry } from "./g2TacticalTransfer";
import type { G2ReplyComparison } from "./g2ReplyComparison";
import type { BoardArrow, BoardHighlight } from "./types";

export interface G5ReplayFrame {
  id: "setup" | "tactic" | "reply";
  label: string;
  fen: string;
  explanation: string;
  arrows: readonly BoardArrow[];
  highlights: readonly BoardHighlight[];
}

export interface G5TacticalReplay {
  sourceStepId: string;
  replyStepId: string;
  frames: readonly [G5ReplayFrame, G5ReplayFrame, G5ReplayFrame];
}

function playAuthoredMove(board: Chess, uci: string) {
  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) return null;
  try {
    const move = board.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.slice(4) || "q",
    });
    if (!move || `${move.from}${move.to}${move.promotion ?? ""}` !== uci) return null;
    return move;
  } catch {
    return null;
  }
}

/**
 * Source-owned two-ply replay, not engine analysis. The original White move
 * and Black reply are executed by chess.js and cross-checked against the
 * assembled G2 lesson positions before any frame is presented.
 */
export function g5TacticalReplay(
  entry: G2Entry,
  comparison: G2ReplyComparison,
  replyId: string,
): G5TacticalReplay | null {
  const match = /^g2-tactical-([1-9]\d*)-reply-([12])$/.exec(replyId);
  if (!match || Number(match[1]) !== comparison.caseNumber) return null;
  const caseNumber = Number(match[1]);
  const replyNumber = Number(match[2]);
  const source = entry.cases[caseNumber - 1];
  const setup = comparison.options[0];
  const option = comparison.options[replyNumber];
  const reply = source?.replies[replyNumber - 1];
  if (!source || source.acceptedMoves.length !== 1 ||
      source.replies.length !== 2 || setup?.id !== `g2-tactical-${caseNumber}` ||
      setup.step.type !== "move" || option?.id !== replyId ||
      option.step.type !== "explain" || !reply ||
      source.fen !== setup.step.fen ||
      source.acceptedMoves[0] !== setup.step.acceptedMoves[0]) return null;

  try {
    const board = new Chess(source.fen);
    if (board.turn() !== "w") return null;
    const white = playAuthoredMove(board, source.acceptedMoves[0]);
    if (!white || board.turn() !== "b") return null;
    const afterWhite = board.fen();
    const black = playAuthoredMove(board, reply.uci);
    if (!black || board.fen() !== option.step.fen) return null;

    const indicator = (from: Square, to: Square) => ({
      arrows: [{ from, to, tone: "focus" as const }],
      highlights: [{ square: to, tone: "focus" as const }],
    });

    return {
      sourceStepId: setup.id,
      replyStepId: option.id,
      frames: [
        {
          id: "setup",
          label: "Original position",
          fen: source.fen,
          explanation: source.prompt,
          arrows: [],
          highlights: [],
        },
        {
          id: "tactic",
          label: `White: ${white.san}`,
          fen: afterWhite,
          explanation: source.successByMove[source.acceptedMoves[0]] ?? source.success,
          ...indicator(white.from, white.to),
        },
        {
          id: "reply",
          label: `Black: ${black.san}`,
          fen: option.step.fen,
          explanation: reply.explanation,
          ...indicator(black.from, black.to),
        },
      ],
    };
  } catch {
    return null;
  }
}

/** Step navigation is bounded to the three original authored positions. */
export function g5ReplayIndex(current: number, direction: -1 | 1): number {
  return Math.min(2, Math.max(0, Math.trunc(current) + direction));
}
