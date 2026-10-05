import { Chess } from "chess.js";
import { openingNodes } from "../openings/repertoire";
import { scenarioById } from "../play/scenarios";
import type { ReferenceStudy } from "./types";

const operaGame = `[Event "Paris Opera Game"]
[Site "Paris, France"]
[Date "1858.??.??"]
[White "Paul Morphy"]
[Black "Duke Karl / Count Isouard"]
[Result "1-0"]

1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5
6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5
11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6
15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0`;

export const referenceStudies: ReferenceStudy[] = [
  {
    id: "reference-opera-game",
    title: "Morphy — Opera Game",
    kind: "game",
    description:
      "A compact master game for development, initiative, open lines and converting a lead in activity into a forcing attack.",
    pgn: operaGame,
    tags: ["master-game", "development", "initiative", "attack"],
    orientation: "w",
  },
  {
    id: "reference-italian-checkpoint",
    title: "Italian development checkpoint",
    kind: "opening",
    description:
      "A repertoire position after 1.e4 e5 2.Nf3 Nc6. Study why Bc4, castling and a later d4 fit together.",
    fen: openingNodes["italian-nc6"].fen,
    tags: ["opening", "italian", "development"],
    orientation: "w",
  },
  {
    id: "reference-opposition",
    title: "Opposition reference",
    kind: "endgame",
    description:
      "A clean king-and-pawn position for testing opposition, entry squares and promotion technique.",
    fen: scenarioById["endgame-opposition"].fen,
    tags: ["endgame", "opposition", "pawn"],
    orientation: "w",
  },
  {
    id: "reference-defense",
    title: "Active defense in a rook ending",
    kind: "endgame",
    description:
      "A worse rook ending where activity matters more than passive pawn protection.",
    fen: scenarioById["defense-hold-rook"].fen,
    tags: ["endgame", "defense", "rook"],
    orientation: "w",
  },
  {
    id: "reference-conversion",
    title: "Simplify a winning position",
    kind: "reference",
    description:
      "A material advantage that should be converted by reducing counterplay rather than hunting for brilliance.",
    fen: scenarioById["conversion-extra-rook"].fen,
    tags: ["conversion", "simplification", "technique"],
    orientation: "w",
  },
];

export function validateReferenceStudies() {
  return referenceStudies.every((study) => {
    if (study.fen) {
      try {
        new Chess(study.fen);
      } catch {
        return false;
      }
    }

    if (study.pgn) {
      try {
        const chess = new Chess();
        chess.loadPgn(study.pgn, { strict: false });
        if (!chess.history().length) return false;
      } catch {
        return false;
      }
    }

    return Boolean(study.fen || study.pgn);
  });
}
