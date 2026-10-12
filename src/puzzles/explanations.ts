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

/** Motif advice is a content asset; load on demand, not in the global JS bundle. */
let coaching: Promise<Record<string,string>> | undefined;
export function loadPuzzleCoaching() {
  return coaching ??= fetch(`${import.meta.env.BASE_URL}data/puzzles/motif-coaching-v1.json`)
    .then(r => {if(!r.ok)throw Error("Missing puzzle coaching");return r.json();})
    .then((data: {schema:string;advice:Record<string,string>})=>{
      if(data?.schema!=="chess.p89.motif-coaching.v1" || !data.advice?.fork)
        throw Error("Invalid coaching catalog");
      return data.advice;
    })
    .catch(error=>{coaching=undefined;throw error;});
}


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
        !structuralThemes.has(theme),
    ) ??
    "tactic"
  );
}

export function puzzleExplanation(
  puzzle: PuzzleRecord,
  advice?: Record<string,string>,
) {
  const theme = primaryPuzzleTheme(puzzle);
  const motif = humanPuzzleTheme(theme);
  const point = advice?.[theme] ??
    "Study the recorded continuation, then check whether the idea survives the strongest legal response.";

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
