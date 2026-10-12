import transferContent from "../../public/data/learning/transfer-v1.json";
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
  const raw=transferContent;
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

describe("P92 authored second-transfer content and corrected alternatives", () => {
  const catalog = validateTransferCatalog(transferContent);
  const deep = [...catalog.values()].filter(entry => entry.challenge);
  it("adds 16 distinct verified positions with meaningful alternative plans", () => {
    expect(deep).toHaveLength(16);
    expect(deep.filter(entry => entry.challenge!.acceptedMoves.length > 1)).toHaveLength(8);
    for (const item of deep) {
      const challenge = item.challenge!;
      const original = lessonScripts[item.skillId];
      expect(challenge.fen, item.skillId).not.toEqual(item.fen);
      expect(challenge.fen, item.skillId).not.toEqual(original.steps[0].fen);
      const expanded = checkedTransfer(original,item);
      const transfer = expanded.steps.filter(step => step.stage === "transfer" && step.type === "move");
      expect(transfer).toHaveLength(2);
      expect(transfer[1].id).toBe("transfer-depth");
      for (const move of challenge.acceptedMoves) {
        const board = new Chess(challenge.fen);
        expect(board.move({from:move.slice(0,2),to:move.slice(2,4),
          promotion:move.slice(4)||"q"}),item.skillId+":"+move).toBeTruthy();
        expect(challenge.successByMove[move].length).toBeGreaterThan(34);
      }
    }
  });
  it("rejects illegal, repeated, or unqualified alternative-answer data", () => {
    const target = deep.find(item => item.challenge!.acceptedMoves.length > 1)!;
    const rewrite = (change: Record<string,unknown>) => ({
      ...transferContent,items:transferContent.items.map(item =>
        item.skillId === target.skillId ? {...item,challenge:{...target.challenge!,...change}} : item),
    });
    expect(() => validateTransferCatalog(rewrite({acceptedMoves:["a1a1"]}))).toThrow();
    expect(() => validateTransferCatalog(rewrite({acceptedMoves:[target.challenge!.acceptedMoves[0],
      target.challenge!.acceptedMoves[0]]}))).toThrow();
    expect(() => validateTransferCatalog(rewrite({fen:target.fen}))).toThrow();
    expect(() => validateTransferCatalog(rewrite({successByMove:{}}))).toThrow();
  });
});
