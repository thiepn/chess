import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import a103 from "../../public/data/calculation/p103-structures-a-v1.json";
import a104 from "../../public/data/calculation/p104-rooks-bishops-v1.json";
import a105 from "../../public/data/calculation/p105-checking-networks-v1.json";
import a106 from "../../public/data/calculation/p106-active-defense-v1.json";
import a109 from "../../public/data/calculation/p109-imbalances-a-v1.json";
import a110 from "../../public/data/calculation/p110-prophylaxis-a-v1.json";
import a111 from "../../public/data/calculation/p111-opening-bridges-a-v1.json";
import a112 from "../../public/data/calculation/p112-endgame-decisions-a-v1.json";
import { skillById } from "../domain/curriculum";
import type { CalculationPosition } from "./types";
import { alignSourceStudySkills, sourceStudyKind, sourceStudyTheme } from "./studySkillAlignment";

const scored = [a103,a104,a105,a106].flatMap(a=>a.positions) as CalculationPosition[];
const unscored = [a109,a110,a111,a112].flatMap(a=>a.positions) as CalculationPosition[];

describe("P103–P106 historical scores and P109–P112 unscored discovery", () => {
  it("discovers original scored case families without rewriting grade, skills, ID or board", () => {
    const kinds=["pawnStructureStudy","pieceCoordinationStudy","kingAttackStudy","defensiveTechniqueStudy"];
    for (const [index, asset] of [a103,a104,a105,a106].entries()) {
      const p=asset.positions[0] as CalculationPosition;
      expect(sourceStudyKind(p)).toBe(kinds[index]);
      expect(sourceStudyTheme(p).length).toBeGreaterThan(3);
      expect(p.assessmentStatus).toBeUndefined();
      expect(alignSourceStudySkills(p)).toBe(p);
      const original=new Chess(p.fen).fen();
      expect(new Chess(alignSourceStudySkills(p).fen).fen()).toBe(original);
    }
    expect(scored.every(p=>alignSourceStudySkills(p)===p)).toBe(true);
  });
  it("adds only subject-justified discovery tags to already-unscored sources", () => {
    const cases:[string,string][]=[["calc:p109-01","strategy.imbalances"],
      ["calc:p110-01","defense.prophylaxis"],
      ["calc:p111-01","strategy.repertoire-middlegames"],
      ["calc:p112-01","endgames.rook-activity"]];
    for (const [id,target] of cases){
      const source=unscored.find(p=>p.id===id)!;
      const found=alignSourceStudySkills(source);
      expect(found.skillIds).toContain(target);
      expect(found.assessmentStatus).toBe("instructional-only");
      expect(found.id).toBe(source.id);
      expect(found.fen).toBe(source.fen);
      expect(found.bestMove).toBe(source.bestMove);
    }
    for (const p of unscored){
      const aligned=alignSourceStudySkills(p);
      expect(aligned.skillIds.every(id=>Boolean(skillById[id]))).toBe(true);
    }
  });
  it("rejects counterfeit personal games and unauthorized scored metadata", () => {
    const s=scored[0];
    expect(sourceStudyKind({...s,source:"personal-game",id:"calc:mistake:owned"})).toBeNull();
    expect(sourceStudyKind({...s,assessmentStatus:"instructional-only"})).toBeNull();
    const p=unscored[0];
    expect(sourceStudyKind({...p,assessmentStatus:undefined})).toBeNull();
  });
});
