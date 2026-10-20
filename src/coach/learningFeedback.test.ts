import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import type { ImportedGame, PersonalMistake, GameStoryMoment } from "../games/types";
import type { LearningAnalyticsEvent } from "../analytics/types";
import { recordReviewAttempt } from "../review/practiceLoop";
import { personalLearningRoute } from "./personalLearningRoute";
import { g10LearningFeedback } from "./learningFeedback";

const NOW = new Date("2026-10-20T18:00:00Z");
const SKILL = "openings.principles";

function sourceGame(id: string, date: string, prefix: string[] = []) {
  const board = new Chess();
  const moves: ImportedGame["moves"] = [];
  for (const san of [...prefix, "a3"]) {
    const beforeFen = board.fen();
    const move = board.move(san)!;
    const ply = moves.length + 1;
    moves.push({
      ply, moveNumber: Math.ceil(ply / 2), color: move.color,
      san: move.san, uci: `${move.from}${move.to}${move.promotion ?? ""}`,
      from: move.from, to: move.to, piece: move.piece,
      beforeFen, afterFen: board.fen(),
    });
  }
  const last = moves.at(-1)!;
  const bestMove = prefix.length ? "g1f3" : "e2e4";
  const moment: GameStoryMoment = {
    id: `moment:${id}`, mistakeId: `mistake:${id}`,
    ply: last.ply, moveNumber: last.moveNumber,
    phase:"opening",kind:"critical",severity:"mistake",
    positionFen:last.beforeFen,actualMove:last.uci,actualSan:last.san,
    bestMove,bestSan:prefix.length ? "Nf3" : "e4",
    principalVariation:[bestMove],evaluationBefore:12,evaluationAfter:-180,
    centipawnLoss:192,skillIds:[SKILL],
    title:"Original reviewed game",summary:"Source-backed analysis",
  };
  const game:ImportedGame={
    id,source:"manual",date,pgn:`[Event "${id}"] 1. ${prefix.join(" ")} a3 *`,
    importedAt:`${date}T11:00:00Z`,analyzedAt:"2026-10-20T10:00:00Z",
    playerColor:"w",white:"White",black:"Black",result:"*",
    moves,criticalMomentIds:[moment.mistakeId!],
    reviewStory:{headline:"Original game",summary:"Source review",verdict:"costly",
      phases:[],moments:[moment],prioritySkillId:SKILL,generatedAt:"2026-10-20T10:00:00Z"},
  };
  const mistake:PersonalMistake={
    id:moment.mistakeId!,gameId:id,ply:last.ply,moveNumber:last.moveNumber,
    playerColor:"w",positionFen:last.beforeFen,actualMove:last.uci,
    actualSan:last.san,bestMove,principalVariation:[bestMove],
    evaluationBefore:12,evaluationAfter:-180,centipawnLoss:192,
    severity:"mistake",skillIds:[SKILL],explanation:"Original source",
    createdAt:"2026-10-20T10:00:00Z",nextReviewAt:"2026-10-20T10:00:00Z",
    attempts:0,successes:0,resolved:false,
  };
  return {game,mistake,moment};
}

function learningEvent(
  id:string,source:NonNullable<LearningAnalyticsEvent["evidenceSource"]>,
  success:boolean,skillId=SKILL,
):LearningAnalyticsEvent {
  return {
    id,kind:"evidence",skillId,stageId:"learn",domain:"openings",
    occurredAt:"2026-10-19T08:00:00Z",evidenceSource:source,
    intervention:"manual",success,quality:success?1:0,
    masteryBefore:12,masteryAfter:15,retentionBefore:4,retentionAfter:5,
    transferBefore:0,transferAfter:0,confidenceBefore:10,confidenceAfter:12,
    stabilityBefore:1,stabilityAfter:1,
  };
}

function attempt(
  game:ImportedGame,mistake:PersonalMistake,
  kind:"clean"|"assisted"|"missed",at:string,
) {
  const succeeded=kind!=="missed";
  const uci=succeeded?mistake.bestMove:mistake.actualMove;
  return recordReviewAttempt([],mistake,game,{
    playedMove:uci,triedMoves:[uci],succeeded,
    quality:succeeded?(kind==="assisted"?.8:1):0,
    hintsUsed:kind==="assisted"?1:0,wrongAttempts:kind==="missed"?1:0,
  },new Date(at));
}

describe("G10 verified game-to-training feedback",()=>{
  it("separates canonical guided and mixed/checkpoint evidence without declaring game improvement",()=>{
    const a=sourceGame("a","2026-10-10");
    const route=personalLearningRoute(a.game,a.moment,[a.game],[a.mistake],[],NOW)!;
    const events=[
      learningEvent("guided-1","guided",true),
      learningEvent("lesson-1","lesson",false),
      learningEvent("mix-1","mixedPuzzle",true),
      learningEvent("checkpoint","checkpoint",true),
      learningEvent("other-skill","guided",true,"rules.check"),
    ];
    const result=g10LearningFeedback(route,[a.game],[a.mistake],[],events,NOW);
    expect(result.guided).toEqual({observed:2,successful:1});
    expect(result.independentPractice).toEqual({observed:2,successful:2});
    expect(result.next).toBe("original");
    expect(result.afterIndependentRecall).toBeNull();
  });

  it("distinguishes missed and hint-assisted work from unaided clean recalls",()=>{
    const a=sourceGame("a","2026-10-10");
    const b=sourceGame("b","2026-10-12",["e4","e5"]);
    const history=[
      ...attempt(a.game,a.mistake,"clean","2026-10-14T10:00:00Z"),
      ...attempt(b.game,b.mistake,"assisted","2026-10-15T10:00:00Z"),
      ...attempt(b.game,b.mistake,"missed","2026-10-16T10:00:00Z"),
    ];
    expect(history).toHaveLength(3);
    const route=personalLearningRoute(a.game,a.moment,
      [a.game,b.game],[a.mistake,b.mistake],history,NOW)!;
    expect(route.independentPosition?.mistakeId).toBe(b.mistake.id);
    const result=g10LearningFeedback(route,[a.game,b.game],
      [a.mistake,b.mistake],history,[],NOW);
    expect(result.original).toMatchObject({attempted:1,clean:1,assisted:0,missed:0});
    expect(result.differentGame).toMatchObject({
      attempted:2,clean:0,assisted:1,missed:1,spacedCleanRecalls:false,
    });
    expect(result.next).toBe("different-game");
  });

  it("requires a real 24-hour gap for spaced recall, not just different calendar days",()=>{
    const a=sourceGame("a","2026-10-10");
    const b=sourceGame("b","2026-10-12",["e4","e5"]);
    const original=attempt(a.game,a.mistake,"clean","2026-10-14T10:00:00Z");
    const first=attempt(b.game,b.mistake,"clean","2026-10-15T23:50:00Z");
    const short=attempt(b.game,b.mistake,"clean","2026-10-16T00:10:00Z");
    let history=[...original,...first,...short];
    const route=personalLearningRoute(a.game,a.moment,
      [a.game,b.game],[a.mistake,b.mistake],history,NOW)!;
    let result=g10LearningFeedback(route,[a.game,b.game],[a.mistake,b.mistake],
      history,[learningEvent("lesson","lesson",true)],NOW);
    expect(result.differentGame?.clean).toBe(2);
    expect(result.differentGame?.spacedCleanRecalls).toBe(false);
    history=[...history,...attempt(b.game,b.mistake,"clean","2026-10-18T02:00:00Z")];
    result=g10LearningFeedback(route,[a.game,b.game],[a.mistake,b.mistake],
      history,[learningEvent("lesson","lesson",true)],NOW);
    expect(result.differentGame?.spacedCleanRecalls).toBe(true);
    expect(result.next).toBe("observe");
  });

  it("counts only later-dated analyzed human games after the first verified transfer recall",()=>{
    const a=sourceGame("a","2026-10-10");
    const b=sourceGame("b","2026-10-12",["e4","e5"]);
    const c=sourceGame("c","2026-10-18",["d4","d5"]);
    const history=[
      ...attempt(a.game,a.mistake,"clean","2026-10-14T10:00:00Z"),
      ...attempt(b.game,b.mistake,"clean","2026-10-15T10:00:00Z"),
    ];
    const games=[a.game,b.game,c.game];
    const mistakes=[a.mistake,b.mistake];
    const route=personalLearningRoute(a.game,a.moment,games,mistakes,history,NOW)!;
    expect(route.independentPosition?.mistakeId).toBe(b.mistake.id);
    const result=g10LearningFeedback(route,games,mistakes,history,[],NOW);
    expect(result.afterIndependentRecall).toEqual({
      distinctAnalyzedGames:1,gamesWithVerifiedSkillMistake:0,
    });
    // A recorded later skill mistake changes observations, not proof of success.
    const withFailure=g10LearningFeedback(route,games,[...mistakes,c.mistake],history,[],NOW);
    expect(withFailure.afterIndependentRecall).toEqual({
      distinctAnalyzedGames:1,gamesWithVerifiedSkillMistake:1,
    });
    expect("improved" in result).toBe(false);
  });

  it("retains earlier clean transfer evidence when the coach selects a new unpracticed game",()=>{
    const a=sourceGame("a","2026-10-10");
    const b=sourceGame("b","2026-10-12",["e4","e5"]);
    const c=sourceGame("c","2026-10-14",["d4","d5"]);
    const d=sourceGame("d","2026-10-18",["c4","e5"]);
    const games=[a.game,b.game,c.game,d.game];
    const mistakes=[a.mistake,b.mistake,c.mistake];
    const history=[
      ...attempt(a.game,a.mistake,"clean","2026-10-14T10:00:00Z"),
      ...attempt(b.game,b.mistake,"clean","2026-10-15T10:00:00Z"),
    ];
    const route=personalLearningRoute(a.game,a.moment,games,mistakes,history,NOW)!;
    expect(route.independentPosition?.mistakeId).toBe(c.mistake.id);
    const feedback=g10LearningFeedback(route,games,mistakes,history,[],NOW);
    expect(feedback.differentGame?.attempted).toBe(0);
    expect(feedback.transferAcrossGames).toEqual({
      verifiedPositions:2,attemptedPositions:1,
      cleanUnaidedPositions:1,needsIndependentRetry:0,
    });
    expect(feedback.afterIndependentRecall).toEqual({
      distinctAnalyzedGames:1,gamesWithVerifiedSkillMistake:0,
    });
    expect(feedback.next).toBe("different-game");
  });

  it("does not include a human game analyzed after the observation date",()=>{
    const a=sourceGame("a","2026-10-10");
    const b=sourceGame("b","2026-10-12",["e4","e5"]);
    const c=sourceGame("c","2026-10-18",["d4","d5"]);
    const future={...c.game,analyzedAt:"2026-12-01T10:00:00Z"};
    const history=[
      ...attempt(a.game,a.mistake,"clean","2026-10-14T10:00:00Z"),
      ...attempt(b.game,b.mistake,"clean","2026-10-15T10:00:00Z"),
    ];
    const route=personalLearningRoute(a.game,a.moment,
      [a.game,b.game],[a.mistake,b.mistake],history,NOW)!;
    const feedback=g10LearningFeedback(route,
      [a.game,b.game,future],[a.mistake,b.mistake,c.mistake],history,[],NOW);
    expect(feedback.afterIndependentRecall).toEqual({
      distinctAnalyzedGames:0,gamesWithVerifiedSkillMistake:0,
    });
  });

  it("rejects unverified, future and foreign attempts and duplicate analytics IDs",()=>{
    const a=sourceGame("a","2026-10-10");
    const b=sourceGame("b","2026-10-12",["e4","e5"]);
    const clean=attempt(a.game,a.mistake,"clean","2026-10-14T10:00:00Z");
    const tampered=clean.map(row=>({...row,id:"foreign",gameId:"foreign"}));
    const future=clean.map(row=>({...row,id:"future",occurredAt:"2026-12-01T00:00:00Z"}));
    const history=[...clean,...clean,...tampered,...future];
    const route=personalLearningRoute(a.game,a.moment,
      [a.game,b.game],[a.mistake,b.mistake],history,NOW)!;
    const ev=learningEvent("same","guided",true);
    const result=g10LearningFeedback(route,[a.game,b.game],
      [a.mistake,b.mistake],history,[ev,ev],NOW);
    expect(result.original).toMatchObject({attempted:1,clean:1,missed:0});
    expect(result.guided).toEqual({observed:1,successful:1});
  });
});
