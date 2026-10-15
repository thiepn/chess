import {describe,it,expect} from "vitest";
import historical from "../../public/data/calculation/p103-structures-a-v1.json";
import later from "../../public/data/calculation/p109-imbalances-a-v1.json";
import { isInstructionalCalculation } from "./assessmentAuthority";
import type { CalculationPosition } from "./types";
import type { TrainingActivity } from "../domain/types";
const original=historical.positions[0] as CalculationPosition;
const unscored=later.positions[0] as CalculationPosition;
const context=(courseContextOnly:boolean,position=original):TrainingActivity=>({
 id:"course:test",source:"curriculum",skillIds:[position.skillIds[0]],
 activityType:"calculation",calculationPositionId:position.id,
 courseFocusSkillId:"pawns.iqp",courseContextOnly,estimatedMinutes:10,
 priority:1,difficulty:4,novelty:0,urgency:0,reason:"source test",
 title:"Test original board",subtitle:"",
});
describe("advanced contextual practice retains original grade and privacy authority",()=>{
 it("never grades contextual P103 practice but preserves native scored P103",()=>{
   expect(original.assessmentStatus).toBeUndefined();
   expect(isInstructionalCalculation(context(true),original)).toBe(true);
   expect(isInstructionalCalculation(context(false),original)).toBe(false);
   expect(isInstructionalCalculation({...context(true),calculationPositionId:"calc:other"},original)).toBe(false);
   expect(isInstructionalCalculation(context(false,unscored),unscored)).toBe(true);
 });
 it("cannot mutate any original scored source",()=>{
   const snapshot=JSON.stringify(original);
   isInstructionalCalculation(context(true),original);
   expect(JSON.stringify(original)).toBe(snapshot);
 });
});
