import { describe, expect, it } from "vitest";
import { importPgn } from "../games/import";
import type { ImportedGame } from "../games/types";
import type { UserState } from "../domain/types";
import { buildCoachEffectiveness } from "../prescriptions/outcomes";
import type {
  PrescriptionTrackingRecord, CoachEffectivenessInsight,
} from "../prescriptions/types";
import type { G10LearningFeedback } from "./learningFeedback";
import type { PersonalLearningRoute } from "./personalLearningRoute";
import { g12PostTrainingFollowThrough } from "./postTrainingFollowThrough";

const NOW = new Date("2026-10-21T12:00:00Z");
const SKILL = "openings.principles";
const ORIGINAL = "mistake:original";
const DIFFERENT = "mistake:different";

function route(): PersonalLearningRoute {
  return {
    handoff: {
      mistakeId: ORIGINAL, skillId: SKILL, skillTitle: "Opening principles",
      evidenceGames: 3, gameCountLabel: "3 verified games",
      recurring: true, due: false, observation: "Human games", gameMove: 4,
    },
    independentPosition: { mistakeId: DIFFERENT,
      gameId: "other-original-game", moveNumber: 7, recordedAttempts: 1 },
    originalRecall: { recordedAttempts: 2, cleanAttempts: 1 },
    later: { analyzedGames: 3, gamesWithVerifiedMistakes: 1 },
  };
}

function feedback(originalClean = 1, transferClean = 1): G10LearningFeedback {
  const review = {
    attempted: 2, clean: originalClean, assisted: 1,
    missed: originalClean ? 0 : 1, spacedCleanRecalls: false,
    latestCleanAt: originalClean ? "2026-10-14T12:00:00Z" : null,
  };
  return {
    guided: { observed: 2, successful: 1 },
    independentPractice: { observed: 1, successful: 1 },
    original: review,
    differentGame: { ...review, clean: transferClean },
    transferAcrossGames: { verifiedPositions: 2, attemptedPositions: 1,
      cleanUnaidedPositions: transferClean ? 1 : 0,
      needsIndependentRetry: transferClean ? 0 : 1 },
    afterIndependentRecall: { distinctAnalyzedGames: 3,
      gamesWithVerifiedSkillMistake: 1 },
    next: originalClean === 0 ? "original" :
      transferClean === 0 ? "different-game" : "observe",
  };
}

function tracking(id = "tracked-repair"): PrescriptionTrackingRecord {
  return {
    id, prescriptionId: "prescription:opening:development",
    kind: "opening-repair", title: "Original opening repair",
    target: { dimension: "color", key: "w", label: "White games",
      skillId: SKILL },
    issuedAt: "2026-10-08T09:00:00Z",
    baseline: { capturedAt: "2026-10-08T09:00:00Z",
      games: 3, score: 40 },
    starts: 2, completions: 2,
    lastStartedAt: "2026-10-10T10:00:00Z",
    lastCompletedAt: "2026-10-10T10:05:00Z",
    completedActionIds: ["original-lesson", "original-lesson", "original-recall"],
    trainingSuccesses: 1, trainingQualityTotal: 1,
  };
}

function game(
  id: string, importedAt: string,
  options: {source?: "lichess" | "manual" | "training"; analyzedAt?: string;
    color?: "w" | "b"; openingPhase?: boolean; metrics?: boolean} = {},
): ImportedGame {
  const pgn = `[Event "Source-authored test game"]
[Site "Offline"]
[Date "2026.10.12"]
[White "Learner"]
[Black "Opponent"]
[Result "*"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 *`;
  const parsed = importPgn(pgn, options.color ?? "w", importedAt, {
    source: options.source ?? "lichess",
  });
  const first = parsed.moves[0];
  return {
    ...parsed, id, externalId: id,
    source: options.source ?? "lichess", importedAt,
    analyzedAt: options.analyzedAt ?? importedAt,
    playerColor: options.color ?? "w",
    practicalMetrics: options.metrics === false ? undefined : {
      averageCentipawnLoss: 35, criticalErrorRate: 8, blunderRate: 1,
      qualityScore: 75, resultScore: 60, skillValidations: [],
    },
    reviewStory: {
      headline: "Source game analysis", summary: "Reviewed",
      verdict: "competitive", generatedAt: importedAt,
      phases: options.openingPhase === false ? [] : [{
        phase: "opening", startPly: 1, endPly: parsed.moves.length,
        headline: "Source opening", summary: "Original source",
        averageCentipawnLoss: 35, criticalCount: 1,
      }],
      moments: [{
        id: `source:${id}`, ply: first.ply, moveNumber: first.moveNumber,
        phase: "opening", kind: "critical", positionFen: first.beforeFen,
        actualMove: first.uci, actualSan: first.san,
        bestMove: "d2d4", bestSan: "d4", principalVariation: ["d2d4"],
        evaluationBefore: 15, evaluationAfter: -70, centipawnLoss: 85,
        skillIds: [SKILL], title: "Source-backed move",
        summary: "Source analyzed move",
      }],
    },
  };
}

function evaluated(
  records: PrescriptionTrackingRecord[],
  games: ImportedGame[] = [],
): CoachEffectivenessInsight {
  return buildCoachEffectiveness({
    mastery: {}, weaknesses: [], recentDomainMinutes: {},
    games, mistakes: [], prescriptionHistory: records,
  } as UserState, NOW);
}

describe("G12 original completed prescription and real-game follow-through", () => {
  it("does not claim follow-through for uncompleted, unrelated or future repairs", () => {
    const base = tracking();
    expect(g12PostTrainingFollowThrough(route(), feedback(),
      [{ ...base, completions: 0 }], evaluated([]), [], NOW)).toBeNull();
    expect(g12PostTrainingFollowThrough(route(), feedback(),
      [{ ...base, lastCompletedAt: "2026-12-01T10:00:00Z" }],
      evaluated([]), [], NOW)).toBeNull();
    expect(g12PostTrainingFollowThrough(route(), feedback(),
      [{ ...base, target: { ...base.target, skillId: "tactics.forks" } }],
      evaluated([]), [], NOW)).toBeNull();
  });

  it("reads actual latest completed repair even when it is no longer prescribed", () => {
    const older = tracking("older");
    const latest = { ...tracking("newer"),
      lastCompletedAt: "2026-10-17T10:05:00Z",
      completedActionIds: ["original-recall"], completions: 1,
      retiredAt: "2026-10-18T09:00:00Z" };
    const reports = evaluated([older, latest]);
    const result = g12PostTrainingFollowThrough(route(), feedback(),
      [older, latest], reports, [], NOW)!;
    expect(result.recordId).toBe("newer");
    expect(result.completedActions).toBe(1);
    expect(result.completions).toBe(1);
    expect(result.outcome?.status).toBe("collecting");
    expect(result.outcome?.postGames).toBe(0);
    expect(result.outcome?.trainingSuccessRate).toBe(100);
  });

  it("prioritizes exact original recall before a verified different-game position", () => {
    const record = tracking();
    const original = g12PostTrainingFollowThrough(route(), feedback(0,0),
      [record], evaluated([record]), [], NOW)!;
    expect(original.next).toBe("recall-original");
    expect(original.originalRecall).toMatchObject({
      cleanUnaided: 0, assisted: 1, missed: 1,
    });
    const independent = g12PostTrainingFollowThrough(route(), feedback(1,0),
      [record], evaluated([record]), [], NOW)!;
    expect(independent.next).toBe("practice-different-game");
    expect(independent.explanation).toContain("different verified");
  });

  it("does not claim transfer or invent a chess position when no clean independent recall is recorded", () => {
    const record = tracking();
    const noIndependent = { ...route(), independentPosition: null };
    const result = g12PostTrainingFollowThrough(
      noIndependent, feedback(1,0), [record], evaluated([record]), [], NOW)!;
    expect(result.next).toBe("await-independent-position");
    expect(result.laterGameId).toBeNull();
  });

  it("links a valid owner-listed later analyzed source game, not a fabricated best move", () => {
    const record = tracking();
    const earlier = game("earlier", "2026-10-09T10:00:00Z");
    const later = game("later", "2026-10-15T10:00:00Z");
    const wrongColor = game("black", "2026-10-20T10:00:00Z", {color:"b"});
    const manual = game("manual", "2026-10-20T11:00:00Z", {source:"manual"});
    const games = [earlier, later, wrongColor, manual];
    const output = g12PostTrainingFollowThrough(route(), feedback(),
      [record], evaluated([record], games), games, NOW)!;
    expect(output.next).toBe("review-later-game");
    expect(output.laterGameId).toBe(later.id);
    expect(output.outcome?.status).toBe("collecting");
    expect(output.outcome?.postGames).toBe(1);
  });

  it("uses original evaluation unchanged when enough Lichess games exist", () => {
    const record = tracking();
    const games = [
      game("later-a", "2026-10-12T10:00:00Z"),
      game("later-b", "2026-10-13T10:00:00Z"),
      game("later-c", "2026-10-14T10:00:00Z"),
    ];
    const report = evaluated([record], games);
    const result = g12PostTrainingFollowThrough(route(), feedback(),
      [record], report, games, NOW)!;
    expect(result.outcome?.status).toBe(report.history[0].status);
    expect(result.outcome?.postGames).toBe(3);
    expect(result.outcome?.trainingSuccessRate).toBe(report.history[0].trainingSuccessRate);
    expect(result.laterGameId).toBe("later-c");
  });

  it("denies unanalysed, future, incomplete and foreign-source games", () => {
    const record = tracking();
    const candidates = [
      game("future", "2026-12-01T10:00:00Z"),
      game("unanalysed", "2026-10-15T10:00:00Z", {analyzedAt:"2026-12-01T10:00:00Z"}),
      game("no-metrics", "2026-10-17T10:00:00Z", {metrics:false}),
      game("training", "2026-10-18T10:00:00Z", {source:"training"}),
    ];
    const result = g12PostTrainingFollowThrough(route(), feedback(),
      [record], evaluated([record], candidates), candidates, NOW)!;
    expect(result.next).toBe("await-human-games");
    expect(result.laterGameId).toBeNull();
  });

  it("refuses mismatched effectiveness rows rather than assigning unrelated improvement", () => {
    const record = tracking();
    const fabricated = { ...evaluated([record]),
      history: [{ ...evaluated([record]).history[0],
        recordId: "another-owner-record", status: "improved" as const }] };
    const result = g12PostTrainingFollowThrough(route(), feedback(),
      [record], fabricated, [], NOW)!;
    expect(result.outcome).toBeNull();
    expect(result.next).toBe("await-human-games");
  });
});
