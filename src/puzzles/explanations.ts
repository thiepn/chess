import { Chess } from "chess.js";
import type { PuzzleRecord } from "./types";

const structuralThemes = new Set([
  "opening",
  "middlegame",
  "endgame",
  "short",
  "long",
  "veryLong",
  "oneMove",
  "master",
  "masterVsMaster",
  "superGM",
  "advantage",
  "crushing",
]);

const themePoints: Record<string, string> = {
  fork: "One move creates two concrete threats at once, so the opponent cannot answer both.",
  pin: "The pinned piece cannot move freely because doing so exposes a more valuable target behind it.",
  skewer: "The more valuable front piece is forced away, revealing the target behind it.",
  hangingPiece: "The tactic works because a piece is loose or insufficiently protected after the position changes.",
  defensiveMove: "The key move solves the opponent's immediate threat before trying to create your own.",
  mate: "The line works by restricting the king's legal replies until checkmate is unavoidable.",
  mateIn1: "The position is decided immediately by a legal mating move.",
  mateIn2: "The first move forces a reply that leaves a final mating move.",
  discoveredAttack: "Moving one piece uncovers a line for another attacker, creating a threat the opponent cannot comfortably meet.",
  discoveredCheck: "Moving the front piece reveals a check from the piece behind it, gaining forcing tempo.",
  doubleCheck: "Two pieces check at once, which normally leaves king movement as the only legal response.",
  attraction: "The move draws a piece onto a square where the follow-up tactic becomes possible.",
  deflection: "A defender is pulled away from one of its duties; the same idea is often described as overloading the defender.",
  clearance: "The first move clears a square or line so another piece can use it immediately.",
  capturingDefender: "Removing a critical defender leaves the real target without enough protection.",
  interference: "The move breaks the connection between a defender and the piece or square it must protect.",
  intermezzo: "A forcing in-between move changes the move order before the expected recapture or continuation.",
  backRankMate: "The king is boxed in by its own pieces, so control of the back rank becomes decisive.",
  sacrifice: "Material is given up because the resulting forcing line is worth more than the sacrificed piece.",
  quietMove: "The strongest move is not a check or capture; it improves the position while preserving a concrete threat.",
  advancedPawn: "A far-advanced pawn changes the tactical priorities because promotion is close.",
  promotion: "The line is driven by the promotion threat and the exact timing needed to make it work.",
  underPromotion: "Promoting to a piece other than a queen avoids a tactical drawback or creates a more precise threat.",
  kingsideAttack: "The decisive idea works because attacking pieces reach the king faster than the defense can reorganize.",
  queensideAttack: "Open lines and overloaded defenders on the queenside make the tactic possible.",
  exposedKing: "The king lacks shelter, so checks and forcing moves gain extra value.",
  xRayAttack: "A line piece attacks through another piece; once the front obstruction moves, the hidden pressure becomes real.",
  trappedPiece: "The target has too few safe squares, so restricting it is as important as attacking it.",
  zugzwang: "Every available move worsens the defender's position, so move order and spare tempi decide the position.",
  equality: "The best move does not necessarily win; it is the precise resource that restores a drawable or balanced position.",
  pawnEndgame: "King activity, pawn races and exact tempi decide this ending.",
  rookEndgame: "Rook activity and checking distance matter more than passive material counting.",
};

export function humanPuzzleTheme(theme: string) {
  return theme
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (letter) =>
      letter.toUpperCase(),
    );
}

export function primaryPuzzleTheme(
  puzzle: PuzzleRecord,
) {
  return (
    puzzle.themes.find(
      (theme) =>
        !structuralThemes.has(theme) &&
        themePoints[theme],
    ) ??
    puzzle.themes.find(
      (theme) =>
        !structuralThemes.has(theme),
    ) ??
    "tactic"
  );
}

export function puzzleExplanation(
  puzzle: PuzzleRecord,
) {
  const theme = primaryPuzzleTheme(puzzle);
  const motif = humanPuzzleTheme(theme);
  const point =
    themePoints[theme] ??
    "The line works because the first move creates a concrete improvement that survives the opponent's best reply.";

  const alternatives = puzzle.source === "lichess"
    ? puzzle.themes.includes("mateIn1")
      ? "Mate-in-one positions can contain more than one winning mating move. The stored line is one verified solution."
      : "The saved Lichess line is this puzzle’s graded reference. Other legal moves are not assessed here; compare alternatives with Stockfish after the solve."
    : "The stored line is the reference solution for this practice position.";

  return {
    theme,
    motif,
    point,
    alternatives,
  };
}

export function puzzleSolutionSan(
  puzzle: PuzzleRecord,
) {
  const chess = new Chess(puzzle.initialFen);
  const result: string[] = [];

  for (const encoded of puzzle.solutionMoves) {
    try {
      const move = chess.move({
        from: encoded.slice(0, 2),
        to: encoded.slice(2, 4),
        promotion:
          encoded.slice(4, 5) || "q",
      });
      if (!move) break;
      result.push(move.san);
    } catch {
      break;
    }
  }

  return result;
}
