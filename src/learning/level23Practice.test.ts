import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import raw from "../../public/data/learning/l23-practice-v1.json";
import { lessonForSkill } from "./lessons";
import { summarizeLessonMastery } from "./mastery";
import { level23SkillIds, validateLevel23Catalog, withLevel23Practice, qualifyLevel23PuzzleSource } from "./level23Practice";

describe("Levels 2–3 genuine source-driven content expansion", () => {
  const catalog = validateLevel23Catalog(raw);
  it("preserves all 19 original skill identities with 8 opening and 11 tactical plans", () => {
    expect(catalog.size).toBe(19);
    expect(level23SkillIds).toHaveLength(19);
    expect([...catalog.values()].filter(row => row.kind === "repertoire")).toHaveLength(8);
    expect([...catalog.values()].filter(row => row.kind === "puzzle")).toHaveLength(11);
  });
  it("appends six distinct legally replayed repertoire boards to each of eight skills", () => {
    for (const [skillId,row] of catalog) {
      if (row.kind !== "repertoire") continue;
      const original = lessonForSkill(skillId,"Original","Original");
      const expanded = withLevel23Practice(original,row);
      expect(expanded.id).toBe(original.id);
      expect(expanded.steps.slice(0,original.steps.length).some(s=>s.id==="model")).toBe(true);
      const added = expanded.steps.filter(s=>s.id.startsWith("l23-practice-"));
      expect(added).toHaveLength(6);
      expect(added.map(s=>s.id)).toEqual(["l23-practice-1","l23-practice-2","l23-practice-3","l23-practice-4","l23-practice-5","l23-practice-6"]);
      expect(new Set(added.map(s=>s.fen)).size).toBe(6);
      const previous = new Set(original.steps.map(s=>s.fen));
      for (const s of added) {
        expect(previous.has(s.fen),skillId).toBe(false);
        expect(s.type).toBe("move");
        if (s.type !== "move") continue;
        const move = s.acceptedMoves[0];
        expect(new Chess(s.fen).move({from:move.slice(0,2),to:move.slice(2,4),promotion:move.slice(4)||"q"}),skillId).not.toBeNull();
        expect(s.misconceptionFeedback?.length).toBeGreaterThan(60);
        expect(s.successBody.length).toBeGreaterThan(75);
      }
      expect(added.filter(s=>s.type==="move"&&s.support==="transfer")).toHaveLength(2);
    }
  });
  it("does not award independent mastery for assisted new transfer", () => {
    const skill = "openings.center";
    const original = lessonForSkill(skill,"Original","Original");
    const expanded = withLevel23Practice(original,catalog.get(skill)!);
    const results = expanded.steps.filter(s=>s.type==="move").map(s=>({
      stepId:s.id,support:s.type==="move"?s.support:"retrieval" as const,
      correct:true,firstTry:true,hintsUsed:0,wrongAttempts:0,
    }));
    expect(summarizeLessonMastery(results).masteryPassed).toBe(true);
    expect(summarizeLessonMastery(results.map(r=>r.stepId==="l23-practice-6"?
      {...r,firstTry:false,hintsUsed:1}:r)).masteryPassed).toBe(false);
  });
  it("starts Lichess puzzle on the solver turn, not a second skipped trigger move",()=>{
    // P93 already replayed the opponent trigger when writing initialFen.
    const plan=catalog.get("tactics.knight-fork")!;
    const record={
      id:"source-test-fork",initialFen:"2q1k3/8/8/5N2/8/8/8/4K3 w - - 0 1",
      solutionMoves:["f5d6","e8d8","d6c8"],
      rating:925,popularity:100,plays:100,themes:["fork"],
      skillIds:["tactics.knight-fork"],source:"lichess" as const,
    };
    const verified=qualifyLevel23PuzzleSource(record,plan,new Set());
    expect(verified).not.toBeNull();
    expect(verified!.fen).toBe(new Chess(record.initialFen).fen());
    expect(verified!.move).toBe("f5d6");
    expect(verified!.success).toContain("Kd8");
    expect(verified!.success).toContain("Nxc8");
    expect(qualifyLevel23PuzzleSource(record,plan,new Set([record.initialFen]))).toBeNull();
    expect(qualifyLevel23PuzzleSource({...record,solutionMoves:["f5d6","e8e8"]},plan,new Set())).toBeNull();
  });
  it("fails closed when tactical corpus is absent, or source lessons/positions are repeated", () => {
    const skill="tactics.pin";
    const original=lessonForSkill(skill,"Original","Original");
    expect(()=>withLevel23Practice(original,catalog.get(skill)!,[])).toThrow();
    const changed=structuredClone(raw);
    changed.items[0].sourceIds=[changed.items[0].sourceIds[0],changed.items[0].sourceIds[0]];
    expect(()=>validateLevel23Catalog(changed)).toThrow();
    const duplicate={...original,steps:original.steps.filter(s=>s.id!=="transfer")};
    expect(()=>withLevel23Practice(duplicate,catalog.get(skill)!,[])).toThrow();
  });
});
