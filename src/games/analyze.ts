import { Chess } from "chess.js";
import type { StockfishBrowserEngine } from "../engine/stockfish";
import { buildPersonalMistake } from "./classify";
import { buildGameReviewStory } from "./story";
import { buildPracticalGameMetrics } from "./practical";
import type {
  EngineMoveReview,
  GameAnalysisProgress,
  ImportedGame,
  PersonalMistake,
} from "./types";

async function evaluatePosition(
  fen: string,
  engine: StockfishBrowserEngine,
  depth: number,
) {
  const chess = new Chess(fen);

  if (chess.isCheckmate()) {
    return {
      scoreCp: -100_000,
      mate: 0,
      bestMove: "(none)",
      pv: [],
      depth: 0,
    };
  }

  if (chess.isDraw() || chess.isStalemate()) {
    return {
      scoreCp: 0,
      bestMove: "(none)",
      pv: [],
      depth: 0,
    };
  }

  return engine.evaluate(fen, depth);
}

export async function analyzeImportedGame(
  game: ImportedGame,
  engine: StockfishBrowserEngine,
  options: {
    depth?: number;
    onProgress?: (progress: GameAnalysisProgress) => void;
  } = {},
): Promise<{ game: ImportedGame; mistakes: PersonalMistake[]; reviews: EngineMoveReview[] }> {
  const depth = options.depth ?? 11;
  const playerMoves = game.moves.filter((move) => move.color === game.playerColor);
  const reviews: EngineMoveReview[] = [];

  options.onProgress?.({
    completed: 0,
    total: playerMoves.length,
    phase: "analyzing",
  });

  for (let index = 0; index < playerMoves.length; index += 1) {
    const move = playerMoves[index];
    const before = await evaluatePosition(move.beforeFen, engine, depth);
    const after = await evaluatePosition(move.afterFen, engine, depth);
    const playerScoreAfter = -after.scoreCp;
    const centipawnLoss = Math.max(0, Math.round(before.scoreCp - playerScoreAfter));

    reviews.push({
      gameId: game.id,
      ply: move.ply,
      move,
      before,
      after,
      centipawnLoss,
    });

    options.onProgress?.({
      completed: index + 1,
      total: playerMoves.length,
      phase: "analyzing",
    });
  }

  options.onProgress?.({
    completed: playerMoves.length,
    total: playerMoves.length,
    phase: "classifying",
  });

  const now = new Date();
  const mistakes = reviews
    .map((review) => buildPersonalMistake(review, now))
    .filter((value): value is PersonalMistake => Boolean(value))
    .sort((a, b) => b.centipawnLoss - a.centipawnLoss)
    .slice(0, 8);

  const reviewStory = buildGameReviewStory(game, reviews, mistakes, now);
  const practicalMetrics = buildPracticalGameMetrics(
    game,
    reviews,
    mistakes,
  );

  const analyzedGame: ImportedGame = {
    ...game,
    analyzedAt: now.toISOString(),
    analysisEngine: engine.name,
    criticalMomentIds: mistakes.map((mistake) => mistake.id),
    reviewStory,
    practicalMetrics,
  };

  options.onProgress?.({
    completed: playerMoves.length,
    total: playerMoves.length,
    phase: "complete",
  });

  return { game: analyzedGame, mistakes, reviews };
}
