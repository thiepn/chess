import { skillById } from "../domain/curriculum";
import type { GameStoryMoment, ImportedGame, PersonalMistake } from "../games/types";
import { legalReviewMistake } from "../review/practiceLoop";

export interface GameToTrainingHandoff {
  mistakeId: string | null;
  skillId: string | null;
  skillTitle: string | null;
  /** Number of distinct analyzed human games, not mistake count. */
  evidenceGames: number;
  gameCountLabel: string;
  /** Only multi-game, independently qualified patterns count as recurring. */
  recurring: boolean;
  due: boolean;
  observation: string;
  gameMove: number;
}

export function gameToTrainingHandoff(
  game: ImportedGame,
  moment: GameStoryMoment,
  games: readonly ImportedGame[],
  mistakes: readonly PersonalMistake[],
  now = new Date(),
): GameToTrainingHandoff | null {
  if (!Number.isFinite(now.getTime()) || !game.analyzedAt || !game.reviewStory ||
      game.source === "training" ||
      !game.reviewStory.moments.some(item =>
        item.id === moment.id && item.ply === moment.ply &&
        item.positionFen === moment.positionFen))
    return null;

  const eligible = new Map(games.filter(item =>
    item.source !== "training" && item.analyzedAt &&
    item.reviewStory && item.id !== "").map(item => [item.id, item]));
  if (eligible.get(game.id) !== game) return null;

  const verified = mistakes.filter(item => {
    const ownedGame = eligible.get(item.gameId);
    return ownedGame && legalReviewMistake(item, ownedGame);
  });
  const current = moment.mistakeId
    ? verified.find(item =>
        item.id === moment.mistakeId && item.gameId === game.id &&
        item.ply === moment.ply && item.positionFen === moment.positionFen)
    : undefined;
  // The moment's own original skill identity is required for a link to Train.
  // It is not inferred from engine scores or from the user's prose reflection.
  const skillId = (current?.skillIds ?? moment.skillIds)
    .find(id => moment.skillIds.includes(id) && Boolean(skillById[id])) ?? null;
  if (!current && !skillId) return null;
  // Re-imported copies of the same recorded game are not independent evidence.
  const gameIdentities = skillId
    ? new Set(verified.filter(item => item.skillIds.includes(skillId)).map(item => {
        const recorded = eligible.get(item.gameId)!;
        const pgn = recorded.pgn?.trim().replace(/\s+/g, " ");
        if (pgn) return `pgn:${pgn}`;
        if (recorded.externalId && recorded.source)
          return `source:${recorded.source}:${recorded.externalId}`;
        return `id:${recorded.id}`;
      }))
    : new Set<string>();
  const evidenceGames = gameIdentities.size;
  const recurring = current !== undefined && evidenceGames >= 2;
  const gameCountLabel = !skillId || !evidenceGames
    ? "No verified multi-game skill pattern"
    : evidenceGames === 1 ? "Observed in 1 analyzed human game"
    : `Observed in ${evidenceGames} analyzed human games`;
  const due = Boolean(current &&
    Number.isFinite(Date.parse(current.nextReviewAt)) &&
    Date.parse(current.nextReviewAt) <= now.getTime());
  const observation = recurring ? "Repeated skill signal in verified game positions"
    : current ? "Verified game mistake; recurrence not established"
      : "Analyzed game moment; no verified mistake for direct replay";

  return {
    mistakeId: current?.id ?? null,
    skillId,
    skillTitle: skillId ? skillById[skillId].title : null,
    evidenceGames,
    gameCountLabel,
    recurring,
    due,
    observation,
    gameMove: moment.moveNumber,
  };
}
