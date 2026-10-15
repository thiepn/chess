import { describe,expect,it } from "vitest";
import a103 from "../../public/data/calculation/p103-structures-a-v1.json";
import a105 from "../../public/data/calculation/p105-checking-networks-v1.json";
import a106 from "../../public/data/calculation/p106-active-defense-v1.json";
import a112 from "../../public/data/calculation/p112-endgame-decisions-a-v1.json";
import { skills } from "../domain/curriculum";
import type { CalculationPosition } from "../calculation/types";
import { studyMaterialFor } from "../calculation/studyDelivery";
import { level456Lens,level456FocusedQuestions,level456StudyLenses } from "./level456Inquiry";
const sources=[a103.positions[0],a105.positions[0],a106.positions[0],a112.positions[0]] as CalculationPosition[];
describe("Level 4–6 authentic curriculum reflection within original CalculationStudyPanel",()=>{
  it("provides precisely all 28 source-lens identities and distinct tactical/defensive prompts",()=>{
    const actual=skills.filter(s=>["thinking","fight","finish"].includes(s.stage)).map(s=>s.id);
    expect(actual).toHaveLength(28);
    expect(new Set(actual)).toEqual(new Set(Object.keys(level456StudyLenses)));
    for(const id of actual){
      const prompts=level456Lens(id);
      expect(prompts?.length,id).toBe(3);
      expect(new Set(prompts).size,id).toBe(3);
      expect(prompts?.every(text=>text.length>65),id).toBe(true);
    }
  });
  it("preserves original written study questions and adds three ungraded focused ones",()=>{
    for(const position of sources){
      const snapshot=JSON.stringify(position);
      const original=studyMaterialFor(position);
      const focus=position.kingAttackStudy?"attack.king-safety":position.defensiveTechniqueStudy?"defense.counterplay":
        position.endgameDecisionStudy?"endgames.rook-activity":"pawns.weaknesses";
      const enhanced=studyMaterialFor(position,focus);
      expect(enhanced?.questions.length).toBeGreaterThanOrEqual(3);
      expect(enhanced?.questions[0].prompt).toBe(level456Lens(focus)?.[0]);
      expect(enhanced?.questions[0].answer).toContain(position.explanation.trim());
      expect(enhanced?.questions[0].answer).toContain("does not certify");
      expect(enhanced?.questions.slice(3)).toEqual(original?.questions.slice(0,3));
      expect(JSON.stringify(position)).toBe(snapshot); // no source mutation
    }
  });
  it("does not upgrade private game or unrelated curriculum evidence",()=>{
    const sample=sources[0];
    expect(level456FocusedQuestions({...sample,source:"personal-game"},"calculation.candidates")).toEqual([]);
    expect(level456FocusedQuestions(sample,"tactics.pin")).toEqual([]);
    expect(level456Lens("rules.board")).toBeNull();
  });
});
