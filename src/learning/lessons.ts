import { DEFAULT_POSITION } from "chess.js";
import type { TrainingMode } from "../domain/types";
import type { LessonScript } from "./types";

const scripts: Record<string, LessonScript> = {
  "rules.board": {
    id: "board-basics",
    skillId: "rules.board",
    title: "Read the board",
    summary: "Orient yourself before calculating anything.",
    steps: [
      {
        id: "coordinates",
        type: "explain",
        eyebrow: "BOARD LANGUAGE",
        title: "Every square has a name.",
        body: "Files run a–h from White's left to right. Ranks run 1–8 from White's side upward. The highlighted central squares are the board's most contested territory.",
        fen: DEFAULT_POSITION,
        highlights: [
          { square: "d4", tone: "focus" },
          { square: "e4", tone: "focus" },
          { square: "d5", tone: "focus" },
          { square: "e5", tone: "focus" },
        ],
      },
      {
        id: "first-move",
        type: "move",
        eyebrow: "YOUR TURN",
        title: "Use a coordinate.",
        prompt: "Move the pawn from e2 to e4.",
        fen: DEFAULT_POSITION,
        acceptedMoves: ["e2e4"],
        successTitle: "e4.",
        successBody: "You translated a square name into a move and occupied the center.",
        hint: "Find the e-file, then move the pawn on rank 2 two squares forward.",
        hintHighlights: [
          { square: "e2", tone: "hint" },
          { square: "e4", tone: "good" },
        ],
        hintArrows: [{ from: "e2", to: "e4", tone: "hint" }],
      },
    ],
  },

  "rules.pieces": {
    id: "piece-movement",
    skillId: "rules.pieces",
    title: "Move with purpose",
    summary: "Learn legal movement through direct board interaction.",
    steps: [
      {
        id: "knight-shape",
        type: "explain",
        eyebrow: "KNIGHT",
        title: "Knights jump in an L.",
        body: "A knight moves two squares in one direction and one perpendicular to it. It is the only piece that can jump over occupied squares.",
        fen: DEFAULT_POSITION,
        highlights: [{ square: "g1", tone: "focus" }],
      },
      {
        id: "develop-knight",
        type: "move",
        eyebrow: "GUIDED MOVE",
        title: "Develop the knight.",
        prompt: "Move the g1 knight to f3.",
        fen: DEFAULT_POSITION,
        acceptedMoves: ["g1f3"],
        successTitle: "Developed.",
        successBody: "The knight moved toward the center and now influences e5 and d4.",
        hint: "Select the knight on g1. One of its legal central destinations is f3.",
        hintHighlights: [
          { square: "g1", tone: "hint" },
          { square: "f3", tone: "good" },
        ],
        hintArrows: [{ from: "g1", to: "f3", tone: "hint" }],
      },
    ],
  },

  "rules.check": {
    id: "check-basics",
    skillId: "rules.check",
    title: "See the king threat",
    summary: "Recognize when a king is directly attacked.",
    steps: [
      {
        id: "rook-line",
        type: "explain",
        eyebrow: "CHECK",
        title: "A checking line reaches the king.",
        body: "The rook attacks along ranks and files. When nothing blocks that line to the king, the king is in check and must respond immediately.",
        fen: "4k3/8/8/8/8/8/8/4R1K1 b - - 0 1",
        arrows: [{ from: "e1", to: "e8", tone: "danger" }],
        highlights: [
          { square: "e1", tone: "focus" },
          { square: "e8", tone: "danger" },
        ],
      },
    ],
  },

  "rules.mate": {
    id: "mate-one",
    skillId: "rules.mate",
    title: "Finish the game",
    summary: "Checkmate means check with no legal escape.",
    steps: [
      {
        id: "back-rank-shape",
        type: "explain",
        eyebrow: "MATE PATTERN",
        title: "The king has nowhere to run.",
        body: "Black's own pawns seal the seventh rank. A rook reaching the eighth rank can cover every escape square at once.",
        fen: "6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1",
        highlights: [
          { square: "f7", tone: "danger" },
          { square: "g7", tone: "danger" },
          { square: "h7", tone: "danger" },
        ],
      },
      {
        id: "deliver-mate",
        type: "move",
        eyebrow: "MATE IN ONE",
        title: "Finish it.",
        prompt: "White to move. Deliver checkmate.",
        fen: "6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1",
        acceptedMoves: ["e1e8"],
        successTitle: "Checkmate.",
        successBody: "The rook controls the entire eighth rank while Black's own pawns remove every flight square.",
        hint: "The rook needs to reach the back rank with check.",
        hintArrows: [{ from: "e1", to: "e8", tone: "hint" }],
      },
    ],
  },

  "fundamentals.hanging": {
    id: "piece-safety",
    skillId: "fundamentals.hanging",
    title: "Stop hanging pieces",
    summary: "See attacks before material disappears.",
    steps: [
      {
        id: "see-the-attack",
        type: "explain",
        eyebrow: "PIECE SAFETY",
        title: "Loose pieces demand attention.",
        body: "The black knight on d4 attacks the queen on e2. Before looking for your own attack, notice what your opponent is already threatening.",
        fen: "4k3/8/8/8/3n4/8/4Q3/4K3 w - - 0 1",
        highlights: [
          { square: "d4", tone: "danger" },
          { square: "e2", tone: "danger" },
        ],
        arrows: [{ from: "d4", to: "e2", tone: "danger" }],
      },
      {
        id: "save-the-queen",
        type: "move",
        eyebrow: "YOUR TURN",
        title: "Respond to the threat.",
        prompt: "Move the attacked queen to e4.",
        fen: "4k3/8/8/8/3n4/8/4Q3/4K3 w - - 0 1",
        acceptedMoves: ["e2e4"],
        successTitle: "Threat handled.",
        successBody: "You dealt with the opponent's threat before starting your own plan. That habit prevents a large share of beginner losses.",
        hint: "The queen on e2 is attacked. Move it two squares forward to e4.",
        hintHighlights: [
          { square: "e2", tone: "danger" },
          { square: "e4", tone: "good" },
        ],
        hintArrows: [{ from: "e2", to: "e4", tone: "hint" }],
      },
    ],
  },

  "openings.principles": {
    id: "opening-principles",
    skillId: "openings.principles",
    title: "Start with useful moves",
    summary: "Control the center and make development easy.",
    steps: [
      {
        id: "center",
        type: "explain",
        eyebrow: "OPENING PRINCIPLE",
        title: "Fight for the center.",
        body: "Central control gives your pieces more useful squares. You do not need opening memorization yet—start by making moves that improve your position.",
        fen: DEFAULT_POSITION,
        highlights: [
          { square: "d4", tone: "focus" },
          { square: "e4", tone: "focus" },
          { square: "d5", tone: "focus" },
          { square: "e5", tone: "focus" },
        ],
      },
      {
        id: "play-e4",
        type: "move",
        eyebrow: "GUIDED MOVE",
        title: "Claim space.",
        prompt: "Play 1.e4.",
        fen: DEFAULT_POSITION,
        acceptedMoves: ["e2e4"],
        successTitle: "A principled start.",
        successBody: "e4 claims central space and opens lines for the queen and f1 bishop.",
        hint: "Move the e-pawn two squares.",
        hintArrows: [{ from: "e2", to: "e4", tone: "hint" }],
      },
    ],
  },

  "tactics.knight-fork": {
    id: "knight-fork",
    skillId: "tactics.knight-fork",
    title: "Knight forks",
    summary: "One knight move can attack two valuable targets.",
    steps: [
      {
        id: "fork-geometry",
        type: "explain",
        eyebrow: "TACTICAL PATTERN",
        title: "Look for two targets.",
        body: "The knight on d6 can jump to a square that attacks both Black's king and queen. When one move creates two threats, the opponent usually cannot answer both.",
        fen: "3q3k/8/3N4/8/8/8/8/4K3 w - - 0 1",
        highlights: [
          { square: "h8", tone: "danger" },
          { square: "d8", tone: "danger" },
          { square: "d6", tone: "focus" },
        ],
      },
      {
        id: "find-fork",
        type: "move",
        eyebrow: "FIND THE FORK",
        title: "Attack both targets.",
        prompt: "White to move. Find the knight fork.",
        fen: "3q3k/8/3N4/8/8/8/8/4K3 w - - 0 1",
        acceptedMoves: ["d6f7"],
        successTitle: "Fork.",
        successBody: "Nf7+ checks the king on h8 and attacks the queen on d8. Black must answer the check, so the queen is lost next.",
        hint: "Find a knight square that attacks both h8 and d8.",
        hintHighlights: [{ square: "f7", tone: "hint" }],
        hintArrows: [{ from: "d6", to: "f7", tone: "hint" }],
      },
    ],
  },

  "tactics.pin": {
    id: "pin",
    skillId: "tactics.pin",
    title: "Pins",
    summary: "Restrict a piece by putting something more valuable behind it.",
    steps: [
      {
        id: "pin-line",
        type: "explain",
        eyebrow: "TACTICAL PATTERN",
        title: "The king changes what a piece can do.",
        body: "After the bishop reaches b5, the knight on c6 stands between the bishop and the king on e8. Moving the knight would expose the king.",
        fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
        arrows: [{ from: "b5", to: "e8", tone: "danger" }],
        highlights: [{ square: "c6", tone: "danger" }],
      },
      {
        id: "create-pin",
        type: "move",
        eyebrow: "YOUR TURN",
        title: "Create the pin.",
        prompt: "Move the bishop from f1 to b5.",
        fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
        acceptedMoves: ["f1b5"],
        successTitle: "Pinned.",
        successBody: "Bb5 pins the c6 knight to the king. The important idea is the line behind the knight, not merely the bishop move.",
        hint: "Place the bishop on the diagonal that points through c6 toward e8.",
        hintArrows: [{ from: "f1", to: "b5", tone: "hint" }],
      },
    ],
  },

  "endgames.opposition": {
    id: "opposition",
    skillId: "endgames.opposition",
    title: "Take the opposition",
    summary: "Use king geometry to control entry squares.",
    steps: [
      {
        id: "opposition-shape",
        type: "explain",
        eyebrow: "KING ENDGAME",
        title: "Face the king with one square between.",
        body: "Opposition is a fight over who must give way. Placing the kings on the same file with exactly one square between them can force the opponent to yield ground.",
        fen: "4k3/8/8/4K3/4P3/8/8/8 w - - 0 1",
        highlights: [
          { square: "e5", tone: "focus" },
          { square: "e8", tone: "danger" },
          { square: "e6", tone: "good" },
        ],
      },
      {
        id: "take-opposition",
        type: "move",
        eyebrow: "YOUR TURN",
        title: "Take the opposition.",
        prompt: "Move the king to e6.",
        fen: "4k3/8/8/4K3/4P3/8/8/8 w - - 0 1",
        acceptedMoves: ["e5e6"],
        successTitle: "Opposition taken.",
        successBody: "With the kings facing each other and e7 between them, Black must be the side to give ground.",
        hint: "Move directly toward the enemy king while keeping one square between the kings.",
        hintArrows: [{ from: "e5", to: "e6", tone: "hint" }],
      },
    ],
  },
};

function genericScript(skillId: string, title: string, description: string): LessonScript {
  return {
    id: `generic-${skillId}`,
    skillId,
    title,
    summary: description,
    steps: [
      {
        id: "concept",
        type: "explain",
        eyebrow: "CONCEPT",
        title,
        body: description,
        fen: DEFAULT_POSITION,
      },
      {
        id: "develop",
        type: "move",
        eyebrow: "BOARD PRACTICE",
        title: "Make a useful developing move.",
        prompt: "Move the g1 knight to f3.",
        fen: DEFAULT_POSITION,
        acceptedMoves: ["g1f3"],
        successTitle: "Good.",
        successBody: "The board interaction is working. Later content phases will replace this fallback with skill-specific positions.",
        hint: "The knight on g1 can develop to f3.",
        hintArrows: [{ from: "g1", to: "f3", tone: "hint" }],
      },
    ],
  };
}

export function lessonForSkill(
  skillId: string,
  title: string,
  description: string,
  _mode?: TrainingMode,
): LessonScript {
  return scripts[skillId] ?? genericScript(skillId, title, description);
}

export const lessonScripts = scripts;
