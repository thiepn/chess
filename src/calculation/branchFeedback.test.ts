import {describe,it,expect} from "vitest";
import {authoredPositions} from "./positions";
import {legalCalculationBranch,calculationMisconceptions} from "./branchFeedback";
import {scoreCalculationAttempt} from "./scoring";

describe("P90 authored multi-ply calculation authority",()=>{
  it("replays every original P90 continuation with legal checks and captures",()=>{
    const added=authoredPositions.filter(p=>p.id.startsWith("calc:") &&
      p.sourceLabel==="Original P90 calculation study");
    expect(added).toHaveLength(4);
    for(const item of added){
      const steps=legalCalculationBranch(item);
      expect(steps?.length,item.id).toBe(3);
      expect(steps?.map(m=>m.actor)).toEqual(["learner","opponent","learner"]);
      expect(steps?.[0].uci,item.id).toBe(item.bestMove);
      expect(steps?.[1].san,item.id).toBeTruthy();
      expect(item.replyReason?.length,item.id).toBeGreaterThan(40);
      expect(item.continuationReason?.length,item.id).toBeGreaterThan(25);
    }
  });
  it("rejects malformed PV, mismatched best move and impossible replies",()=>{
    const sample=authoredPositions[0];
    expect(legalCalculationBranch({...sample,bestMove:"a1a1"})).toBeNull();
    expect(legalCalculationBranch({...sample,principalVariation:[sample.bestMove,"a1a1","a1a1"]})).toBeNull();
    expect(legalCalculationBranch({...sample,playerColor:sample.playerColor==="w"?"b":"w"})).toBeNull();
  });
  it("diagnoses reply and continuation independently of main-move success",()=>{
    const p=authoredPositions.find(p=>p.id==="calc:rook-cutoff")!;
    const grade=scoreCalculationAttempt({positionId:p.id,source:"authored",
      candidates:[{uci:p.bestMove,san:"Rc8+"}],selectedMove:p.bestMove,bestMove:p.bestMove,
      predictedReply:"e8d7",bestReply:p.principalVariation[1],
      predictedContinuation:"c8c7",bestContinuation:p.principalVariation[2],
      visualizationUsed:true});
    expect(grade.success).toBe(false);
    const guidance=calculationMisconceptions(p,grade.evidence);
    expect(guidance.join(" ")).toContain("Opponent reply");
    expect(guidance.join(" ")).not.toContain("Main move:");
  });
});
