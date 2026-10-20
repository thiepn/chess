import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import type { GameStoryMoment, ImportedGame, PersonalMistake } from "../games/types";
import { gameToTrainingHandoff } from "./gameToTraining";

function gameCase(id: string, skillId = "openings.principles") {
  const board = new Chess();
  const positionFen = board.fen();
  const move = board.move("a3")!;
  const now = "2026-10-01T12:00:00.000Z";
  const ply = 1;
  const moment: GameStoryMoment = {
    id: `moment:${id}`, mistakeId: `mistake:${id}`, ply, moveNumber: 1,
    phase: "opening", kind: "critical", severity: "mistake",
    positionFen, actualMove: "a2a3", actualSan: move.san,
    bestMove: "e2e4", bestSan: "e4", principalVariation: ["e2e4"],
    evaluationBefore: 20, evaluationAfter: -180, centipawnLoss: 200,
    skillIds: [skillId], title: "Analyzed decision", summary: "Original engine review position",
  };
  const game: ImportedGame = {
    id, source: "manual", pgn: "", importedAt: now, analyzedAt: now,
    playerColor: "w", white: "White", black: "Black", result: "*",
    criticalMomentIds: [moment.mistakeId!],
    moves: [{
      ply, moveNumber: 1, color: "w", san: move.san, uci: "a2a3",
      from: move.from, to: move.to, piece: move.piece,
      beforeFen: positionFen, afterFen: board.fen(),
    }],
    reviewStory: {
      headline: "Original analyzed game", summary: "Original analyzed move",
      verdict: "costly", phases: [], moments: [moment],
      prioritySkillId: skillId, generatedAt: now,
    },
  };
  const mistake: PersonalMistake = {
    id: moment.mistakeId!, gameId: id, ply, moveNumber: 1, playerColor: "w",
    positionFen, actualMove: "a2a3", actualSan: move.san, bestMove: "e2e4",
    principalVariation: ["e2e4"], evaluationBefore: 20,
    evaluationAfter: -180, centipawnLoss: 200, severity: "mistake",
    skillIds: [skillId], explanation: "Original source classification",
    createdAt: now, nextReviewAt: now, attempts: 0, successes: 0, resolved: false,
  };
  return { game, mistake, moment };
}

describe("Personal Chess Coach game-to-training handoff", () => {
  const now = new Date("2026-10-20T12:00:00.000Z");

  it("offers exact owner-verified position replay and canonical skill practice", () => {
    const {game,mistake,moment} = gameCase("g1");
    const result = gameToTrainingHandoff(game,moment,[game],[mistake],now)!;
    expect(result).toMatchObject({
      mistakeId:mistake.id, skillId:"openings.principles",
      evidenceGames:1, recurring:false, due:true, gameMove:1,
    });
    expect(result.skillTitle).toBeTruthy();
    expect(result.gameCountLabel).toContain("1 analyzed human game");
  });

  it("calls a problem recurring only across different verified human games", () => {
    const a=gameCase("a"),b=gameCase("b"),c=gameCase("c");
    const list=[a.game,b.game,c.game], mistakes=[a.mistake,b.mistake,c.mistake];
    const result=gameToTrainingHandoff(a.game,a.moment,list,mistakes,now)!;
    expect(result.evidenceGames).toBe(3);
    expect(result.recurring).toBe(true);
    expect(result.gameCountLabel).toContain("3 analyzed human games");
    expect(gameToTrainingHandoff(a.game,a.moment,[a.game],[a.mistake,a.mistake],now)?.recurring).toBe(false);
  });

  it("does not turn duplicate game imports into repeated independent evidence", () => {
    const a = gameCase("source-one");
    const b = gameCase("source-copy");
    const c = gameCase("actual-second-game");
    const samePgn = '[Event "Original analyzed game"] 1. a3 *';
    const first = {...a.game, pgn:samePgn};
    const copy = {...b.game, pgn:samePgn};
    const second = {...c.game, pgn:'[Event "Other game"] 1. a3 *'};
    const initial = gameToTrainingHandoff(first, a.moment,
      [first, copy], [a.mistake, b.mistake], now)!;
    expect(initial.evidenceGames).toBe(1);
    expect(initial.recurring).toBe(false);
    const distinct = gameToTrainingHandoff(first, a.moment,
      [first, copy, second], [a.mistake, b.mistake, c.mistake], now)!;
    expect(distinct.evidenceGames).toBe(2);
    expect(distinct.recurring).toBe(true);
    const externalA = {...a.game, externalId:"same-source", source:"lichess" as const};
    const externalB = {...b.game, externalId:"same-source", source:"lichess" as const};
    expect(gameToTrainingHandoff(externalA, a.moment,
      [externalA, externalB], [a.mistake, b.mistake], now)?.evidenceGames).toBe(1);
  });

  it("excludes training games and foreign, tampered, or unanalysed records", () => {
    const a=gameCase("a"),b=gameCase("b");
    expect(gameToTrainingHandoff({...a.game,source:"training"},a.moment,
      [{...a.game,source:"training"}],[a.mistake],now)).toBeNull();
    expect(gameToTrainingHandoff(a.game,a.moment,[a.game],
      [{...a.mistake,positionFen:"forged"}],now)?.mistakeId).toBeNull();
    const withTraining={...b.game,source:"training" as const};
    expect(gameToTrainingHandoff(a.game,a.moment,[a.game,withTraining],
      [a.mistake,b.mistake],now)?.evidenceGames).toBe(1);
    expect(gameToTrainingHandoff(a.game,a.moment,[a.game],
      [b.mistake],now)?.recurring).toBe(false);
    expect(gameToTrainingHandoff({...a.game,analyzedAt:undefined},a.moment,
      [a.game],[a.mistake],now)).toBeNull();
  });

  it("never maps absent curriculum skills to an invented lesson or puzzle", () => {
    const a=gameCase("unknown","missing.skill");
    expect(gameToTrainingHandoff(a.game,a.moment,[a.game],[a.mistake],now)).toMatchObject({
      mistakeId:a.mistake.id,skillId:null,skillTitle:null,recurring:false,
    });
    const b=gameCase("known");
    expect(gameToTrainingHandoff(b.game,{...b.moment,id:"foreign"},
      [b.game],[b.mistake],now)).toBeNull();
  });

  it("does not claim due status for a future or malformed original review date", () => {
    const a=gameCase("a");
    expect(gameToTrainingHandoff(a.game,a.moment,[a.game],
      [{...a.mistake,nextReviewAt:"2026-11-01T00:00:00Z"}],now)?.due).toBe(false);
    expect(gameToTrainingHandoff(a.game,a.moment,[a.game],
      [{...a.mistake,nextReviewAt:"invalid"}],now)?.due).toBe(false);
  });
});
