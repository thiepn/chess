import {describe,it,expect} from "vitest";
import pairs from "../../public/data/model-games/p114-transfer-cases-v1.json";
import {skills} from "../domain/curriculum";
import {level78Guides,level78Guide,level78AdvancedCases,level78GameMissions,pairIdsForSkill,originalPracticalSourceMatch} from "./level78Pathways";
import a109 from "../../public/data/calculation/p109-imbalances-a-v1.json";
import a110 from "../../public/data/calculation/p110-prophylaxis-a-v1.json";
import a112 from "../../public/data/calculation/p112-endgame-decisions-a-v1.json";
import {endgamePositions} from "../endgames/positions";
import type {CalculationPosition} from "../calculation/types";
import type {TransferMission} from "../review/gameTransfer";
import {studyMaterialFor} from "../calculation/studyDelivery";
import p103 from "../../public/data/calculation/p103-structures-a-v1.json";
import p104 from "../../public/data/calculation/p104-knight-harmony-v1.json";
import p104Plans from "../../public/data/calculation/p104-practical-plans-v1.json";
import p105 from "../../public/data/calculation/p105-initiative-resistance-v1.json";
import {originalAdvancedThemeMatch} from "./advancedThemeMatch";
import a94 from "../../public/data/calculation/p94-candidates-v1.json";
import a104Plans from "../../public/data/calculation/p104-practical-plans-v1.json";
import a105Checking from "../../public/data/calculation/p105-checking-networks-v1.json";
import a106Defense from "../../public/data/calculation/p106-active-defense-v1.json";
import a109B from "../../public/data/calculation/p109-imbalances-b-v1.json";
import a110B from "../../public/data/calculation/p110-prophylaxis-b-v1.json";
import a111Opening from "../../public/data/calculation/p111-opening-bridges-a-v1.json";
import a112Decisions from "../../public/data/calculation/p112-endgame-decisions-a-v1.json";
import {hydrateOpeningTransition} from "../openings/transitionStudy";
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
  it("routes three advanced source-based, unscored questions through the original study panel",()=>{
    const source=cases[0],snapshot=JSON.stringify(source);
    const advanced=studyMaterialFor(source,"strategy.imbalances");
    const baseline=studyMaterialFor(source);
    expect(advanced?.questions[0].prompt).toBe(level78Guide("strategy.imbalances")?.prompts[0]);
    expect(advanced?.questions[0].answer).toContain(source.explanation);
    expect(advanced?.questions[0].answer).toContain("other legal moves have not been proved inferior");
    expect(advanced?.questions.slice(3)).toEqual(baseline?.questions.slice(0,3));
    expect(JSON.stringify(source)).toBe(snapshot);
    expect(studyMaterialFor({...source,source:"personal-game"},"strategy.imbalances")).toEqual(studyMaterialFor({...source,source:"personal-game"}));
  });
  it("qualifies real advanced pawn structures from original P103 author themes",()=>{
    const original=p103.positions as CalculationPosition[];
    const expected=[
      ["pawns.iqp","Isolated queen's pawn"],
      ["pawns.hanging","Hanging c- and d-pawns"],
      ["pawns.minority","Carlsbad minority attack"],
    ] as const;
    for(const [skill,theme] of expected){
      const chosen=level78AdvancedCases(skill,original,[]);
      expect(chosen.length,skill).toBe(5);
      expect(chosen.every(p=>p.kind==="calculation" && !p.assessed && !p.direct),skill).toBe(true);
      expect(chosen.every(p=>(p.position as CalculationPosition & {pawnStructureStudy?:{theme?:string}}).pawnStructureStudy?.theme===theme),skill).toBe(true);
      expect(new Set(chosen.map(p=>p.position.fen)).size,skill).toBe(5);
    }
    expect(level78AdvancedCases("strategy.bishop-vs-knight",p104.positions as CalculationPosition[],[]).length).toBeGreaterThan(0);
    const exchanges=level78AdvancedCases("strategy.exchanges",p104Plans.positions as CalculationPosition[],[]);
    expect(exchanges.length).toBe(3);
    expect(exchanges.every(c=>!c.direct&&!c.assessed)).toBe(true);
    const restrictions=level78AdvancedCases("strategy.restriction",
      [...p104.positions,...p104Plans.positions] as CalculationPosition[],[]);
    expect(restrictions.length).toBeGreaterThanOrEqual(6);
    expect(restrictions.every(c=>!c.assessed)).toBe(true);
    const complexity=level78AdvancedCases("practical.complications",
      p105.positions as CalculationPosition[],[]);
    expect(complexity.length).toBeGreaterThanOrEqual(6);
    expect(complexity.every(c=>c.kind==="calculation" && !c.direct && !c.assessed)).toBe(true);
    const privateCase={...original[0],source:"personal-game" as const};
    expect(originalAdvancedThemeMatch("pawns.iqp",privateCase)).toBe(false);
    expect(originalAdvancedThemeMatch("pawns.iqp",original[0])).toBe(true);
  });
  it("makes all five Level 7 practical topics independently playable with original unscored source boards",()=>{
    const sources={
      "practical.time":a94.positions as CalculationPosition[],
      "practical.plan":[...a104Plans.positions,...a109B.positions] as CalculationPosition[],
      "practical.transition":[
        ...a111Opening.positions.map(p=>hydrateOpeningTransition(p as CalculationPosition)),
        ...a112Decisions.positions,
      ].filter((p):p is CalculationPosition=>Boolean(p)),
      "practical.post-move-check":[...a105Checking.positions,...a106Defense.positions] as CalculationPosition[],
      "practical.resilience":[...a106Defense.positions,...a110B.positions] as CalculationPosition[],
    };
    expect(a111Opening.positions.every(p=>hydrateOpeningTransition(p as CalculationPosition)!==null)).toBe(true);
    const minimums={
      "practical.time":12,"practical.plan":8,"practical.transition":12,
      "practical.post-move-check":12,"practical.resilience":12,
    };
    for(const skill of Object.keys(sources) as (keyof typeof sources)[]){
      const positions=sources[skill],snapshot=JSON.stringify(positions);
      const chosen=level78AdvancedCases(skill,positions,[],12);
      expect(chosen.length,skill).toBeGreaterThanOrEqual(minimums[skill]);
      expect(chosen.length,skill).toBeLessThanOrEqual(12);
      expect(new Set(chosen.map(c=>c.id)).size,skill).toBe(chosen.length);
      expect(new Set(chosen.map(c=>c.position.fen)).size,skill).toBe(chosen.length);
      expect(chosen.every(c=>c.kind==="calculation"&&!c.direct&&!c.assessed),skill).toBe(true);
      expect(chosen.every(c=>c.position.source==="authored"&&
        originalPracticalSourceMatch(skill,c.position)),skill).toBe(true);
      expect(chosen.every(c=>c.topic.includes("no recorded clock data")||
        c.topic.startsWith("Unscored practical decision transfer")),skill).toBe(true);
      expect(JSON.stringify(positions),skill).toBe(snapshot);
    }
    const original=a94.positions[0] as CalculationPosition;
    expect(originalPracticalSourceMatch("practical.time",{...original,source:"personal-game"})).toBe(false);
    const material=studyMaterialFor(original,"practical.time");
    expect(material?.questions.slice(0,3).map(q=>q.prompt))
      .toEqual(level78Guide("practical.time")?.prompts);
    expect(material?.questions[0].answer).toContain(original.explanation);
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
