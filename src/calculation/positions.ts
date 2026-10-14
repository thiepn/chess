import { legalCalculationBranch } from "./branchFeedback";
import { alignSourceStudySkills } from "./studySkillAlignment";
import { hydrateOpeningTransition } from "../openings/transitionStudy";
import { hydrateEndgameDecision } from "../endgames/decisionStudy";
import type {
  ChessSkill,
  TrainingActivity,
  UserState,
} from "../domain/types";
import type {
  CalculationPosition,
} from "./types";

// Original authored calculation content stays in external static assets.
// Original lazy study assets: no parallel database or synthetic lesson store.
const externalPositions: CalculationPosition[] = [];
const sourceFiles = [
    ["p94-candidates-v1.json", 40],
    ["p95-defensive-resistance-v1.json", 40],
    ["p96-quiet-positional-v1.json", 35],
    ["p97-forcing-v1.json", 10],
    ["p97-defenses-v1.json", 10],
    ["p97-positional-v1.json", 10],
    ["p97-promotions-v1.json", 10],
    ["p97-mixed-v1.json", 10],
    ["p98-essential-pawn-endgames-v1.json", 40],
    ["p99-rook-foundations-v1.json", 15],
    ["p99-rook-geometry-v1.json", 15],
    ["p99-rook-practical-v1.json", 15],
    ["p100-minor-piece-v1.json", 40],
    ["p101-queen-forcing-v1.json", 15],
    ["p101-queen-practical-v1.json", 20],
    ["p102-conversion-v1.json", 15],
    ["p102-activity-v1.json", 9],
    ["p102-defense-v1.json", 6],
    ["p102-races-stalemate-v1.json", 9],
    ["p102-precision-v1.json", 6],
    ["p103-structures-a-v1.json", 25],
    ["p103-structures-b-v1.json", 25],
    ["p104-rooks-bishops-v1.json", 15],
    ["p104-knight-harmony-v1.json", 15],
    ["p104-practical-plans-v1.json", 15],
    ["p105-checking-networks-v1.json", 15],
    ["p105-initiative-resistance-v1.json", 15],
    ["p105-shelter-prophylaxis-v1.json", 15],
    ["p106-active-defense-v1.json", 15],
    ["p106-queen-counterplay-v1.json", 15],
    ["p106-king-fortress-v1.json", 18],
    ["p109-imbalances-a-v1.json", 20],
    ["p109-imbalances-b-v1.json", 20],
    ["p110-prophylaxis-a-v1.json", 20],
    ["p110-prophylaxis-b-v1.json", 20],
    ["p111-opening-bridges-a-v1.json", 8],
    ["p111-opening-bridges-b-v1.json", 8],
    ["p112-endgame-decisions-a-v1.json", 15],
    ["p112-endgame-decisions-b-v1.json", 15],
  ] as const;
type SourceStatus = "loading" | "ready" | "failed";
const sourceStatus = new Map<string, SourceStatus>();
const sourceListeners = new Set<() => void>();
let sourceRevision = 0;
export function subscribeCalculationSources(listener: () => void): () => void {
  sourceListeners.add(listener);
  return () => { sourceListeners.delete(listener); };
}
export function calculationSourceRevision(): number { return sourceRevision; }
export function calculationSourceStatus() {
  const failedFiles = sourceFiles.filter(([file]) => sourceStatus.get(file) === "failed").map(([file]) => file);
  return {
    total: sourceFiles.length,
    ready: sourceFiles.filter(([file]) => sourceStatus.get(file) === "ready").length,
    pending: sourceFiles.filter(([file]) => sourceStatus.get(file) === "loading").length,
    failedFiles,
  };
}
function publishSourceUpdate(): void {
  sourceRevision += 1;
  sourceListeners.forEach(listener => listener());
}
function loadCalculationSource(file: string, count: number): void {
  if (typeof window === "undefined" ||
      sourceStatus.get(file) === "ready" || sourceStatus.get(file) === "loading") return;
  sourceStatus.set(file, "loading");
  publishSourceUpdate();
  const prefix = `calc:${file.slice(0, file.indexOf("-"))}-`;
  void fetch(`${import.meta.env.BASE_URL}data/calculation/${file}`)
    .then(async response => {
      if (!response.ok) throw new Error("Study file unavailable");
      const data: unknown = await response.json();
      if (!data || typeof data !== "object" || !("positions" in data) ||
          !Array.isArray(data.positions) || data.positions.length !== count) {
        throw new Error("Study manifest count mismatch");
      }
      const maybePositions = (data.positions as CalculationPosition[]).map(hydrateOpeningTransition).map(p => p ? hydrateEndgameDecision(p) : null);
      if (maybePositions.some(p => !p)) throw new Error("Missing legal opening transition source");
      const positions = (maybePositions as CalculationPosition[]).map(alignSourceStudySkills);
      const ids = new Set<string>(), fens = new Set<string>();
      if (!positions.every(position => {
        if (!position || typeof position.id !== "string" ||
            !position.id.startsWith(prefix) || typeof position.fen !== "string" ||
            ids.has(position.id) || fens.has(position.fen) ||
            !legalCalculationBranch(position)) return false;
        ids.add(position.id);
        fens.add(position.fen);
        return prefix === "calc:p94-" ||
          (Array.isArray(position.defensiveStudy?.variations) &&
            position.defensiveStudy.variations.every(variation =>
              !!legalCalculationBranch({
                ...position, bestMove: variation.moves[0],
                principalVariation: variation.moves,
              })));
      })) throw new Error("Study source failed legal or identity checks");
      if (positions.some(position =>
        externalPositions.some(existing => existing.id === position.id ||
          existing.fen === position.fen))) throw new Error("Duplicate study source");
      externalPositions.push(...positions);
      sourceStatus.set(file, "ready");
      publishSourceUpdate();
    })
    .catch(() => {
      sourceStatus.set(file, "failed");
      publishSourceUpdate();
    });
}
export function retryFailedCalculationSources(): void {
  for (const [file, count] of sourceFiles)
    if (sourceStatus.get(file) === "failed") loadCalculationSource(file, count);
}
if (typeof window !== "undefined")
  for (const [file, count] of sourceFiles) loadCalculationSource(file, count);

const authoredPositions: CalculationPosition[] = [
  {
    id: "calc:fork-candidates",
    skillIds: [
      "calculation.candidates",
      "calculation.forcing-lines",
      "calculation.visualization",
      "tactics.combinations",
    ],
    title: "Checks before comfort",
    prompt:
      "Find a forcing move that creates two threats.",
    fen: "2q1k3/8/8/5N2/8/8/8/4K3 w - - 0 1",
    playerColor: "w",
    bestMove: "f5d6",
    principalVariation: [
      "f5d6",
      "e8d8",
      "d6c8",
    ],
    explanation:
      "Nd6+ forks king and queen; ...Kd8 Nxc8 Kxc8 leaves bare kings: drawn.",
    source: "authored",
    sourceLabel: "Calculation course",
    difficulty: 4,
  },
  {
    id: "calc:quiet-development",
    skillIds: [
      "calculation.quiet",
      "calculation.reply",
      "calculation.visualization",
    ],
    title: "Calculate a quiet improvement",
    prompt:
      "Find quiet candidates and calculate Black's best reply.",
    fen: "rnbqkbnr/pppp1ppp/8/4p3/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    playerColor: "w",
    bestMove: "g1f3",
    principalVariation: [
      "g1f3",
      "b8c6",
      "b1c3",
    ],
    explanation:
      "Nf3 attacks e5; after ...Nc6, Nc3 develops. Compare quiet plans, not invented tactics.",
    source: "authored",
    sourceLabel: "Calculation course",
    difficulty: 3,
  },
  {
    id: "calc:move-order",
    skillIds: [
      "calculation.move-order",
      "calculation.reply",
      "calculation.evaluation",
    ],
    title: "Move order before execution",
    prompt:
      "Calculate the reply and continuation before taking the pawn.",
    fen: "4k3/8/8/8/8/3p4/4Q3/4K3 w - - 0 1",
    playerColor: "w",
    bestMove: "e2d3",
    principalVariation: [
      "e2d3",
      "e8f7",
      "d3d7",
    ],
    explanation:
      "Qxd3 takes the pawn; ...Kf7 Qd7+ checks. Calculate beyond the capture.",
    source: "authored",
    sourceLabel: "Calculation course",
    difficulty: 3,
  },
  {
    id:"calc:rook-cutoff",
    skillIds:["calculation.forcing-lines","calculation.reply","endgames.rook-checks"],
    title:"Cut off the king before chasing",
    prompt:"Calculate the rook entry, a king reply and your next check.",
    fen:"4k3/8/8/8/8/8/2R5/4K3 w - - 0 1",
    playerColor:"w",bestMove:"c2c8",principalVariation:["c2c8","e8f7","c8c7"],
    explanation:"Rc8+ Kf7 Rc7+ keeps checking distance, not forced mate.",
    replyReason:"The king must respond to Rc8+; ...Kf7 leaves the checking rank without approaching the rook.",
    continuationReason:"Rc7+ uses the seventh rank and preserves checking distance.",
    source:"authored",sourceLabel:"Original P90 calculation study",difficulty:3,
  },
  {
    id:"calc:king-tempo",
    skillIds:["calculation.evaluation","calculation.visualization","endgames.opposition"],
    title:"Visualize king opposition",
    prompt:"Calculate two king moves with the pawn still on e3.",
    fen:"4k3/8/8/8/4K3/4P3/8/8 w - - 0 1",
    playerColor:"w",bestMove:"e4e5",principalVariation:["e4e5","e8d7","e5f6"],
    explanation:"Ke5 Kd7 Kf6 gains ground behind e3; no tablebase win is claimed.",
    replyReason:"...Kd7 heads toward the pawn's file instead of retreating passively.",
    continuationReason:"Kf6 improves king activity without sacrificing the supporting pawn.",
    source:"authored",sourceLabel:"Original P90 calculation study",difficulty:4,
  },
  {
    id:"calc:promotion-check",
    skillIds:["calculation.branching","calculation.forcing-lines","endgames.pawn-races"],
    title:"Promotion with tempo",
    prompt:"Calculate promotion with check and the next queen check.",
    fen:"4k3/1P6/8/8/8/8/8/4K3 w - - 0 1",
    playerColor:"w",bestMove:"b7b8q",principalVariation:["b7b8q","e8f7","b8b7"],
    explanation:"b8=Q+ Kf7 Qb7+ gives two checks; examine each king escape.",
    replyReason:"...Kf7 leaves the eighth rank without stepping onto the promoted queen's attack.",
    continuationReason:"Qb7+ is a second check from the seventh rank.",
    source:"authored",sourceLabel:"Original P90 calculation study",difficulty:3,
  },
  {
    id:"calc:simplify-rooks",
    skillIds:["calculation.move-order","calculation.evaluation","conversion.simplify"],
    title:"Calculate what remains after an exchange",
    prompt:"Capture the rook, then improve your king with a purpose.",
    fen:"4k3/8/8/8/2r5/8/2R5/4K3 w - - 0 1",
    playerColor:"w",bestMove:"c2c4",principalVariation:["c2c4","e8f7","e1d2"],
    explanation:"Rxc4 removes Black's rook; ...Kf7 Kd2 activates the king with a rook remaining.",
    replyReason:"After Rxc4, Black has no rook; ...Kf7 is a legal king move.",
    continuationReason:"Kd2 activates the king while White's rook remains on c4.",
    source:"authored",sourceLabel:"Original P90 calculation study",difficulty:4,
  },
  // P63: The former advanced-combination reference was unsound:
  // 1.Re8+ Qxe8 2.Bxh7+? Kxh7 loses the rook and bishop without compensation.
  // Keep it out of scored instruction until a vetted replacement is authored.
  {
    id: "calc:defensive-countercheck",
    skillIds: [
      "tactics.defensive-resources",
      "calculation.branching",
    ],
    title: "Defend with a countercheck",
    prompt:
      "Look for a countercheck instead of a passive defense.",
    fen: "6k1/5ppp/8/8/8/8/4rPPP/3R2K1 w - - 0 1",
    playerColor: "w",
    bestMove: "d1d8",
    principalVariation: [
      "d1d8",
      "e2e8",
      "d8e8",
    ],
    explanation:
      "Rd8+ Re8 Rxe8+ removes the attacking rook by countercheck.",
    source: "authored",
    sourceLabel: "Advanced calculation course",
    difficulty: 5,
  }
];

function dueScore(
  state: UserState,
  positionId: string,
  now: Date,
) {
  const history =
    state.calculationHistory?.[
      positionId
    ];
  if (!history) return 3;

  const due =
    new Date(history.nextReviewAt) <=
    now;
  return (
    (due ? 2 : 0) +
    (1 - history.lastQuality) +
    Math.max(
      0,
      1 - history.successes / 3,
    )
  );
}

function personalPositions(
  state: UserState,
): CalculationPosition[] {
  return (state.mistakes ?? [])
    .filter(
      (mistake) =>
        mistake.principalVariation
          .length >= 3 &&
        (mistake.skillIds.some(
          (skillId) =>
            skillId.startsWith(
              "calculation.",
            ),
        ) ||
          mistake.centipawnLoss >=
            120),
    )
    .map((mistake) => {
      const calculationSkills = mistake.skillIds.filter(
        id => id.startsWith("calculation."),
      );
      return {
      id: `calc:mistake:${mistake.id}`,
      skillIds: calculationSkills.length
        ? calculationSkills
        : ["calculation.candidates", "calculation.reply"],
      title: "Calculate your game again",
      prompt:
        "From your game: calculate candidates without recalling your move.",
      fen: mistake.positionFen,
      playerColor:
        mistake.playerColor,
      bestMove: mistake.bestMove,
      principalVariation:
        mistake.principalVariation.slice(
          0,
          5,
        ),
      explanation:
        mistake.explanation,
      source: "personal-game",
      sourceLabel: `Your game · move ${mistake.moveNumber}`,
      difficulty:
        mistake.severity === "blunder"
          ? 5
          : mistake.severity ===
              "mistake"
            ? 4
            : 3,
      gameId: mistake.gameId,
      mistakeId: mistake.id,
      moveNumber:
        mistake.moveNumber,
      };
    });
}

export function calculationCatalog(
  state: UserState,
) {
  return [
    ...personalPositions(state),
    ...externalPositions,
    ...authoredPositions,
  ];
}

export function calculationPositionFor(
  state: UserState,
  skillId: string,
  now = new Date(),
) {
  const select = (positions: CalculationPosition[]) =>
    positions.filter(p => p.assessmentStatus !== "instructional-only" && p.skillIds.includes(skillId))
      .sort((a, b) => dueScore(state, b.id, now) - dueScore(state, a.id, now))[0];
  return select(personalPositions(state)) ??
    select([...externalPositions, ...authoredPositions]) ??
    authoredPositions[0];
}

export function resolveCalculationPosition(
  state: UserState,
  activity: TrainingActivity,
  skill: ChessSkill,
  now = new Date(),
) {
  const catalog =
    calculationCatalog(state);
  const exact =
    activity.calculationPositionId
      ? catalog.find(
          (position) =>
            position.id ===
            activity.calculationPositionId,
        )
      : undefined;

  return (
    exact ??
    calculationPositionFor(
      state,
      skill.id,
      now,
    )
  );
}

// Use the same 3-ply legal-line authority as the interactive calculation runner.
export function calculationCatalogIssues() {
  return [...authoredPositions, ...externalPositions]
    .filter(position => !legalCalculationBranch(position))
    .map(position => `${position.id}: invalid calculation line`);
}

export { authoredPositions };
