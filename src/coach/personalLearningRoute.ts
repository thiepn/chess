import type { GameStoryMoment, ImportedGame, PersonalMistake } from "../games/types";
import type { RecordedReviewAttempt } from "../review/practiceLoop";
import { legalReviewMistake, verifiedReviewAttempts } from "../review/practiceLoop";
import { lessonPositionKey } from "../learning/lessonPositionKey";
import { gameToTrainingHandoff, type GameToTrainingHandoff } from "./gameToTraining";

export interface DifferentGamePosition {
  mistakeId: string;
  gameId: string;
  moveNumber: number;
  recordedAttempts: number;
}
export interface LaterGameObservations {
  analyzedGames: number;
  gamesWithVerifiedMistakes: number;
}
export interface PersonalLearningRoute {
  handoff: GameToTrainingHandoff;
  /** This is canonical Review practice, not a new grader or exercise. */
  independentPosition: DifferentGamePosition | null;
  originalRecall: { recordedAttempts: number; cleanAttempts: number };
  later: LaterGameObservations | null;
}

/** Same recorded human game must not become independent evidence via re-import. */
export function recordedGameIdentity(game: ImportedGame): string {
  if (game.source && game.externalId) return `external:${game.source}:${game.externalId}`;
  if (game.pgn?.trim()) return `pgn:${game.pgn.trim().replace(/\\s+/g, " ")}`;
  return `local:${game.id}`;
}

function distinctPosition(first: string, second: string): boolean {
  try {
    return lessonPositionKey(first) !== lessonPositionKey(second);
  } catch {
    return false;
  }
}

/** Only dates that identify a real calendar day are compared; import time is not game time. */
function playedDay(game: ImportedGame): number | null {
  const raw = game.date?.trim().replaceAll(".", "-");
  if (!raw || !/^\\d{4}-\\d{2}-\\d{2}$/.test(raw)) return null;
  const timestamp = Date.parse(`${raw}T00:00:00Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === raw
    ? timestamp : null;
}

/**
 * Read-only learner journey built entirely from the current owner's verified
 * game/review records. All practice still uses existing Review and Learn flows.
 */
export function personalLearningRoute(
  game: ImportedGame,
  moment: GameStoryMoment,
  games: readonly ImportedGame[],
  mistakes: readonly PersonalMistake[],
  attempts: readonly RecordedReviewAttempt[],
  now = new Date(),
): PersonalLearningRoute | null {
  const handoff = gameToTrainingHandoff(game, moment, games, mistakes, now);
  if (!handoff) return null;
  const owned = new Map(games.filter(g =>
    g.id && g.source !== "training" && g.analyzedAt && g.reviewStory,
  ).map(g => [g.id, g]));
  if (owned.get(game.id) !== game) return null;

  const verified = mistakes.filter(m => {
    const source = owned.get(m.gameId);
    return Boolean(source && legalReviewMistake(m, source));
  });
  const original = handoff.mistakeId
    ? verified.find(m => m.id === handoff.mistakeId && m.gameId === game.id)
    : undefined;
  const originalAttempts = original ? verifiedReviewAttempts(original, attempts, now) : [];
  const originalRecall = {
    recordedAttempts: originalAttempts.length,
    cleanAttempts: originalAttempts.filter(a =>
      a.succeeded && a.hintsUsed === 0 && a.wrongAttempts === 0).length,
  };

  const originalIdentity = recordedGameIdentity(game);
  const used = new Set<string>([originalIdentity]);
  const candidates: Array<{mistake: PersonalMistake; game: ImportedGame; attempts: number}> = [];
  if (handoff.recurring && original && handoff.skillId) {
    for (const m of verified) {
      const source = owned.get(m.gameId);
      if (!source || m.id === original.id ||
          !m.skillIds.includes(handoff.skillId) ||
          !distinctPosition(original.positionFen, m.positionFen)) continue;
      const identity = recordedGameIdentity(source);
      if (used.has(identity)) continue;
      used.add(identity);
      candidates.push({
        mistake: m,
        game: source,
        attempts: verifiedReviewAttempts(m, attempts, now).length,
      });
    }
  }
  // Prefer a genuinely unpracticed, different game position. Original dates
  // are for observation only; they cannot establish that a player has learned.
  candidates.sort((a, b) =>
    a.attempts - b.attempts ||
    (Date.parse(b.game.importedAt) || 0) - (Date.parse(a.game.importedAt) || 0) ||
    a.mistake.id.localeCompare(b.mistake.id),
  );
  const selected = candidates[0];
  const independentPosition = selected ? {
    mistakeId: selected.mistake.id,
    gameId: selected.game.id,
    moveNumber: selected.mistake.moveNumber,
    recordedAttempts: selected.attempts,
  } : null;

  const startDay = playedDay(game);
  let later: LaterGameObservations | null = null;
  if (startDay !== null && handoff.skillId) {
    const unique = new Set<string>();
    let analyzedGames = 0, gamesWithVerifiedMistakes = 0;
    for (const other of owned.values()) {
      const day = playedDay(other);
      const identity = recordedGameIdentity(other);
      if (day === null || day <= startDay || unique.has(identity) ||
          identity === originalIdentity) continue;
      unique.add(identity);
      analyzedGames++;
      if (verified.some(m => m.gameId === other.id &&
          m.skillIds.includes(handoff.skillId!)))
        gamesWithVerifiedMistakes++;
    }
    later = { analyzedGames, gamesWithVerifiedMistakes };
  }
  return { handoff, originalRecall, independentPosition, later };
}
