import { describe, expect, it } from "vitest";
import { hasCompleteLessonEvidence, withLatestLessonEvidence, lessonEvidenceTotals } from "./lessonCompletionEvidence";
import { summarizeLessonMastery } from "./mastery";
import type { LessonScript, LessonStepResult } from "./types";

const fen = "8/8/8/8/8/8/8/K6k w - - 0 1";
const lesson: LessonScript = {
  id: "test-original-lesson", skillId: "tactics.skewer",
  title: "Original lesson", summary: "Independent checking",
  steps: [
    {
      id: "guided", type: "move", stage: "guided", support: "guided",
      title: "Model practice", prompt: "Try the first move", fen,
      acceptedMoves: ["a1a2"], successTitle: "Guided",
      successBody: "Explanation", hints: [{text:"Hint"}],
    },
    {
      id: "recognition", type: "choice", stage: "retrieval", support: "retrieval",
      title: "Recognition", prompt: "Choose the principle", fen,
      options: [{id:"a",text:"Yes",feedback:"Try again"}],
      correctOptionId: "a", successTitle: "Correct", successBody: "Reason",
    },
    {
      id: "transfer", type: "move", stage: "transfer", support: "transfer",
      title: "Independent transfer", prompt: "Find a different move", fen,
      acceptedMoves: ["a1a2"], successTitle: "Transfer",
      successBody: "Reason", hints: [{text:"Hint"}],
    },
    {
      id: "takeaway", type: "explain", stage: "takeaway",
      title: "Takeaway", body: "Remember the idea.", fen,
    },
  ],
};
const results: LessonStepResult[] = [
  {stepId:"guided",support:"guided",correct:true,firstTry:true,hintsUsed:0,wrongAttempts:0},
  {stepId:"recognition",support:"retrieval",correct:true,firstTry:true,hintsUsed:0,wrongAttempts:0},
  {stepId:"transfer",support:"transfer",correct:true,firstTry:true,hintsUsed:0,wrongAttempts:0},
];

describe("lesson completion and native grading authority", () => {
  it("requires each scored lesson step before granting a completion outcome", () => {
    expect(hasCompleteLessonEvidence(lesson, results)).toBe(true);
    expect(hasCompleteLessonEvidence(lesson, results.slice(0, 2))).toBe(false);
    // Mastery calculation by itself cannot detect an omitted later transfer.
    expect(summarizeLessonMastery(results.slice(0, 2)).completed).toBe(true);
    expect(hasCompleteLessonEvidence(lesson, [])).toBe(false);
  });

  it("permits honest assisted completion without misreporting independent mastery", () => {
    const helped = results.map(item => item.stepId === "transfer"
      ? {...item,firstTry:false,hintsUsed:1} : item);
    expect(hasCompleteLessonEvidence(lesson, helped)).toBe(true);
    expect(summarizeLessonMastery(helped).masteryPassed).toBe(false);
  });

  it("rejects duplicate, forged, mismatched or unsuccessful evidence", () => {
    expect(hasCompleteLessonEvidence(lesson, [results[0],results[1],results[1]])).toBe(false);
    expect(hasCompleteLessonEvidence(lesson, [...results.slice(0,2),{...results[2],stepId:"other"}])).toBe(false);
    expect(hasCompleteLessonEvidence(lesson, [...results.slice(0,2),{...results[2],support:"retrieval"}])).toBe(false);
    expect(hasCompleteLessonEvidence(lesson, [...results.slice(0,2),{...results[2],correct:false}])).toBe(false);
    expect(hasCompleteLessonEvidence(lesson, [...results.slice(0,2),{...results[2],hintsUsed:-1}])).toBe(false);
  });

  it("accepts the final solved transfer even before React commits a display render", () => {
    const rendered = results.slice(0, 2);
    expect(hasCompleteLessonEvidence(lesson, rendered)).toBe(false);
    const immediate = withLatestLessonEvidence(rendered, results[2]);
    expect(rendered).toHaveLength(2);
    expect(immediate).toHaveLength(3);
    expect(hasCompleteLessonEvidence(lesson, immediate)).toBe(true);
    expect(summarizeLessonMastery(immediate).masteryPassed).toBe(true);
  });

  it("preserves genuine hint/mistake totals and assisted mastery in the same final snapshot", () => {
    const helped = {...results[2], firstTry:false, hintsUsed:1, wrongAttempts:2};
    const immediate = withLatestLessonEvidence(results.slice(0, 2), helped);
    expect(hasCompleteLessonEvidence(lesson, immediate)).toBe(true);
    expect(summarizeLessonMastery(immediate).masteryPassed).toBe(false);
    expect(lessonEvidenceTotals(immediate)).toEqual({hintsUsed:1, wrongAttempts:2});
    expect(lessonEvidenceTotals(results.slice(0, 2))).toEqual({hintsUsed:0, wrongAttempts:0});
  });

  it("keeps one original result per step and never mutates an earlier render snapshot", () => {
    const rendered = results.slice(0, 2);
    const corrected = withLatestLessonEvidence(rendered, {...results[1], firstTry:false, wrongAttempts:3});
    expect(rendered[1].firstTry).toBe(true);
    expect(corrected).toHaveLength(2);
    expect(corrected[1].wrongAttempts).toBe(3);
    expect(hasCompleteLessonEvidence(lesson, corrected)).toBe(false);
    const finished = withLatestLessonEvidence(corrected, results[2]);
    expect(hasCompleteLessonEvidence(lesson, finished)).toBe(true);
    expect(lessonEvidenceTotals(finished).wrongAttempts).toBe(3);
  });

  it("does not turn missing, mismatched or forged evidence into earned completion", () => {
    expect(hasCompleteLessonEvidence(lesson, withLatestLessonEvidence(results.slice(0, 2),
      {...results[2], stepId:"invented"}))).toBe(false);
    expect(hasCompleteLessonEvidence(lesson, withLatestLessonEvidence(results.slice(0, 2),
      {...results[2], support:"retrieval"}))).toBe(false);
    expect(hasCompleteLessonEvidence(lesson, [])).toBe(false); // Explicit restart.
  });

});
