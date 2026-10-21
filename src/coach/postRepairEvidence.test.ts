import { describe, expect, it } from "vitest";
import { importPgn } from "../games/import";
import type { ImportedGame, PersonalMistake } from "../games/types";
import { recordReviewAttempt, type RecordedReviewAttempt } from "../review/practiceLoop";
import type { PersonalLearningRoute } from "./personalLearningRoute";
import type { G12PostTrainingFollowThrough } from "./postTrainingFollowThrough";
import { g13RepairEvidence } from "./postRepairEvidence";

const NOW = new Date("2026-10-21T12:00:00Z");
const DONE = "2026-10-10T10:05:00Z";
const SKILL = "openings.principles";
function game(id: string, date: string): ImportedGame {
  const pgn = `[Event "Original ${id}"]
[Site "Offline"]
[Date "${date.replaceAll("-",".")}"]
[White "Learner"]
[Black "Opponent"]
[Result "*"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 *`;
  const parsed=importPgn(pgn,"w","2026-10-21T08:00:00Z",{source:"lichess"});
  return {...parsed,id,externalId:id,source:"lichess",
    analyzedAt:"2026-10-21T09:00:00Z",
    practicalMetrics:{averageCentipawnLoss:35,criticalErrorRate:8,blunderRate:1,
      qualityScore:75,resultScore:60,skillValidations:[]},
    reviewStory:{headline:"Original analysis",summary:"Verified",
      verdict:"competitive",generatedAt:"2026-10-21T09:00:00Z",
      phases:[],moments:[]}};
}
function error(id: string,g:ImportedGame,ply:number,best:string):PersonalMistake {
  const m=g.moves.find(m=>m.ply===ply)!;
  return {id,gameId:g.id,ply,moveNumber:m.moveNumber,
    playerColor:m.color,positionFen:m.beforeFen,
    actualMove:m.uci,actualSan:m.san,bestMove:best,
    principalVariation:[best],evaluationBefore:10,evaluationAfter:-50,
    centipawnLoss:60,severity:"mistake",skillIds:[SKILL],
    explanation:"Source move",createdAt:"2026-10-09T09:00:00Z",
    nextReviewAt:"2026-10-09T09:00:00Z",attempts:0,successes:0,resolved:false};
}
function recall(m:PersonalMistake,g:ImportedGame,at:string):RecordedReviewAttempt {
  const history=recordReviewAttempt([],m,g,{playedMove:m.bestMove,
    triedMoves:[m.bestMove],succeeded:true,quality:1,hintsUsed:0,wrongAttempts:0},
    new Date(at));
  expect(history).toHaveLength(1);
  return history[0];
}
function route():PersonalLearningRoute {
  return {handoff:{mistakeId:"original",skillId:SKILL,skillTitle:"Opening principles",
    evidenceGames:2,gameCountLabel:"2 games",recurring:true,due:false,
    observation:"Verified",gameMove:1},
    independentPosition:{mistakeId:"independent",gameId:"second",moveNumber:2,recordedAttempts:0},
    originalRecall:{recordedAttempts:1,cleanAttempts:1},later:null};
}
function repair(later:string|null=null):G12PostTrainingFollowThrough {
  return {recordId:"record",prescriptionId:"prescription",title:"Opening repair",
    completedAt:DONE,completions:1,completedActions:1,outcome:null,
    originalRecall:{cleanUnaided:1,assisted:0,missed:0},
    independentRecall:{cleanPositions:1,attemptedPositions:1},
    next:"review-later-game",laterGameId:later,explanation:"Historical Review"};
}
function fixture() {
  const a=game("first","2026-10-07"),b=game("second","2026-10-08"),
    c=game("third","2026-10-20");
  const x=error("original",a,1,"d2d4"),y=error("independent",b,3,"g1f3");
  return {a,b,c,x,y,games:[a,b,c],mistakes:[x,y]};
}
describe("G13 verified post-completion independent transfer",()=>{
  it("does not mistake clean pre-repair Review for training follow-through",()=>{
    const f=fixture(), attempts=[
      recall(f.x,f.a,"2026-10-09T09:00:00Z"),
      recall(f.y,f.b,"2026-10-09T10:00:00Z"),
    ];
    const result=g13RepairEvidence(repair("third"),route(),f.games,f.mistakes,attempts,NOW)!;
    expect(result.original).toEqual({attempted:0,clean:0});
    expect(result.independent).toEqual({positions:1,attempted:0,clean:0});
    expect(result.next).toBe("review-original");
    expect(result.laterGameId).toBeNull();
  });
  it("opens original Review, then verified independent Review, then later game",()=>{
    const f=fixture(), first=recall(f.x,f.a,"2026-10-11T10:00:00Z");
    const start=g13RepairEvidence(repair(),route(),f.games,f.mistakes,[first],NOW)!;
    expect(start.next).toBe("practice-independent");
    expect(start.practiceMistakeId).toBe("independent");
    const second=recall(f.y,f.b,"2026-10-12T10:00:00Z");
    const done=g13RepairEvidence(repair("third"),route(),f.games,f.mistakes,
      [first,second],NOW)!;
    expect(done.independent).toEqual({positions:1,attempted:1,clean:1});
    expect(done.firstIndependentCleanAt).toBe(second.occurredAt);
    expect(done.next).toBe("review-later-game");
    expect(done.laterGameId).toBe("third");
  });
  it("rejects a later import of an earlier-played human game",()=>{
    const f=fixture(), early={...f.c,date:"2026.10.11"};
    const attempts=[recall(f.x,f.a,"2026-10-11T10:00:00Z"),
      recall(f.y,f.b,"2026-10-12T10:00:00Z")];
    const state=g13RepairEvidence(repair("third"),route(),[f.a,f.b,early],
      f.mistakes,attempts,NOW)!;
    expect(state.next).toBe("await-later-game");
    expect(state.laterGameId).toBeNull();
  });
  it("rejects duplicate, future and mismatched Review attempts",()=>{
    const f=fixture(), legit=recall(f.x,f.a,"2026-10-11T10:00:00Z");
    const result=g13RepairEvidence(repair(),route(),f.games,f.mistakes,
      [legit,legit,{...legit,id:"future",occurredAt:"2026-11-02T10:00:00Z"},
       {...legit,id:"forged",positionFen:"different position"}],NOW)!;
    expect(result.original).toEqual({attempted:1,clean:1});
  });
  it("deduplicates reimported games and refuses unverifiable original positions",()=>{
    const f=fixture(), duplicate={...f.b,id:"second-copy",externalId:"other"};
    const other={...f.y,id:"other-copy",gameId:"second-copy"};
    const evidence=g13RepairEvidence(repair(),route(),
      [...f.games,duplicate],[...f.mistakes,other],
      [recall(f.x,f.a,"2026-10-11T10:00:00Z")],NOW)!;
    expect(evidence.independent.positions).toBe(1);
    const noOriginal=g13RepairEvidence(repair(),route(),
      f.games,[f.y],[],NOW)!;
    expect(noOriginal.next).toBe("await-original");
  });
  it("fails closed on future completion and invalid clock",()=>{
    const f=fixture();
    expect(g13RepairEvidence({...repair(),completedAt:"2026-12-01T00:00:00Z"},
      route(),f.games,f.mistakes,[],NOW)).toBeNull();
    expect(g13RepairEvidence(repair(),route(),f.games,f.mistakes,[],
      new Date("invalid"))).toBeNull();
  });
});
