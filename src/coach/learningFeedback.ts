import type { LearningAnalyticsEvent } from "../analytics/types";
import type { ImportedGame, PersonalMistake } from "../games/types";
import type { RecordedReviewAttempt } from "../review/practiceLoop";
import { legalReviewMistake, verifiedReviewAttempts } from "../review/practiceLoop";
import { lessonPositionKey } from "../learning/lessonPositionKey";
import {
  playedDay, recordedGameIdentity, type PersonalLearningRoute,
} from "./personalLearningRoute";

export interface G10ReviewFeedback {
  attempted: number;
  clean: number;
  assisted: number;
  missed: number;
  spacedCleanRecalls: boolean;
  latestCleanAt: string | null;
}

export interface G10LearningFeedback {
  guided: { observed: number; successful: number };
  independentPractice: { observed: number; successful: number };
  original: G10ReviewFeedback;
  differentGame: G10ReviewFeedback | null;
  transferAcrossGames: {
    verifiedPositions: number;
    attemptedPositions: number;
    cleanUnaidedPositions: number;
    needsIndependentRetry: number;
  } | null;
  afterIndependentRecall: {
    distinctAnalyzedGames: number;
    gamesWithVerifiedSkillMistake: number;
  } | null;
  next: "original" | "different-game" | "canonical-skill" | "observe";
}

function summarizeAttempts(
  mistake: PersonalMistake | undefined,
  attempts: readonly RecordedReviewAttempt[],
  now: Date,
): G10ReviewFeedback {
  const verified = mistake ? verifiedReviewAttempts(mistake, attempts, now) : [];
  const unique = new Map(verified.map(item => [item.id, item]));
  const records = [...unique.values()];
  const clean = records.filter(item =>
    item.succeeded && item.hintsUsed === 0 && item.wrongAttempts === 0,
  );
  const assisted = records.filter(item =>
    item.succeeded && (item.hintsUsed > 0 || item.wrongAttempts > 0),
  );
  const spacedCleanRecalls = clean.some((attempt, index) =>
    clean.slice(0, index).some(previous =>
      Date.parse(attempt.occurredAt) - Date.parse(previous.occurredAt) >= 86_400_000,
    ),
  );
  return {
    attempted: records.length,
    clean: clean.length,
    assisted: assisted.length,
    missed: records.length - clean.length - assisted.length,
    spacedCleanRecalls,
    latestCleanAt: clean.at(-1)?.occurredAt ?? null,
  };
}

/** A read-only projection: never awards grades, updates memory, or infers chess strength. */
export function g10LearningFeedback(
  route: PersonalLearningRoute,
  games: readonly ImportedGame[],
  mistakes: readonly PersonalMistake[],
  reviewAttempts: readonly RecordedReviewAttempt[],
  learningEvents: readonly LearningAnalyticsEvent[],
  now = new Date(),
): G10LearningFeedback {
  const skillId = route.handoff.skillId;
  const validNow = Number.isFinite(now.getTime());
  const canonicalEvents = skillId && validNow
    ? learningEvents.filter(e => e.kind === "evidence" && e.skillId === skillId &&
        Boolean(e.id) && Number.isFinite(Date.parse(e.occurredAt)) &&
        Date.parse(e.occurredAt) <= now.getTime())
    : [];
  const distinctEvents = [...new Map(canonicalEvents.map(e => [e.id, e])).values()];
  const guided = distinctEvents.filter(e =>
    e.evidenceSource === "lesson" || e.evidenceSource === "guided",
  );
  const independentPractice = distinctEvents.filter(e =>
    e.evidenceSource === "mixedPuzzle" || e.evidenceSource === "checkpoint",
  );
  const ownedGames = new Map(games.filter(g => g.id && g.source !== "training" &&
    g.analyzedAt && validNow && Number.isFinite(Date.parse(g.analyzedAt)) &&
    Date.parse(g.analyzedAt) <= now.getTime() && g.reviewStory).map(g => [g.id, g]));
  const verifiedMistakes = mistakes.filter(m => {
    const game = ownedGames.get(m.gameId);
    return Boolean(game && legalReviewMistake(m, game));
  });
  const originalMistake = route.handoff.mistakeId
    ? verifiedMistakes.find(m => m.id === route.handoff.mistakeId)
    : undefined;
  const differentMistake = route.independentPosition
    ? verifiedMistakes.find(m => m.id === route.independentPosition?.mistakeId &&
        m.gameId === route.independentPosition?.gameId)
    : undefined;
  const original = summarizeAttempts(originalMistake, reviewAttempts, now);
  const differentGame = differentMistake
    ? summarizeAttempts(differentMistake, reviewAttempts, now) : null;

  // A new G9 recommendation must not make earlier verified transfer work
  // disappear. Different original games, new board geometry, same source skill.
  const transferred: PersonalMistake[] = [];
  if (originalMistake && skillId && route.handoff.recurring) {
    const origin = ownedGames.get(originalMistake.gameId);
    const usedGames = new Set(origin ? [recordedGameIdentity(origin)] : []);
    for (const mistake of verifiedMistakes) {
      const game = ownedGames.get(mistake.gameId);
      if (!game || mistake.id === originalMistake.id ||
          !mistake.skillIds.includes(skillId)) continue;
      const identity = recordedGameIdentity(game);
      if (usedGames.has(identity)) continue;
      try {
        if (lessonPositionKey(originalMistake.positionFen) ===
            lessonPositionKey(mistake.positionFen)) continue;
      } catch { continue; }
      usedGames.add(identity);
      transferred.push(mistake);
    }
  }
  const positionReports = transferred.map(m =>
    ({ mistake: m, report: summarizeAttempts(m, reviewAttempts, now) }),
  );
  const transferAcrossGames = transferred.length ? {
    verifiedPositions: transferred.length,
    attemptedPositions: positionReports.filter(p => p.report.attempted > 0).length,
    cleanUnaidedPositions: positionReports.filter(p => p.report.clean > 0).length,
    needsIndependentRetry: positionReports.filter(p =>
      p.report.attempted > 0 && p.report.clean === 0).length,
  } : null;

  // Date-only game records do not establish same-day ordering. Only evaluate
  // games strictly after a verified clean attempt at a different position.
  let afterIndependentRecall: G10LearningFeedback["afterIndependentRecall"] = null;
  const cleanTimes = validNow ? positionReports.flatMap(p =>
    verifiedReviewAttempts(p.mistake, reviewAttempts, now)
      .filter(a => a.succeeded && a.hintsUsed === 0 && a.wrongAttempts === 0)
      .map(a => a.occurredAt),
  ).sort((a, b) => Date.parse(a) - Date.parse(b)) : [];
  const earliestClean = cleanTimes[0] ?? null;
  if (earliestClean && skillId) {
    const cleanedDay = Date.parse(earliestClean.slice(0, 10) + "T00:00:00Z");
    const unique = new Set<string>();
    let distinctAnalyzedGames = 0;
    let gamesWithVerifiedSkillMistake = 0;
    for (const game of ownedGames.values()) {
      const day = playedDay(game);
      const identity = recordedGameIdentity(game);
      if (day === null || day <= cleanedDay || day > now.getTime() ||
          unique.has(identity)) continue;
      unique.add(identity);
      distinctAnalyzedGames++;
      if (verifiedMistakes.some(m => m.gameId === game.id &&
          m.skillIds.includes(skillId))) gamesWithVerifiedSkillMistake++;
    }
    afterIndependentRecall = { distinctAnalyzedGames, gamesWithVerifiedSkillMistake };
  }

  // This suggests an action, not an automated prescription or mastery grade.
  const next: G10LearningFeedback["next"] =
    route.handoff.mistakeId && original.clean === 0 ? "original" :
    route.independentPosition && (!differentGame || differentGame.clean === 0)
      ? "different-game" :
    guided.length === 0 && skillId ? "canonical-skill" : "observe";

  return {
    guided: { observed: guided.length,
      successful: guided.filter(e => e.success === true).length },
    independentPractice: { observed: independentPractice.length,
      successful: independentPractice.filter(e => e.success === true).length },
    original, differentGame, transferAcrossGames, afterIndependentRecall, next,
  };
}
