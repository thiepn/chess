import { Chess } from "chess.js";
import { openingNodes } from "../openings/repertoire";
import type { TrainingScenario } from "./types";

export const trainingScenarios: TrainingScenario[] = [
  {
    id: "opening-italian",
    mode: "opening",
    title: "Italian middlegame entry",
    subtitle: "Start after 1.e4 e5 2.Nf3 Nc6",
    description: "Play your repertoire move, castle, and reach a healthy middlegame against resistance.",
    fen: openingNodes["italian-nc6"].fen,
    playerColor: "w",
    skillId: "openings.principles",
    objective: "Reach a playable middlegame without abandoning your opening principles.",
    successResults: ["win", "draw"],
    sourceLabel: "Your White repertoire",
  },
  {
    id: "opening-caro",
    mode: "opening",
    title: "Caro-Kann from move two",
    subtitle: "Play Black after 1.e4",
    description: "Rehearse ...c6 and the central ...d5 break inside a real game instead of a recall card.",
    fen: openingNodes["black-caro-e4"].fen,
    playerColor: "b",
    skillId: "openings.principles",
    objective: "Execute the Caro-Kann setup and reach a stable middlegame.",
    successResults: ["win", "draw"],
    sourceLabel: "Your Black repertoire",
  },
  {
    id: "conversion-extra-rook",
    mode: "conversion",
    title: "Convert the extra rook",
    subtitle: "Winning position, no shortcuts",
    description: "You are materially ahead. Simplify counterplay, keep the king safe, and finish the game cleanly.",
    fen: "6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1",
    playerColor: "w",
    skillId: "conversion.simplify",
    objective: "Win without giving the opponent unnecessary counterplay.",
    successResults: ["win"],
    sourceLabel: "Conversion training",
  },
  {
    id: "defense-hold-rook",
    mode: "defense",
    title: "Hold the worse rook ending",
    subtitle: "Defend under pressure",
    description: "You are a pawn down. Activate the rook and king, reduce threats, and fight for the draw.",
    fen: "8/5pk1/6pp/8/5Pr1/6P1/5K2/7R w - - 0 1",
    playerColor: "w",
    skillId: "defense.threats",
    objective: "Survive the position. A draw counts as success.",
    successResults: ["win", "draw"],
    sourceLabel: "Defense training",
  },
  {
    id: "endgame-opposition",
    mode: "endgame",
    title: "Opposition into promotion",
    subtitle: "King and pawn technique",
    description: "Use opposition and king entry squares to shepherd the pawn home against active resistance.",
    fen: "4k3/8/8/4K3/4P3/8/8/8 w - - 0 1",
    playerColor: "w",
    skillId: "endgames.opposition",
    objective: "Convert the king-and-pawn ending.",
    successResults: ["win"],
    sourceLabel: "Endgame training",
  },
];

export const scenarioById = Object.fromEntries(
  trainingScenarios.map((scenario) => [scenario.id, scenario]),
);

export function validateTrainingScenarios() {
  return trainingScenarios.every((scenario) => {
    const chess = new Chess(scenario.fen);
    return !chess.isGameOver();
  });
}
