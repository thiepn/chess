import { readFileSync } from "node:fs";
import { checkedTransfer, validateTransferCatalog } from "./transferCompletion";
import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import {
  deepTransferSkillIds,
  lessonCatalogIssues,
  lessonScripts,
} from "./lessons";

describe("lesson scripts", () => {
  it("passes the full lesson-content audit", () => {
    expect(lessonCatalogIssues()).toEqual([]);
  });

  it("uses the full teaching sequence for every authored skill", () => {
    for (const lesson of Object.values(lessonScripts)) {
      expect(lesson.steps.length, lesson.id).toBeGreaterThanOrEqual(8);

      const stages = new Set(
        lesson.steps.map((step) => step.stage),
      );
      for (const stage of [
        "model",
        "example",
        "contrast",
        "guided",
        "retrieval",
        "transfer",
        "takeaway",
      ] as const) {
        expect(stages.has(stage), `${lesson.id}: ${stage}`).toBe(true);
      }
    }
  });

  it("contains valid FEN positions", () => {
    for (const lesson of Object.values(lessonScripts)) {
      for (const step of lesson.steps) {
        expect(
          () => new Chess(step.fen),
          `${lesson.id}/${step.id}`,
        ).not.toThrow();
      }
    }
  });

  it("contains legal accepted moves", () => {
    for (const lesson of Object.values(lessonScripts)) {
      for (const step of lesson.steps) {
        if (step.type !== "move") continue;

        for (const encoded of step.acceptedMoves) {
          const chess = new Chess(step.fen);
          const from = encoded.slice(0, 2);
          const to = encoded.slice(2, 4);
          const promotion =
            encoded.slice(4, 5) || undefined;

          expect(
            chess.move({
              from,
              to,
              promotion: promotion || "q",
            }),
            `${lesson.id}/${step.id}: ${encoded}`,
          ).toBeTruthy();
        }
      }
    }
  });

  it("uses escalating hints instead of immediately revealing every move", () => {
    for (const lesson of Object.values(lessonScripts)) {
      for (const step of lesson.steps) {
        if (step.type !== "move") continue;

        expect(
          step.hints.length,
          `${lesson.id}/${step.id}`,
        ).toBeGreaterThanOrEqual(2);

        const first = step.hints[0].text.toLowerCase();
        const accepted = step.acceptedMoves[0];
        expect(
          first.includes(accepted.slice(0, 2)) &&
            first.includes(accepted.slice(2, 4)),
          `${lesson.id}/${step.id}: first hint reveals coordinates`,
        ).toBe(false);
      }
    }
  });

  it("gives misconception choices explicit feedback", () => {
    for (const lesson of Object.values(lessonScripts)) {
      const choiceSteps = lesson.steps.filter(
        (step) => step.type === "choice",
      );

      expect(choiceSteps.length, lesson.id).toBeGreaterThanOrEqual(2);
      for (const step of choiceSteps) {
        expect(step.options.length).toBeGreaterThanOrEqual(3);
        expect(
          step.options.every(
            (option) => option.feedback.trim().length > 20,
          ),
        ).toBe(true);
      }
    }
  });

  it("uses a distinct transfer position for the prioritized deep-content skills", () => {
    for (const skillId of deepTransferSkillIds) {
      const lesson = lessonScripts[skillId];
      const model = lesson.steps.find(
        (step) => step.stage === "model",
      );
      const transfer = lesson.steps.find(
        (step) => step.stage === "transfer",
      );

      expect(model, skillId).toBeTruthy();
      expect(transfer, skillId).toBeTruthy();
      expect(transfer?.fen, skillId).not.toBe(model?.fen);
    }
  });
});

describe("P88 original independent transfer curriculum", () => {
  const raw=JSON.parse(readFileSync("public/data/learning/transfer-v1.json","utf8"));
  const catalog=validateTransferCatalog(raw);
  const uncovered=Object.keys(lessonScripts).filter(id=>!deepTransferSkillIds.includes(id));
  it("covers exactly the 49 previously same-position retrieval lessons",()=>{
    expect(uncovered).toHaveLength(49);
    expect([...catalog.keys()].sort()).toEqual([...uncovered].sort());
  });
  it("loads legal distinct authored positions and leaves originals intact",()=>{
    for(const skillId of uncovered){
      const lesson=lessonScripts[skillId];
      const entry=catalog.get(skillId)!;
      const improved=checkedTransfer(lesson,entry);
      const model=lesson.steps.find(x=>x.id==="model")!;
      const replacement=improved.steps.find(x=>x.id==="transfer");
      expect(replacement?.type,skillId).toBe("move");
      if(replacement?.type!=="move")throw new Error(skillId);
      expect(replacement.support).toBe("transfer");
      expect(replacement.fen,skillId).not.toBe(model.fen);
      expect(replacement.hints).toHaveLength(3);
      expect(replacement.misconceptionFeedback?.length,skillId).toBeGreaterThan(25);
      const chess=new Chess(replacement.fen);
      const encoded=replacement.acceptedMoves[0];
      expect(chess.move({from:encoded.slice(0,2),to:encoded.slice(2,4),
        promotion:encoded.slice(4,5)||"q"}),skillId).toBeTruthy();
      expect(lesson.steps.find(x=>x.id==="transfer")?.fen,skillId).toBe(model.fen);
    }
  });
  it("fails closed on tampered, incomplete, stale or repeated transfer data",()=>{
    expect(()=>validateTransferCatalog({...raw,schema:"wrong"})).toThrow();
    expect(()=>validateTransferCatalog({...raw,items:raw.items.slice(1)})).toThrow();
    expect(()=>validateTransferCatalog({...raw,items:[...raw.items.slice(0,-1),raw.items[0]]})).toThrow();
    const first=catalog.get(uncovered[0])!;
    expect(()=>checkedTransfer(lessonScripts[uncovered[0]],{...first,
      fen:lessonScripts[uncovered[0]].steps[0].fen})).toThrow();
    expect(()=>checkedTransfer(lessonScripts[uncovered[0]],{...first,
      acceptedMove:"a1a1"})).toThrow();
  });
});
