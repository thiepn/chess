import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import type { ImportedGame, GameStoryMoment, PersonalMistake } from "../games/types";
import { recordReviewAttempt } from "../review/practiceLoop";
import { personalLearningRoute } from "./personalLearningRoute";

function gameCase(id: string, opening: string[], date: string,
  skillId = "openings.principles") {
  const board = new Chess();
  const moves: ImportedGame["moves"] = [];
  for (const san of [...opening, "a3"]) {
    const beforeFen = board.fen();
    const played = board.move(san)!;
    const ply = moves.length + 1;
    moves.push({
      ply, moveNumber: Math.ceil(ply / 2), color: played.color,
      san: played.san, uci: `${played.from}${played.to}${played.promotion ?? ""}`,
      from: played.from, to: played.to, piece: played.piece,
      beforeFen, afterFen: board.fen(),
    });
  }
  const move = moves.at(-1)!;
  const moment: GameStoryMoment = {
    id: `moment:${id}`, mistakeId: `mistake:${id}`, ply: move.ply,
    moveNumber: move.moveNumber, phase: "opening", kind: "critical",
    severity: "mistake", positionFen: move.beforeFen,
    actualMove: move.uci, actualSan: move.san,
    bestMove: opening.length ? "g1f3" : "e2e4", bestSan: opening.length ? "Nf3" : "e4",
    principalVariation: [opening.length ? "g1f3" : "e2e4"],
    evaluationBefore: 20, evaluationAfter: -160, centipawnLoss: 180,
    skillIds: [skillId], title: "Original game decision", summary: "Recorded engine observation",
  };
  const game: ImportedGame = {
    id, pgn: `[Event "${id}"] 1. ${opening.join(" ")} a3 *`,
    source: "manual", date, importedAt: `${date.replaceAll(".", "-")}T12:00:00Z`,
    analyzedAt: "2026-10-20T10:00:00Z",
    playerColor: "w", white: "Original White", black: "Original Black",
    result: "*", moves, criticalMomentIds: [moment.mistakeId!],
    reviewStory: {
      headline: "Original source game", summary: "Engine reviewed",
      verdict: "costly", phases: [], moments: [moment],
      prioritySkillId: skillId, generatedAt: "2026-10-20T10:00:00Z",
    },
  };
  const mistake: PersonalMistake = {
    id: moment.mistakeId!, gameId:id, ply: move.ply,
    moveNumber: move.moveNumber, playerColor:"w",
    positionFen:move.beforeFen, actualMove: move.uci, actualSan:move.san,
    bestMove: moment.bestMove, principalVariation:[moment.bestMove],
    evaluationBefore:20,evaluationAfter:-160,centipawnLoss:180,
    severity:"mistake", skillIds:[skillId],
    explanation:"Recorded game-analysis classification",
    createdAt:"2026-10-20T10:00:00Z",nextReviewAt:"2026-10-20T10:00:00Z",
    attempts:0,successes:0,resolved:false,
  };
  return {game,mistake,moment};
}
const now = new Date("2026-10-20T15:00:00Z");

describe("G9 personal game-to-learning-and-transfer journey", () => {
  it("selects a separate, never-practiced original game position with the same skill", () => {
    const a=gameCase("first",[],"2026-10-10");
    const b=gameCase("second",["e4","e5"],"2026-10-12");
    const c=gameCase("third",["d4","d5"],"2026-10-14");
    const route=personalLearningRoute(a.game,a.moment,
      [a.game,b.game,c.game],[a.mistake,b.mistake,c.mistake],[],now)!;
    expect(route.handoff.recurring).toBe(true);
    expect(route.handoff.evidenceGames).toBe(3);
    expect(route.independentPosition).toMatchObject({
      mistakeId:c.mistake.id,gameId:c.game.id,moveNumber:2,recordedAttempts:0,
    });
    expect(route.originalRecall).toEqual({ recordedAttempts:0,cleanAttempts:0 });
    expect(route.later).toEqual({ analyzedGames:2,gamesWithVerifiedMistakes:2 });
  });

  it("prefers an unpracticed different position over the most recent already-reviewed one", () => {
    const a=gameCase("first",[],"2026-10-10");
    const b=gameCase("second",["e4","e5"],"2026-10-12");
    const c=gameCase("third",["d4","d5"],"2026-10-14");
    const history=recordReviewAttempt([],c.mistake,c.game,{
      playedMove:c.mistake.bestMove,triedMoves:[c.mistake.bestMove],
      succeeded:true,quality:1,hintsUsed:0,wrongAttempts:0,
    },new Date("2026-10-20T11:00:00Z"));
    expect(history).toHaveLength(1);
    const route=personalLearningRoute(a.game,a.moment,
      [a.game,b.game,c.game],[a.mistake,b.mistake,c.mistake],history,now)!;
    expect(route.independentPosition?.mistakeId).toBe(b.mistake.id);
    const originalHistory=recordReviewAttempt([],a.mistake,a.game,{
      playedMove:a.mistake.bestMove,triedMoves:[a.mistake.bestMove],
      succeeded:true,quality:1,hintsUsed:0,wrongAttempts:0,
    },new Date("2026-10-20T11:00:00Z"));
    const progress=personalLearningRoute(a.game,a.moment,
      [a.game,b.game,c.game],[a.mistake,b.mistake,c.mistake],
      [...history,...originalHistory],now)!;
    expect(progress.originalRecall).toEqual({ recordedAttempts:1,cleanAttempts:1 });
  });

  it("never treats a duplicate imported game or clock-only FEN change as independent transfer", () => {
    const a=gameCase("source",[],"2026-10-10");
    const b=gameCase("copy",["e4","e5"],"2026-10-12");
    const duplicated={...b.game,pgn:a.game.pgn};
    const route=personalLearningRoute(a.game,a.moment,
      [a.game,duplicated],[a.mistake,b.mistake],[],now)!;
    expect(route.handoff.recurring).toBe(false);
    expect(route.independentPosition).toBeNull();

    const second=gameCase("clock",[],"2026-10-13");
    const changedFen=second.mistake.positionFen.replace(/\d+ \d+$/, "14 32");
    const clockGame={
      ...second.game,
      moves:second.game.moves.map(m=>({...m,beforeFen:changedFen})),
    };
    const clockMistake={...second.mistake,positionFen:changedFen};
    const samePosition=personalLearningRoute(a.game,a.moment,
      [a.game,clockGame],[a.mistake,clockMistake],[],now)!;
    expect(samePosition.independentPosition).toBeNull();
  });

  it("does not claim later-game improvement from missing or unverified errors", () => {
    const a=gameCase("first",[],"2026-10-10");
    const b=gameCase("second",["e4","e5"],"2026-10-13");
    const c=gameCase("third",["d4","d5"],"2026-10-17");
    const bad={...b.mistake,positionFen:"forged"};
    const route=personalLearningRoute(a.game,a.moment,
      [a.game,b.game,c.game],[a.mistake,bad],[],now)!;
    expect(route.later).toEqual({analyzedGames:2,gamesWithVerifiedMistakes:0});
    expect(route.independentPosition).toBeNull();
    expect("improved" in route.later!).toBe(false);
    const undated={...a.game,date:undefined};
    expect(personalLearningRoute(undated,a.moment,[undated],
      [a.mistake],[],now)?.later).toBeNull();
  });

  it("excludes foreign owners and non-human games without inventing independent tasks", () => {
    const a=gameCase("one",[],"2026-10-10");
    const b=gameCase("two",["e4","e5"],"2026-10-13");
    expect(personalLearningRoute(a.game,a.moment,[b.game],
      [a.mistake,b.mistake],[],now)).toBeNull();
    const training={...b.game,source:"training" as const};
    const route=personalLearningRoute(a.game,a.moment,[a.game,training],
      [a.mistake,b.mistake],[],now)!;
    expect(route.handoff.recurring).toBe(false);
    expect(route.independentPosition).toBeNull();
    expect(route.later).toEqual({analyzedGames:0,gamesWithVerifiedMistakes:0});
  });
});
