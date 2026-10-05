import type { PuzzleRecord } from "./types";

export const seedPuzzles: PuzzleRecord[] = [
  {
    id: "seed-knight-fork-1",
    initialFen: "3q3k/8/3N4/8/8/8/8/4K3 w - - 0 1",
    solutionMoves: ["d6f7"],
    rating: 720,
    popularity: 100,
    plays: 1,
    themes: ["fork", "oneMove"],
    skillIds: ["tactics.double-attack", "tactics.knight-fork"],
    source: "seed"
  },
  {
    id: "seed-knight-fork-2",
    initialFen: "k1q5/8/8/3N4/8/8/8/4K3 w - - 0 1",
    solutionMoves: ["d5b6"],
    rating: 820,
    popularity: 100,
    plays: 1,
    themes: ["fork", "oneMove"],
    skillIds: ["tactics.double-attack", "tactics.knight-fork"],
    source: "seed"
  },
  {
    id: "seed-pin-1",
    initialFen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
    solutionMoves: ["f1b5"],
    rating: 780,
    popularity: 100,
    plays: 1,
    themes: ["pin", "oneMove"],
    skillIds: ["tactics.pin"],
    source: "seed"
  },
  {
    id: "seed-hanging-1",
    initialFen: "4k3/8/8/8/3n4/8/4Q3/4K3 w - - 0 1",
    solutionMoves: ["e2e4"],
    rating: 650,
    popularity: 100,
    plays: 1,
    themes: ["hangingPiece", "defensiveMove", "oneMove"],
    skillIds: ["fundamentals.hanging", "defense.threats"],
    source: "seed"
  },
  {
    id: "seed-mate-1",
    initialFen: "6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1",
    solutionMoves: ["e1e8"],
    rating: 700,
    popularity: 100,
    plays: 1,
    themes: ["mate", "mateIn1", "oneMove"],
    skillIds: ["rules.mate"],
    source: "seed"
  },
  {
    id: "seed-skewer-1",
    initialFen: "q5k1/8/8/8/8/2B5/8/4K2R w - - 0 1",
    solutionMoves: ["h1h8"],
    rating: 920,
    popularity: 100,
    plays: 1,
    themes: ["skewer", "oneMove"],
    skillIds: ["tactics.skewer"],
    source: "seed"
  }
];
