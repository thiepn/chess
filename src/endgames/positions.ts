import { Chess } from "chess.js";
import type {
  ChessSkill,
  TrainingActivity,
  UserState,
} from "../domain/types";
import type { EndgamePosition } from "./types";

export const endgamePositions: EndgamePosition[] = [

  {
    "id": "endgame:queen-mate-box",
    "skillId": "endgames.queen-mate",
    "title": "Queen mate from a wide box",
    "subtitle": "Restrict first, bring the king, then mate",
    "fen": "7k/8/8/8/8/8/6Q1/6K1 w - - 0 1",
    "playerColor": "w",
    "objectiveType": "convert",
    "objective": "Checkmate without stalemating the lone king.",
    "successOutcomes": [
      "win"
    ],
    "maxPlies": 36,
    "difficulty": 2,
    "techniqueId": "queen-box",
    "recognitionPrompt": "What is the reliable conversion method here?",
    "recognitionOptions": [
      {
        "id": "box",
        "label": "",
        "explanation": ""
      },
      {
        "id": "checks",
        "label": "",
        "explanation": ""
      },
      {
        "id": "queen-close",
        "label": "",
        "explanation": ""
      }
    ],
    "recognitionAnswer": "box",
    "processCues": [
      "",
      "",
      ""
    ],
    "successNote": "",
    "failureNote": ""
  },
  {
    "id": "endgame:rook-mate-box",
    "skillId": "endgames.rook-mate",
    "title": "Rook mate with king support",
    "subtitle": "Cut off, approach, squeeze",
    "fen": "7k/8/8/8/8/8/6R1/6K1 w - - 0 1",
    "playerColor": "w",
    "objectiveType": "convert",
    "objective": "Checkmate with king and rook.",
    "successOutcomes": [
      "win"
    ],
    "maxPlies": 44,
    "difficulty": 3,
    "techniqueId": "rook-box",
    "recognitionPrompt": "What makes rook mate reliable?",
    "recognitionOptions": [
      {
        "id": "cutoff",
        "label": "",
        "explanation": ""
      },
      {
        "id": "checks",
        "label": "",
        "explanation": ""
      },
      {
        "id": "rook-king",
        "label": "",
        "explanation": ""
      }
    ],
    "recognitionAnswer": "cutoff",
    "processCues": [
      "",
      "",
      ""
    ],
    "successNote": "",
    "failureNote": ""
  },
  {
    "id": "endgame:rook-checking-distance-p90",
    "skillId": "endgames.rook-checks",
    "title": "Keep checking distance with a passer",
    "subtitle": "Rook activity and pawn support",
    "fen": "8/2k5/4P3/8/8/8/6R1/6K1 w - - 0 1",
    "playerColor": "w",
    "objectiveType": "convert",
    "objective": "Use active rook checks and careful king support to convert the advanced pawn without hanging the rook.",
    "successOutcomes": [
      "win"
    ],
    "maxPlies": 40,
    "difficulty": 4,
    "techniqueId": "checking-distance",
    "recognitionPrompt": "What is the main danger when using the rook to support the e6 pawn?",
    "recognitionOptions": [
      {
        "id": "distance",
        "label": "",
        "explanation": ""
      },
      {
        "id": "contact",
        "label": "",
        "explanation": ""
      },
      {
        "id": "race",
        "label": "",
        "explanation": ""
      }
    ],
    "recognitionAnswer": "distance",
    "processCues": [
      "",
      "",
      ""
    ],
    "successNote": "",
    "failureNote": ""
  },
  {
    "id": "endgame:rook-second-front-p90",
    "skillId": "endgames.rook-activity",
    "title": "Hold an active rook ending",
    "subtitle": "Avoid a passive pawn-defending trap",
    "fen": "r7/5pk1/6p1/7p/4P3/6PP/5P2/R5K1 w - - 0 1",
    "playerColor": "w",
    "objectiveType": "hold",
    "objective": "Maintain an active rook and a defensible position under local engine resistance for at least 16 plies.",
    "successOutcomes": [
      "win",
      "draw"
    ],
    "maxPlies": 30,
    "survivalPlies": 16,
    "difficulty": 4,
    "techniqueId": "rook-activity",
    "recognitionPrompt": "Black pressures the queenside and has kingside pawns. What plan gives White practical defensive chances?",
    "recognitionOptions": [
      {
        "id": "active",
        "label": "",
        "explanation": ""
      },
      {
        "id": "passive",
        "label": "",
        "explanation": ""
      },
      {
        "id": "advance",
        "label": "",
        "explanation": ""
      }
    ],
    "recognitionAnswer": "active",
    "processCues": [
      "",
      "",
      ""
    ],
    "successNote": "",
    "failureNote": ""
  },
  {
    "id": "endgame:key-square-tempo-p90",
    "skillId": "endgames.key-squares",
    "title": "Pawn key squares with a tempo decision",
    "subtitle": "King route before automatic pawn pushes",
    "fen": "8/4k3/8/8/3PK3/8/8/8 w - - 0 1",
    "playerColor": "w",
    "objectiveType": "hold",
    "objective": "Keep the king coordinated with the d-pawn and avoid immediate tactical collapse for 14 plies.",
    "successOutcomes": [
      "win",
      "draw"
    ],
    "maxPlies": 24,
    "survivalPlies": 14,
    "difficulty": 3,
    "techniqueId": "key-squares",
    "recognitionPrompt": "Before advancing the pawn, what determines whether your king can keep it supported?",
    "recognitionOptions": [
      {
        "id": "entry",
        "label": "",
        "explanation": ""
      },
      {
        "id": "push",
        "label": "",
        "explanation": ""
      },
      {
        "id": "edge",
        "label": "",
        "explanation": ""
      }
    ],
    "recognitionAnswer": "entry",
    "processCues": [
      "",
      "",
      ""
    ],
    "successNote": "",
    "failureNote": ""
  },
  {
    "id": "endgame:opposition-convert",
    "skillId": "endgames.opposition",
    "title": "Opposition into promotion",
    "subtitle": "King and pawn technique",
    "fen": "4k3/8/8/4K3/4P3/8/8/8 w - - 0 1",
    "playerColor": "w",
    "objectiveType": "convert",
    "objective": "Win the king-and-pawn ending.",
    "successOutcomes": [
      "win"
    ],
    "maxPlies": 34,
    "difficulty": 3,
    "techniqueId": "opposition",
    "recognitionPrompt": "What relationship between the kings matters most?",
    "recognitionOptions": [
      {
        "id": "opp",
        "label": "",
        "explanation": ""
      },
      {
        "id": "push",
        "label": "",
        "explanation": ""
      },
      {
        "id": "side",
        "label": "",
        "explanation": ""
      }
    ],
    "recognitionAnswer": "opp",
    "processCues": [
      "",
      "",
      ""
    ],
    "successNote": "",
    "failureNote": ""
  },
  {
    "id": "endgame:key-squares",
    "skillId": "endgames.key-squares",
    "title": "Enter the key squares",
    "subtitle": "King first, pawn second",
    "fen": "8/4k3/8/4K3/8/4P3/8/8 w - - 0 1",
    "playerColor": "w",
    "objectiveType": "convert",
    "objective": "Use the king to secure promotion.",
    "successOutcomes": [
      "win"
    ],
    "maxPlies": 38,
    "difficulty": 3,
    "techniqueId": "key-squares",
    "recognitionPrompt": "What should guide your king route?",
    "recognitionOptions": [
      {
        "id": "keys",
        "label": "",
        "explanation": ""
      },
      {
        "id": "race",
        "label": "",
        "explanation": ""
      },
      {
        "id": "edge",
        "label": "",
        "explanation": ""
      }
    ],
    "recognitionAnswer": "keys",
    "processCues": [
      "",
      "",
      ""
    ],
    "successNote": "",
    "failureNote": ""
  },
  {
    "id": "endgame:pawn-race",
    "skillId": "endgames.pawn-races",
    "title": "Calculate the pawn race",
    "subtitle": "Promotion tempo matters",
    "fen": "8/8/8/P7/7p/8/8/4K2k w - - 0 1",
    "playerColor": "w",
    "objectiveType": "convert",
    "objective": "Calculate the race and win the resulting position.",
    "successOutcomes": [
      "win"
    ],
    "maxPlies": 28,
    "difficulty": 4,
    "techniqueId": "pawn-race",
    "recognitionPrompt": "What must be calculated before committing to the race?",
    "recognitionOptions": [
      {
        "id": "tempo",
        "label": "",
        "explanation": ""
      },
      {
        "id": "distance",
        "label": "",
        "explanation": ""
      },
      {
        "id": "king",
        "label": "",
        "explanation": ""
      }
    ],
    "recognitionAnswer": "tempo",
    "processCues": [
      "",
      "",
      ""
    ],
    "successNote": "",
    "failureNote": ""
  },
  {
    "id": "endgame:passed-pawn",
    "skillId": "pawns.passed",
    "title": "Support the passed pawn",
    "subtitle": "King and passer coordinate",
    "fen": "8/4k3/2K5/2P5/8/8/8/8 w - - 0 1",
    "playerColor": "w",
    "objectiveType": "convert",
    "objective": "Promote or force a winning conversion with the passed pawn.",
    "successOutcomes": [
      "win"
    ],
    "maxPlies": 34,
    "difficulty": 4,
    "techniqueId": "passed-pawn",
    "recognitionPrompt": "What is the central technique?",
    "recognitionOptions": [
      {
        "id": "support",
        "label": "",
        "explanation": ""
      },
      {
        "id": "push",
        "label": "",
        "explanation": ""
      },
      {
        "id": "king-away",
        "label": "",
        "explanation": ""
      }
    ],
    "recognitionAnswer": "support",
    "processCues": [
      "",
      "",
      ""
    ],
    "successNote": "",
    "failureNote": ""
  },
  {
    "id": "endgame:rook-activity",
    "skillId": "endgames.rook-activity",
    "title": "Active rook behind the passer",
    "subtitle": "Activity before passive defense",
    "fen": "r7/5pk1/6p1/7p/4P3/6P1/5P1P/R5K1 w - - 0 1",
    "playerColor": "w",
    "objectiveType": "hold",
    "objective": "Keep the rook active and maintain a sound rook ending for 20 plies or better.",
    "successOutcomes": [
      "win",
      "draw"
    ],
    "maxPlies": 30,
    "survivalPlies": 20,
    "difficulty": 4,
    "techniqueId": "rook-activity",
    "recognitionPrompt": "What practical principle matters most in this ending?",
    "recognitionOptions": [
      {
        "id": "active",
        "label": "",
        "explanation": ""
      },
      {
        "id": "passive",
        "label": "",
        "explanation": ""
      },
      {
        "id": "trade",
        "label": "",
        "explanation": ""
      }
    ],
    "recognitionAnswer": "active",
    "processCues": [
      "",
      "",
      ""
    ],
    "successNote": "",
    "failureNote": ""
  },
  {
    "id": "endgame:lucena",
    "skillId": "endgames.lucena",
    "title": "Lucena bridge",
    "subtitle": "Convert the standard winning rook ending",
    "fen": "2K5/2P3k1/8/8/8/8/r7/3R4 w - - 0 1",
    "playerColor": "w",
    "objectiveType": "convert",
    "objective": "Build the bridge and convert the rook ending.",
    "successOutcomes": [
      "win"
    ],
    "maxPlies": 46,
    "difficulty": 5,
    "techniqueId": "lucena",
    "recognitionPrompt": "Which technique converts this position?",
    "recognitionOptions": [
      {
        "id": "bridge",
        "label": "",
        "explanation": ""
      },
      {
        "id": "sixth",
        "label": "",
        "explanation": ""
      },
      {
        "id": "trade",
        "label": "",
        "explanation": ""
      }
    ],
    "recognitionAnswer": "bridge",
    "processCues": [
      "",
      "",
      ""
    ],
    "successNote": "",
    "failureNote": ""
  },
  {
    "id": "endgame:philidor",
    "skillId": "endgames.philidor",
    "title": "Philidor defense",
    "subtitle": "Hold the theoretical rook ending",
    "fen": "8/6k1/r7/4K3/4P3/8/8/R7 b - - 0 1",
    "playerColor": "b",
    "objectiveType": "hold",
    "objective": "Hold the position for 28 plies or reach a draw.",
    "successOutcomes": [
      "win",
      "draw"
    ],
    "maxPlies": 40,
    "survivalPlies": 28,
    "difficulty": 5,
    "techniqueId": "philidor",
    "recognitionPrompt": "What is the defensive setup?",
    "recognitionOptions": [
      {
        "id": "sixth",
        "label": "",
        "explanation": ""
      },
      {
        "id": "bridge",
        "label": "",
        "explanation": ""
      },
      {
        "id": "checks",
        "label": "",
        "explanation": ""
      }
    ],
    "recognitionAnswer": "sixth",
    "processCues": [
      "",
      "",
      ""
    ],
    "successNote": "",
    "failureNote": ""
  },
  {
    "id": "endgame:simplify-extra-rook",
    "skillId": "conversion.simplify",
    "title": "Convert the extra rook",
    "subtitle": "Technique, not tactics",
    "fen": "6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1",
    "playerColor": "w",
    "objectiveType": "convert",
    "objective": "Win while reducing counterplay.",
    "successOutcomes": [
      "win"
    ],
    "maxPlies": 46,
    "difficulty": 4,
    "techniqueId": "simplify",
    "recognitionPrompt": "How should a large material advantage change your priorities?",
    "recognitionOptions": [
      {
        "id": "reduce",
        "label": "",
        "explanation": ""
      },
      {
        "id": "attack",
        "label": "",
        "explanation": ""
      },
      {
        "id": "pawns",
        "label": "",
        "explanation": ""
      }
    ],
    "recognitionAnswer": "reduce",
    "processCues": [
      "",
      "",
      ""
    ],
    "successNote": "",
    "failureNote": ""
  },
  {
    "id": "endgame:rook-defense",
    "skillId": "endgames.philidor",
    "title": "Hold the worse rook ending",
    "subtitle": "Active defense under pressure",
    "fen": "8/5pk1/6pp/8/5Pr1/6P1/5K2/7R w - - 0 1",
    "playerColor": "w",
    "objectiveType": "hold",
    "objective": "Hold for 24 plies or secure a draw.",
    "successOutcomes": [
      "win",
      "draw"
    ],
    "maxPlies": 36,
    "survivalPlies": 24,
    "difficulty": 5,
    "techniqueId": "active-defense",
    "recognitionPrompt": "What gives the defender practical drawing chances?",
    "recognitionOptions": [
      {
        "id": "counterplay",
        "label": "",
        "explanation": ""
      },
      {
        "id": "passive",
        "label": "",
        "explanation": ""
      },
      {
        "id": "sacrifice",
        "label": "",
        "explanation": ""
      }
    ],
    "recognitionAnswer": "counterplay",
    "processCues": [
      "",
      "",
      ""
    ],
    "successNote": "",
    "failureNote": ""
  },
  {
    "id": "endgame:advanced-rook-checks",
    "skillId": "endgames.rook-checks",
    "title": "Checking distance in a worse rook ending",
    "subtitle": "Active defense from the side",
    "fen": "8/5pk1/4p3/4P3/8/8/1r4R1/6K1 w - - 0 1",
    "playerColor": "w",
    "objectiveType": "hold",
    "objective": "Hold the rook ending by using active checks and king cutoffs.",
    "successOutcomes": [
      "win",
      "draw"
    ],
    "maxPlies": 42,
    "survivalPlies": 28,
    "difficulty": 5,
    "techniqueId": "checking-distance",
    "recognitionPrompt": "What gives the defender the best practical chances?",
    "recognitionOptions": [
      {
        "id": "distance",
        "label": "",
        "explanation": ""
      },
      {
        "id": "passive",
        "label": "",
        "explanation": ""
      },
      {
        "id": "trade",
        "label": "",
        "explanation": ""
      }
    ],
    "recognitionAnswer": "distance",
    "processCues": [
      "",
      "",
      ""
    ],
    "successNote": "",
    "failureNote": ""
  },
  {
    "id": "endgame:opposite-bishops-blockade",
    "skillId": "endgames.opposite-bishops",
    "title": "Opposite-colored bishop blockade",
    "subtitle": "Material is not the whole evaluation",
    "fen": "4k3/8/8/4p3/3P4/2B5/8/4Kb2 w - - 0 1",
    "playerColor": "w",
    "objectiveType": "hold",
    "objective": "Hold the ending by building a blockade on the color your bishop controls.",
    "successOutcomes": [
      "win",
      "draw"
    ],
    "maxPlies": 40,
    "survivalPlies": 26,
    "difficulty": 5,
    "techniqueId": "opposite-bishop-blockade",
    "recognitionPrompt": "Why can opposite-colored bishops make a material edge hard to convert?",
    "recognitionOptions": [
      {
        "id": "blockade",
        "label": "",
        "explanation": ""
      },
      {
        "id": "trade",
        "label": "",
        "explanation": ""
      },
      {
        "id": "king",
        "label": "",
        "explanation": ""
      }
    ],
    "recognitionAnswer": "blockade",
    "processCues": [
      "",
      "",
      ""
    ],
    "successNote": "",
    "failureNote": ""
  },
  {
    "id": "endgame:minor-piece-activity",
    "skillId": "endgames.minor-piece",
    "title": "King and minor-piece activity",
    "subtitle": "Create targets before collecting them",
    "fen": "4k3/8/8/3p4/3P4/3N4/4P3/4Kb2 w - - 0 1",
    "playerColor": "w",
    "objectiveType": "convert",
    "objective": "Convert the extra pawn by coordinating king and knight against the bishop.",
    "successOutcomes": [
      "win"
    ],
    "maxPlies": 50,
    "difficulty": 5,
    "techniqueId": "minor-piece-activity",
    "recognitionPrompt": "What matters most before trying to win pawns?",
    "recognitionOptions": [
      {
        "id": "activity",
        "label": "",
        "explanation": ""
      },
      {
        "id": "grab",
        "label": "",
        "explanation": ""
      },
      {
        "id": "edge",
        "label": "",
        "explanation": ""
      }
    ],
    "recognitionAnswer": "activity",
    "processCues": [
      "",
      "",
      ""
    ],
    "successNote": "",
    "failureNote": ""
  },
  {
    "id": "endgame:two-weaknesses",
    "skillId": "conversion.two-weaknesses",
    "title": "Convert by switching wings",
    "subtitle": "Fix one weakness, create another",
    "fen": "4k2r/p6p/8/8/8/8/PP5P/R3K3 w - - 0 1",
    "playerColor": "w",
    "objectiveType": "convert",
    "objective": "Use the extra queenside pawn and active rook to create a second weakness and convert.",
    "successOutcomes": [
      "win"
    ],
    "maxPlies": 54,
    "difficulty": 5,
    "techniqueId": "two-weaknesses",
    "recognitionPrompt": "What should you do when the defender can hold one target indefinitely?",
    "recognitionOptions": [
      {
        "id": "second",
        "label": "",
        "explanation": ""
      },
      {
        "id": "force",
        "label": "",
        "explanation": ""
      },
      {
        "id": "trade",
        "label": "",
        "explanation": ""
      }
    ],
    "recognitionAnswer": "second",
    "processCues": [
      "",
      "",
      ""
    ],
    "successNote": "",
    "failureNote": ""
  }


];

function dueScore(
  state: UserState,
  position: EndgamePosition,
  now: Date,
) {
  const history =
    state.endgameHistory?.[position.id];
  // New technique: begin with the more approachable authentic position before
  // progressing to the hardest local engine resistance.
  if (!history) return 3 + (6 - position.difficulty) * .05;
  const due =
    new Date(history.nextReviewAt).getTime() <= now.getTime();
  const successRate =
    history.attempts > 0
      ? history.successes / history.attempts
      : 0;
  return (
    (due ? 2 : 0) +
    (1 - successRate) +
    (1 - history.lastQuality) +
    position.difficulty * .03
  );
}

export function endgamePositionFor(
  state: UserState,
  skillId: string,
  now = new Date(),
) {
  const matches = endgamePositions
    .filter((position) => position.skillId === skillId)
    .sort(
      (a, b) =>
        dueScore(state, b, now) -
        dueScore(state, a, now),
    );
  return matches[0];
}

export function resolveEndgamePosition(
  state: UserState,
  activity: TrainingActivity,
  skill: ChessSkill,
  now = new Date(),
) {
  const exact = activity.endgamePositionId
    ? endgamePositions.find(
        (position) =>
          position.id === activity.endgamePositionId,
      )
    : undefined;

  return (
    exact ??
    endgamePositionFor(
      state,
      skill.id,
      now,
    )
  );
}

export function endgameCatalogIssues() {
  const issues: string[] = [];
  for (const position of endgamePositions) {
    try {
      const chess = new Chess(position.fen);
      if (chess.isGameOver()) {
        issues.push(`${position.id}: starting position is already over`);
      }
      if (chess.turn() !== position.playerColor) {
        issues.push(`${position.id}: player color is not side to move`);
      }
    } catch {
      issues.push(`${position.id}: invalid FEN`);
    }

    if (
      !position.recognitionOptions.some(
        (option) =>
          option.id === position.recognitionAnswer,
      )
    ) {
      issues.push(`${position.id}: recognition answer missing`);
    }

    if (position.recognitionOptions.length < 3) {
      issues.push(`${position.id}: fewer than three recognition choices`);
    }

    if (
      position.objectiveType === "hold" &&
      !position.survivalPlies
    ) {
      issues.push(`${position.id}: hold position has no survival threshold`);
    }
  }
  return issues;
}
