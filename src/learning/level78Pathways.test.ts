import {describe,it,expect} from "vitest";
import pairs from "../../public/data/model-games/p114-transfer-cases-v1.json";
import {skills} from "../domain/curriculum";
import {level78Guides,level78Guide,level78AdvancedCases,level78GameMissions,pairIdsForSkill} from "./level78Pathways";
import a109 from "../../public/data/calculation/p109-imbalances-a-v1.json";
import a110 from "../../public/data/calculation/p110-prophylaxis-a-v1.json";
import a112 from "../../public/data/calculation/p112-endgame-decisions-a-v1.json";
import {endgamePositions} from "../endgames/positions";
import type {CalculationPosition} from "../calculation/types";
import type {TransferMission} from "../review/gameTransfer";
const cases=[a109,a110,a112].flatMap(x=>x.positions) as CalculationPosition[];
describe("Levels 7–8 original transfer paths",()=>{
  it("covers 23 original curricula with grounded P114 comparative source IDs",()=>{
    const ids=skills.filter(s=>s.stage==="practical"||s.stage==="advanced").map(s=>s.id);
    expect(ids).toHaveLength(23);
    expect(new Set(ids)).toEqual(new Set(Object.keys(level78Guides)));
    const official=new Set(pairs.cases.map(x=>x.id));
    for(const id of ids){
      const g=level78Guide(id)!;
      expect(g.prompts).toHaveLength(3);
      expect(new Set(g.prompts).size).toBe(3);
      expect(g.masterPairIds.length).toBeGreaterThan(0);
      expect(g.masterPairIds.every(p=>official.has(p)),id).toBe(true);
      expect(pairIdsForSkill(id)).toEqual(g.masterPairIds);
    }
    expect(level78Guide("rules.board")).toBeNull();
  });
  it("offers verified authored advanced source positions without duplicating or rewriting source IDs",()=>{
    const c=level78AdvancedCases("strategy.imbalances",cases,endgamePositions);
    expect(c.length).toBeGreaterThan(0);
    expect(new Set(c.map(x=>x.id)).size).toBe(c.length);
    expect(c.every(x=>x.position.id===x.id)).toBe(true);
    const privatePosition={...cases[0],id:"calc:owner-private",source:"personal-game" as const};
    expect(level78AdvancedCases("strategy.imbalances",[privatePosition],[])).toEqual([]);
    expect(level78AdvancedCases("practical.time",cases,endgamePositions)).toEqual([]);
  });
  it("links only already-qualified owner Review missions and labels indirect associations",()=>{
    const m:TransferMission={mistakeId:"one",gameId:"g",gameLabel:"Player A — Player B",
      skillId:"calculation.candidates",skillIds:["calculation.candidates"],errorType:"calculation-failure",
      lane:"calculation",moveNumber:14,actualSan:"Qd2",lineLength:3,due:true,question:"Find reply",
      priority:5,cleanReturns:1,spacedCleanPairs:0,assistedReturns:0,missedReturns:0,
      nextReviewAt:"2026-10-12T00:00:00Z"};
    const mapped=level78GameMissions("practical.post-move-check",[m]);
    expect(mapped).toHaveLength(1);
    expect(mapped[0].direct).toBe(false);
    expect(level78GameMissions("practical.time",[m])).toHaveLength(0);
    expect(level78GameMissions("rules.board",[m])).toHaveLength(0);
  });
});
