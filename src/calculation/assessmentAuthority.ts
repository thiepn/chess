import type { CalculationPosition } from "./types";
import type { TrainingActivity } from "../domain/types";

/** Scoring remains source-owned. Related course cases are instructional-only;
 * source identity and legacy grading never change. */
export function isInstructionalCalculation(
 activity:Pick<TrainingActivity,"calculationPositionId"|"courseContextOnly"|"courseDefenderPractice"|"courseCandidatePractice">,
 position:Pick<CalculationPosition,"id"|"assessmentStatus">,
):boolean {
 return position.assessmentStatus==="instructional-only" ||
   ((activity.courseContextOnly===true || activity.courseDefenderPractice===true || activity.courseCandidatePractice===true) &&
    activity.calculationPositionId===position.id);
}
