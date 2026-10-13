import { Chess } from "chess.js";
import { openingNodes, repertoireById } from "./repertoire";
import type { CalculationPosition } from "../calculation/types";

/** Extend an authored prefix with transparent legal exploration, never a best-move verdict. */
export function legalOpeningContinuation(fen: string, prefix: string[]): string[] | null {
  if (!Array.isArray(prefix) || prefix.length < 1 || prefix.length > 5) return null;
  const chess = new Chess(fen);
  const moves: string[] = [];
  for (const uci of prefix) {
    if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) return null;
    try {
      const played = chess.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        ...(uci.length > 4 ? { promotion: uci[4] } : {}),
      });
      if (!played) return null;
      moves.push(uci);
    } catch { return null; }
  }

  // The prefix was supplied by our authored source. The remainder is only
  // chess.js-legal illustration; prefer development and avoid blind king moves.
  while (moves.length < 5 && !chess.isGameOver()) {
    const candidates = chess.moves({ verbose: true })
      .filter(move => !move.isKingsideCastle() && !move.isQueensideCastle())
      .map(move => ({
        move, uci: move.from + move.to + (move.promotion ?? ""),
        rank: (move.captured ? 12 : 0) +
          (move.piece === "n" || move.piece === "b" ? 3 : 0) +
          (/[de][3456]/.test(move.to) ? 2 : 0) -
          (move.piece === "k" ? 6 : 0),
      }))
      .sort((a, b) => b.rank - a.rank || a.uci.localeCompare(b.uci));
    const selected = candidates[0];
    if (!selected) return null;
    chess.move({
      from: selected.move.from, to: selected.move.to,
      ...(selected.move.promotion ? { promotion: selected.move.promotion } : {}),
    });
    moves.push(selected.uci);
  }
  return moves.length === 5 ? moves : null;
}

/** Original opening ID and node-FEN are the sole position authority. */
export function hydrateOpeningTransition(source: CalculationPosition): CalculationPosition | null {
  const study = source.openingTransitionStudy;
  if (!study) return source;
  const node = openingNodes[study.nodeId];
  const repertoire = repertoireById[study.repertoireId];
  if (!node || !repertoire || !repertoire.nodeIds.includes(node.id) ||
      node.ply < 4 || source.fen !== `@repertoire:${node.id}` ||
      source.assessmentStatus !== "instructional-only" ||
      source.principalVariation.length !== 5 ||
      !source.id.startsWith("calc:p111-")) return null;

  const principal = legalOpeningContinuation(node.fen, source.principalVariation);
  if (!principal || principal.join(" ") !== source.principalVariation.join(" ")) return null;
  const variants = source.defensiveStudy?.variations;
  if (!Array.isArray(variants) || variants.length < 2) return null;
  const lines = variants.map(v => legalOpeningContinuation(node.fen, v.moves));
  if (lines.some(line => !line)) return null;
  const fingerprint = [principal, ...(lines as string[][])].map(line => line.join(" "));
  if (new Set(fingerprint).size < 3) return null;

  return {
    ...source,
    fen: node.fen,
    playerColor: node.sideToMove,
    bestMove: principal[0],
    principalVariation: principal,
    defensiveStudy: {
      ...source.defensiveStudy!,
      variations: variants.map((v, i) => ({ ...v, moves: lines[i]! })),
    },
  };
}
