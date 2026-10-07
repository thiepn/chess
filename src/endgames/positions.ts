import { Chess } from "chess.js";
import type {
  ChessSkill,
  TrainingActivity,
  UserState,
} from "../domain/types";
import type { EndgamePosition } from "./types";

export const endgamePositions: EndgamePosition[] = [
  {
    id: "endgame:queen-mate-box",
    skillId: "endgames.queen-mate",
    title: "Queen mate from a wide box",
    subtitle: "Restrict first, bring the king, then mate",
    fen: "7k/8/8/8/8/8/6Q1/6K1 w - - 0 1",
    playerColor: "w",
    objectiveType: "convert",
    objective: "Checkmate without stalemating the lone king.",
    successOutcomes: ["win"],
    maxPlies: 36,
    difficulty: 2,
    techniqueId: "queen-box",
    recognitionPrompt: "What is the reliable conversion method here?",
    recognitionOptions: [
      {
        id: "box",
        label: "Shrink the king's box, activate your king, then mate.",
        explanation: "Correct. The queen restricts; the king completes the mating net.",
      },
      {
        id: "checks",
        label: "Give checks on every move until mate appears.",
        explanation: "Checks alone often waste tempi and can make stalemate control harder.",
      },
      {
        id: "queen-close",
        label: "Put the queen next to the king immediately.",
        explanation: "Without king support, close queen placement can allow attacks or stalemate mistakes.",
      },
    ],
    recognitionAnswer: "box",
    processCues: [
      "Use the queen to cut off ranks/files rather than chase with checks.",
      "Bring your king close enough to support the final mating move.",
      "Before every queen move, check for stalemate.",
    ],
    successNote: "You converted K+Q vs K against resistance.",
    failureNote: "The technique needs another execution pass: restrict, approach, then mate.",
  },
  {
    id: "endgame:rook-mate-box",
    skillId: "endgames.rook-mate",
    title: "Rook mate with king support",
    subtitle: "Cut off, approach, squeeze",
    fen: "7k/8/8/8/8/8/6R1/6K1 w - - 0 1",
    playerColor: "w",
    objectiveType: "convert",
    objective: "Checkmate with king and rook.",
    successOutcomes: ["win"],
    maxPlies: 44,
    difficulty: 3,
    techniqueId: "rook-box",
    recognitionPrompt: "What makes rook mate reliable?",
    recognitionOptions: [
      {
        id: "cutoff",
        label: "Cut the king off with the rook and walk your king forward.",
        explanation: "Correct. The rook builds the wall; your king forces the enemy king backward.",
      },
      {
        id: "checks",
        label: "Keep checking from far away.",
        explanation: "Repeated checks can simply drive the king around without shrinking its space.",
      },
      {
        id: "rook-king",
        label: "Move the rook beside the king as soon as possible.",
        explanation: "An unsupported rook can be attacked. King coordination comes first.",
      },
    ],
    recognitionAnswer: "cutoff",
    processCues: [
      "Use the rook as a wall.",
      "Keep the rook safely away from the enemy king.",
      "Mirror the king and squeeze one rank/file at a time.",
    ],
    successNote: "You completed the rook-mate technique.",
    failureNote: "Repeat the squeeze until king-rook coordination is automatic.",
  },
  {
    id: "endgame:opposition-convert",
    skillId: "endgames.opposition",
    title: "Opposition into promotion",
    subtitle: "King and pawn technique",
    fen: "4k3/8/8/4K3/4P3/8/8/8 w - - 0 1",
    playerColor: "w",
    objectiveType: "convert",
    objective: "Win the king-and-pawn ending.",
    successOutcomes: ["win"],
    maxPlies: 34,
    difficulty: 3,
    techniqueId: "opposition",
    recognitionPrompt: "What relationship between the kings matters most?",
    recognitionOptions: [
      {
        id: "opp",
        label: "Take opposition so the defending king must yield an entry square.",
        explanation: "Correct. Opposition is a tempo tool that creates king entry.",
      },
      {
        id: "push",
        label: "Push the pawn whenever it can move.",
        explanation: "Automatic pawn pushes can throw away the king's ability to gain entry.",
      },
      {
        id: "side",
        label: "Keep your king beside the pawn at all times.",
        explanation: "The king often needs to move in front of the pawn and win key squares.",
      },
    ],
    recognitionAnswer: "opp",
    processCues: [
      "King in front of the pawn is usually stronger than king beside it.",
      "Use opposition to force the defender away.",
      "Do not push the pawn until the king geometry supports it.",
    ],
    successNote: "You converted the opposition position.",
    failureNote: "Rebuild the king geometry before pushing the pawn.",
  },
  {
    id: "endgame:key-squares",
    skillId: "endgames.key-squares",
    title: "Enter the key squares",
    subtitle: "King first, pawn second",
    fen: "8/4k3/8/4K3/8/4P3/8/8 w - - 0 1",
    playerColor: "w",
    objectiveType: "convert",
    objective: "Use the king to secure promotion.",
    successOutcomes: ["win"],
    maxPlies: 38,
    difficulty: 3,
    techniqueId: "key-squares",
    recognitionPrompt: "What should guide your king route?",
    recognitionOptions: [
      {
        id: "keys",
        label: "Reach a key square in front of the pawn.",
        explanation: "Correct. Occupying the right key square can make promotion inevitable.",
      },
      {
        id: "race",
        label: "Ignore the king and race the pawn immediately.",
        explanation: "The defending king is close enough that unsupported pawn pushes are insufficient.",
      },
      {
        id: "edge",
        label: "Move the king toward the nearest edge.",
        explanation: "The useful squares are defined by the pawn and defending king, not the edge.",
      },
    ],
    recognitionAnswer: "keys",
    processCues: [
      "Identify the pawn's key squares before moving.",
      "Use your king to occupy or force access to them.",
      "Only advance the pawn when it does not lose the key-square route.",
    ],
    successNote: "You converted by making the king lead the pawn.",
    failureNote: "The key-square route needs another play-out.",
  },
  {
    id: "endgame:pawn-race",
    skillId: "endgames.pawn-races",
    title: "Calculate the pawn race",
    subtitle: "Promotion tempo matters",
    fen: "8/8/8/P7/7p/8/8/4K2k w - - 0 1",
    playerColor: "w",
    objectiveType: "convert",
    objective: "Calculate the race and win the resulting position.",
    successOutcomes: ["win"],
    maxPlies: 28,
    difficulty: 4,
    techniqueId: "pawn-race",
    recognitionPrompt: "What must be calculated before committing to the race?",
    recognitionOptions: [
      {
        id: "tempo",
        label: "Promotion tempi, checks after promotion, and whether either king can enter the square.",
        explanation: "Correct. Pawn races are calculation problems, not just distance comparisons.",
      },
      {
        id: "distance",
        label: "Only count how many pawn pushes remain.",
        explanation: "Promotion with check and king interception can reverse a simple push count.",
      },
      {
        id: "king",
        label: "Always move the king toward the enemy pawn first.",
        explanation: "Sometimes the only winning resource is to race immediately.",
      },
    ],
    recognitionAnswer: "tempo",
    processCues: [
      "Count both promotion clocks before moving.",
      "Include whether promotion gives check.",
      "Recalculate after every pawn move because king squares change the race.",
    ],
    successNote: "You calculated the race through promotion.",
    failureNote: "Recalculate the full race before choosing the first tempo.",
  },
  {
    id: "endgame:passed-pawn",
    skillId: "pawns.passed",
    title: "Support the passed pawn",
    subtitle: "King and passer coordinate",
    fen: "8/4k3/2K5/2P5/8/8/8/8 w - - 0 1",
    playerColor: "w",
    objectiveType: "convert",
    objective: "Promote or force a winning conversion with the passed pawn.",
    successOutcomes: ["win"],
    maxPlies: 34,
    difficulty: 4,
    techniqueId: "passed-pawn",
    recognitionPrompt: "What is the central technique?",
    recognitionOptions: [
      {
        id: "support",
        label: "Use the king to escort the passed pawn and deny blockade squares.",
        explanation: "Correct. A passed pawn becomes dangerous when the king controls the blockading squares.",
      },
      {
        id: "push",
        label: "Push the pawn at every opportunity.",
        explanation: "An unsupported passer can be blockaded or captured.",
      },
      {
        id: "king-away",
        label: "Send the king away to create threats elsewhere.",
        explanation: "With only this material, king support is the main resource.",
      },
    ],
    recognitionAnswer: "support",
    processCues: [
      "Keep the king close enough to protect the pawn.",
      "Control the square directly in front of the passer.",
      "Use zugzwang before pushing when possible.",
    ],
    successNote: "You converted the passed-pawn ending.",
    failureNote: "Coordinate king and passer before trying to sprint.",
  },
  {
    id: "endgame:rook-activity",
    skillId: "endgames.rook-activity",
    title: "Active rook behind the passer",
    subtitle: "Activity before passive defense",
    fen: "r7/5pk1/6p1/7p/4P3/6P1/5P1P/R5K1 w - - 0 1",
    playerColor: "w",
    objectiveType: "hold",
    objective: "Keep the rook active and maintain a sound rook ending for 20 plies or better.",
    successOutcomes: ["win", "draw"],
    maxPlies: 30,
    survivalPlies: 20,
    difficulty: 4,
    techniqueId: "rook-activity",
    recognitionPrompt: "What practical principle matters most in this ending?",
    recognitionOptions: [
      {
        id: "active",
        label: "Keep the rook active from behind or the side instead of tying it to passive defense.",
        explanation: "Correct. Active rooks create checks, attack pawns, and preserve drawing chances.",
      },
      {
        id: "passive",
        label: "Park the rook directly in front of the most dangerous pawn.",
        explanation: "Pure passivity often lets the opponent improve without counterplay.",
      },
      {
        id: "trade",
        label: "Trade the rook for any pawn as soon as possible.",
        explanation: "Giving up the rook without a concrete draw usually destroys the position.",
      },
    ],
    recognitionAnswer: "active",
    processCues: [
      "Check from the side or behind when it gains tempi.",
      "Attack pawns rather than only guarding your own.",
      "Keep king and rook coordinated enough to avoid tactical forks.",
    ],
    successNote: "You preserved active defensive resources.",
    failureNote: "The rook became too passive; create counterplay earlier.",
  },
  {
    id: "endgame:lucena",
    skillId: "endgames.lucena",
    title: "Lucena bridge",
    subtitle: "Convert the standard winning rook ending",
    fen: "2K5/2P3k1/8/8/8/8/r7/3R4 w - - 0 1",
    playerColor: "w",
    objectiveType: "convert",
    objective: "Build the bridge and convert the rook ending.",
    successOutcomes: ["win"],
    maxPlies: 46,
    difficulty: 5,
    techniqueId: "lucena",
    recognitionPrompt: "Which technique converts this position?",
    recognitionOptions: [
      {
        id: "bridge",
        label: "Lucena: force the king away, then build a rook bridge against checks.",
        explanation: "Correct. The rook shield lets the king escape checks and support promotion.",
      },
      {
        id: "sixth",
        label: "Philidor: keep the rook on the sixth rank.",
        explanation: "Philidor is a defensive drawing setup, not the winning method here.",
      },
      {
        id: "trade",
        label: "Trade rooks immediately at any cost.",
        explanation: "A rook trade is useful only if the resulting pawn ending is winning and the opponent allows it.",
      },
    ],
    recognitionAnswer: "bridge",
    processCues: [
      "Separate the defending king from the pawn.",
      "Prepare the rook on the fourth rank as a shield.",
      "Use the bridge to block side checks while the king emerges.",
    ],
    successNote: "You converted the Lucena position.",
    failureNote: "Rehearse the bridge until the checks no longer disrupt the king.",
  },
  {
    id: "endgame:philidor",
    skillId: "endgames.philidor",
    title: "Philidor defense",
    subtitle: "Hold the theoretical rook ending",
    fen: "8/6k1/r7/4K3/4P3/8/8/R7 b - - 0 1",
    playerColor: "b",
    objectiveType: "hold",
    objective: "Hold the position for 28 plies or reach a draw.",
    successOutcomes: ["win", "draw"],
    maxPlies: 40,
    survivalPlies: 28,
    difficulty: 5,
    techniqueId: "philidor",
    recognitionPrompt: "What is the defensive setup?",
    recognitionOptions: [
      {
        id: "sixth",
        label: "Keep the rook on the sixth rank until the pawn advances, then check from behind.",
        explanation: "Correct. The sixth-rank barrier keeps the king from advancing cleanly.",
      },
      {
        id: "bridge",
        label: "Build a rook bridge on the fourth rank.",
        explanation: "That is the attacking Lucena technique.",
      },
      {
        id: "checks",
        label: "Start checking from behind immediately.",
        explanation: "Too-early rear checks can let the attacking king shelter and advance.",
      },
    ],
    recognitionAnswer: "sixth",
    processCues: [
      "Maintain the sixth-rank barrier while the pawn remains back.",
      "Do not allow the attacking king to settle safely in front of the pawn.",
      "After the pawn advances, switch to checking from behind.",
    ],
    successNote: "You held the Philidor defense against active resistance.",
    failureNote: "Rebuild the sixth-rank barrier before switching to rear checks.",
  },
  {
    id: "endgame:simplify-extra-rook",
    skillId: "conversion.simplify",
    title: "Convert the extra rook",
    subtitle: "Technique, not tactics",
    fen: "6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1",
    playerColor: "w",
    objectiveType: "convert",
    objective: "Win while reducing counterplay.",
    successOutcomes: ["win"],
    maxPlies: 46,
    difficulty: 4,
    techniqueId: "simplify",
    recognitionPrompt: "How should a large material advantage change your priorities?",
    recognitionOptions: [
      {
        id: "reduce",
        label: "Trade counterplay, keep the king safe, and make the win simpler.",
        explanation: "Correct. Conversion rewards lower variance when the material advantage is already decisive.",
      },
      {
        id: "attack",
        label: "Avoid all trades and attack immediately.",
        explanation: "That can preserve unnecessary tactical risk.",
      },
      {
        id: "pawns",
        label: "Push every pawn before activating the rook.",
        explanation: "Piece activity and king safety remain more important than automatic pawn pushes.",
      },
    ],
    recognitionAnswer: "reduce",
    processCues: [
      "Prefer exchanges that preserve the material advantage.",
      "Keep the rook active and your king safe.",
      "Do not create unnecessary tactical complications.",
    ],
    successNote: "You converted the material advantage.",
    failureNote: "Simplify the opponent's counterplay before forcing the finish.",
  },
  {
    id: "endgame:rook-defense",
    skillId: "endgames.philidor",
    title: "Hold the worse rook ending",
    subtitle: "Active defense under pressure",
    fen: "8/5pk1/6pp/8/5Pr1/6P1/5K2/7R w - - 0 1",
    playerColor: "w",
    objectiveType: "hold",
    objective: "Hold for 24 plies or secure a draw.",
    successOutcomes: ["win", "draw"],
    maxPlies: 36,
    survivalPlies: 24,
    difficulty: 5,
    techniqueId: "active-defense",
    recognitionPrompt: "What gives the defender practical drawing chances?",
    recognitionOptions: [
      {
        id: "counterplay",
        label: "Active rook checks and king activity, not passive waiting.",
        explanation: "Correct. Rook endings often reward activity even when down a pawn.",
      },
      {
        id: "passive",
        label: "Keep every piece behind your own pawns.",
        explanation: "Passive setups can leave the opponent free to improve without resistance.",
      },
      {
        id: "sacrifice",
        label: "Give up the rook for the extra pawn immediately.",
        explanation: "That usually leaves a lost king-and-pawn ending unless the liquidation is concretely drawn.",
      },
    ],
    recognitionAnswer: "counterplay",
    processCues: [
      "Use checks to force the king away from ideal squares.",
      "Activate the king when checks gain enough time.",
      "Trade pawns when it improves the drawing geometry.",
    ],
    successNote: "You held a difficult rook ending through active defense.",
    failureNote: "Create active counterplay before the opponent coordinates king and rook.",
  },
  {
    id: "endgame:advanced-rook-checks",
    skillId: "endgames.rook-checks",
    title: "Checking distance in a worse rook ending",
    subtitle: "Active defense from the side",
    fen: "8/5pk1/4p3/4P3/8/8/1r4R1/6K1 w - - 0 1",
    playerColor: "w",
    objectiveType: "hold",
    objective: "Hold the rook ending by using active checks and king cutoffs.",
    successOutcomes: ["win", "draw"],
    maxPlies: 42,
    survivalPlies: 28,
    difficulty: 5,
    techniqueId: "checking-distance",
    recognitionPrompt: "What gives the defender the best practical chances?",
    recognitionOptions: [
      {
        id: "distance",
        label: "Keep checking distance and cut the king off instead of sitting behind the pawns.",
        explanation: "Correct. Rook activity and distance create tempi; passive defense lets the stronger king improve freely.",
      },
      {
        id: "passive",
        label: "Put the rook behind your own pawn and wait.",
        explanation: "That usually gives the opponent a free hand to improve the king and create a second target.",
      },
      {
        id: "trade",
        label: "Trade rooks at any cost.",
        explanation: "A rook trade is useful only when the resulting pawn ending is demonstrably drawable.",
      },
    ],
    recognitionAnswer: "distance",
    processCues: [
      "Check from far enough away that the king cannot attack the rook with tempo.",
      "Cut the king off before trying to win pawns.",
      "Recalculate every rook trade into the pawn ending.",
    ],
    successNote: "You held the rook ending through active checking geometry.",
    failureNote: "The rook became passive. Create checking distance before the king coordinates.",
  },
  {
    id: "endgame:opposite-bishops-blockade",
    skillId: "endgames.opposite-bishops",
    title: "Opposite-colored bishop blockade",
    subtitle: "Material is not the whole evaluation",
    fen: "4k3/8/8/4p3/3P4/2B5/8/4Kb2 w - - 0 1",
    playerColor: "w",
    objectiveType: "hold",
    objective: "Hold the ending by building a blockade on the color your bishop controls.",
    successOutcomes: ["win", "draw"],
    maxPlies: 40,
    survivalPlies: 26,
    difficulty: 5,
    techniqueId: "opposite-bishop-blockade",
    recognitionPrompt: "Why can opposite-colored bishops make a material edge hard to convert?",
    recognitionOptions: [
      {
        id: "blockade",
        label: "Each bishop controls squares the other cannot challenge, so a stable blockade can survive extra pawns.",
        explanation: "Correct. The defending bishop can anchor a color complex the attacking bishop can never directly contest.",
      },
      {
        id: "trade",
        label: "The bishops will always trade automatically.",
        explanation: "Opposite-colored bishops often cannot trade at all because they live on different color complexes.",
      },
      {
        id: "king",
        label: "Kings stop mattering once opposite-colored bishops remain.",
        explanation: "King activity is still crucial for supporting or attacking the blockade.",
      },
    ],
    recognitionAnswer: "blockade",
    processCues: [
      "Fix enemy pawns on squares your bishop can attack or blockade.",
      "Keep the king close to the opposite wing.",
      "Do not open both wings unless the blockade remains intact.",
    ],
    successNote: "You preserved the opposite-colored bishop blockade.",
    failureNote: "The blockade broke. Rebuild control of the critical color complex.",
  },
  {
    id: "endgame:minor-piece-activity",
    skillId: "endgames.minor-piece",
    title: "King and minor-piece activity",
    subtitle: "Create targets before collecting them",
    fen: "4k3/8/8/3p4/3P4/3N4/4P3/4Kb2 w - - 0 1",
    playerColor: "w",
    objectiveType: "convert",
    objective: "Convert the extra pawn by coordinating king and knight against the bishop.",
    successOutcomes: ["win"],
    maxPlies: 50,
    difficulty: 5,
    techniqueId: "minor-piece-activity",
    recognitionPrompt: "What matters most before trying to win pawns?",
    recognitionOptions: [
      {
        id: "activity",
        label: "Activate the king and improve the minor piece so the pawn targets cannot simply run away.",
        explanation: "Correct. Heavy-piece endings reward activity; minor-piece endings magnify it even more.",
      },
      {
        id: "grab",
        label: "Attack the nearest pawn immediately with the knight.",
        explanation: "Pawn hunting can misplace the knight and let the king or bishop become active.",
      },
      {
        id: "edge",
        label: "Move the king toward the edge to avoid tactics.",
        explanation: "The king belongs in the center once queens and rooks are gone.",
      },
    ],
    recognitionAnswer: "activity",
    processCues: [
      "Centralize the king before committing the knight to a pawn hunt.",
      "Use stable knight squares that attack fixed pawns.",
      "Watch whether exchanging pawns improves the bishop's diagonal.",
    ],
    successNote: "You converted the minor-piece ending with coordinated activity.",
    failureNote: "Improve king and piece activity before trying to cash in the extra pawn.",
  },
  {
    id: "endgame:two-weaknesses",
    skillId: "conversion.two-weaknesses",
    title: "Convert by switching wings",
    subtitle: "Fix one weakness, create another",
    fen: "4k2r/p6p/8/8/8/8/PP5P/R3K3 w - - 0 1",
    playerColor: "w",
    objectiveType: "convert",
    objective: "Use the extra queenside pawn and active rook to create a second weakness and convert.",
    successOutcomes: ["win"],
    maxPlies: 54,
    difficulty: 5,
    techniqueId: "two-weaknesses",
    recognitionPrompt: "What should you do when the defender can hold one target indefinitely?",
    recognitionOptions: [
      {
        id: "second",
        label: "Keep the first weakness fixed and open a second front far away.",
        explanation: "Correct. The defender's pieces cannot remain optimally placed against two separated problems.",
      },
      {
        id: "force",
        label: "Attack the same pawn with every piece until something breaks.",
        explanation: "If the target is fully defended, adding attackers can simply tie your pieces to an unproductive plan.",
      },
      {
        id: "trade",
        label: "Trade every pawn immediately.",
        explanation: "Liquidation can remove the second weakness you need in order to stretch the defense.",
      },
    ],
    recognitionAnswer: "second",
    processCues: [
      "Fix the first target before switching.",
      "Keep the rook mobile enough to transfer between wings.",
      "Create the second weakness only when the defender is tied down.",
    ],
    successNote: "You converted by stretching the defense across two fronts.",
    failureNote: "Do not force the first target forever; create a second problem.",
  }
];

function dueScore(
  state: UserState,
  position: EndgamePosition,
  now: Date,
) {
  const history =
    state.endgameHistory?.[position.id];
  if (!history) return 3 + position.difficulty * .05;
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
