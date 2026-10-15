import { describe,expect,it } from "vitest";
import a103 from "../../public/data/calculation/p103-structures-a-v1.json";
import a104 from "../../public/data/calculation/p104-rooks-bishops-v1.json";
import a105 from "../../public/data/calculation/p105-checking-networks-v1.json";
import a106 from "../../public/data/calculation/p106-active-defense-v1.json";
import a109 from "../../public/data/calculation/p109-imbalances-a-v1.json";
import a112 from "../../public/data/calculation/p112-endgame-decisions-a-v1.json";
import { endgamePositions } from "../endgames/positions";
import type { CalculationPosition } from "../calculation/types";
import { level456Pathways } from "./level456Pathways";
const positions=[a103,a104,a105,a106,a109,a112].flatMap(a=>a.positions) as CalculationPosition[];

describe("original Levels 4–6 training paths",()=>{
  it("uses original case IDs and source authority instead of cloning lesson evidence",()=>{
    for(const skill of ["calculation.candidates","attack.king-safety","defense.counterplay","endgames.queen-mate"]){
      const cases=level456Pathways(skill,positions,endgamePositions);
      expect(cases.length,skill).toBeGreaterThan(0);
      expect(new Set(cases.map(c=>c.id)).size).toBe(cases.length);
      for(const c of cases){
        expect(c.position.id).toBe(c.id);
        expect(c.position.fen.length).toBeGreaterThan(15);
        if(c.kind==="calculation") {
          // Historical scores belong to their original skill, not a related theme.
          expect(c.assessed).toBe(c.direct && c.position.assessmentStatus!=="instructional-only");
          if (!c.direct) expect(c.assessed).toBe(false);
        }
        if(!c.direct)expect(c.kind).toBe("calculation");
      }
    }
  });
  it("uses actual endgame objective and never labels contextual studies direct mastery",()=>{
    const cases=level456Pathways("endgames.queen-mate",positions,endgamePositions);
    expect(cases[0]?.kind).toBe("endgame");
    expect(cases[0]?.assessed).toBe(true);
    expect(level456Pathways("attack.king-safety",positions,endgamePositions).some(p=>!p.direct)).toBe(true);
  });
  it("never surfaces private game-derived positions as public-course authored cases",()=>{
    const reference=positions[0];
    const privateCase={...reference,id:"calc:mistake:owner",source:"personal-game" as const};
    expect(level456Pathways("calculation.candidates",[privateCase],[])).toEqual([]);
  });
  it("leaves other curriculum levels outside this study pathway",()=>{
    expect(level456Pathways("rules.board",positions,endgamePositions)).toEqual([]);
    expect(level456Pathways("tactics.pin",positions,endgamePositions)).toEqual([]);
  });
});
