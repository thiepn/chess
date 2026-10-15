import { describe,expect,it } from "vitest";
import a103 from "../../public/data/calculation/p103-structures-a-v1.json";
import p103b from "../../public/data/calculation/p103-structures-b-v1.json";
import p104knights from "../../public/data/calculation/p104-knight-harmony-v1.json";
import p105shelter from "../../public/data/calculation/p105-shelter-prophylaxis-v1.json";
import p106king from "../../public/data/calculation/p106-king-fortress-v1.json";
import p106queen from "../../public/data/calculation/p106-queen-counterplay-v1.json";
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
  it("plays original positional and defensive themes without manufacturing grade credit",()=>{
    const suites=[
      ["strategy.open-files",a104.positions,6],
      ["strategy.outposts",p104knights.positions,6],
      ["pawns.breaks",p103b.positions,10],
      ["pawns.weaknesses",a103.positions,10],
      ["attack.mating-net",[...a105.positions,...p105shelter.positions],6],
      ["defense.exchange-attackers",[...p106king.positions,...p106queen.positions],9],
    ] as const;
    for(const [skill,assets,minimum] of suites){
      const chosen=level456Pathways(skill,assets as CalculationPosition[],endgamePositions,12);
      expect(chosen.length,skill).toBeGreaterThanOrEqual(minimum);
      expect(new Set(chosen.map(s=>s.position.fen)).size,skill).toBe(chosen.length);
      expect(chosen.every(s=>!s.assessed&&!s.direct),skill).toBe(true);
      expect(chosen.every(s=>s.kind==="calculation"),skill).toBe(true);
    }
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
