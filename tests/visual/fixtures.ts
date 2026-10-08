import { initialUserState } from "../../src/data/demo";
import { importPgn } from "../../src/games/import";
import type { SavedStudy } from "../../src/library/types";
import type { UserState } from "../../src/domain/types";

export const FIXED_TIME = "2026-10-08T08:00:00.000Z";
const pgn = `[Event "Visual Regression Study"]
[Site "Offline"]
[Date "2026.10.06"]
[White "Student"]
[Black "Training Opponent"]
[Result "*"]
[Opening "Italian Game"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 *`;

const importedGame = importPgn(pgn, "w", FIXED_TIME, { source: "manual" });
const pivotalMove = importedGame.moves[2];
importedGame.analyzedAt = FIXED_TIME;
importedGame.reviewStory = {
  headline: "Develop with a concrete purpose",
  summary: "The opening shows how central control and piece activity reinforce each other.",
  verdict: "competitive",
  phases: [{
    phase: "opening",
    startPly: 1,
    endPly: importedGame.moves.length,
    headline: "Coordinated opening",
    summary: "Both sides develop toward the center.",
    averageCentipawnLoss: 24,
    criticalCount: 1,
  }],
  moments: [{
    id: "visual-moment-01",
    ply: pivotalMove.ply,
    moveNumber: pivotalMove.moveNumber,
    phase: "opening",
    kind: "critical",
    positionFen: pivotalMove.beforeFen,
    actualMove: pivotalMove.uci,
    actualSan: pivotalMove.san,
    bestMove: "f1c4",
    bestSan: "Bc4",
    principalVariation: ["f1c4", "g8f6"],
    evaluationBefore: 30,
    evaluationAfter: 5,
    centipawnLoss: 25,
    skillIds: ["openings.development"],
    title: "A choice of developing moves",
    summary: "Compare a natural knight move with an active bishop development.",
  }],
  prioritySkillId: "openings.development",
  generatedAt: FIXED_TIME,
};

const study: SavedStudy = {
  id: "p57-study",
  title: "Italian development position",
  kind: "opening",
  fen: pivotalMove.beforeFen,
  notes: "Develop with tempo, inspect the center and identify the opponent's threat.",
  tags: ["development", "opening", "planning"],
  source: "personal",
  orientation: "w",
  arrows: [],
  highlights: [],
  favorite: true,
  createdAt: FIXED_TIME,
  updatedAt: FIXED_TIME,
};

const mastery = Object.fromEntries(
  Object.entries(initialUserState.mastery).map(([id, value]) => [
    id,
    {
      ...value,
      lastSeenAt: "2026-10-07T08:00:00.000Z",
      lastSuccessAt: "2026-10-07T08:00:00.000Z",
      nextReviewAt: "2026-10-08T07:00:00.000Z",
    },
  ]),
);

export const visualUserState: UserState = {
  ...initialUserState,
  mastery,
  games: [importedGame],
  savedStudies: [study],
};

export const visualGameId = importedGame.id;
