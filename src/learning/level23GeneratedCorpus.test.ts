import fs from "node:fs";
import path from "node:path";
import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import original from "../../public/data/learning/l23-practice-v1.json";
import { lessonForSkill } from "./lessons";
import { validateLevel23Catalog, withLevel23Practice } from "./level23Practice";
import type { PuzzleManifest, PuzzleRecord } from "../puzzles/types";

const dir=path.resolve("public/data/puzzles");
const manifestPath=path.join(dir,"manifest.json");
// Normal unit-test runs need not generate the checked-in CC0 corpus; the
// explicit l23:qualification command generates it before this suite.
const withCorpus=fs.existsSync(manifestPath) ? describe : describe.skip;

withCorpus("P93 generated-corpus, 114 Level 2–3 source exercise qualification",()=>{
  const source=validateLevel23Catalog(original);
  it("admits exactly six legally replayable new boards for every original Level 2–3 skill",()=>{
    const manifest=JSON.parse(fs.readFileSync(manifestPath,"utf8")) as PuzzleManifest;
    expect(manifest.license).toBe("CC0");
    expect(manifest.uniqueTotal).toBeGreaterThanOrEqual(5000);
    const stageCounts:{skillId:string;sourceCount:number;cases:number}[]=[];
    for(const [skillId,plan] of source){
      const shard=manifest.shards[skillId];
      const puzzles=plan.kind==="puzzle" ? (() => {
        expect(shard,skillId).toBeDefined();
        return JSON.parse(fs.readFileSync(path.join(dir,shard.file),"utf8")) as PuzzleRecord[];
      })() : [];
      const originalLesson=lessonForSkill(skillId,"Original lesson","Original skill");
      const expanded=withLevel23Practice(originalLesson,plan,puzzles);
      const prior=new Set(originalLesson.steps.map(step=>new Chess(step.fen).fen()));
      const practice=expanded.steps.filter(step=>step.id.startsWith("l23-practice-"));
      stageCounts.push({skillId,sourceCount:puzzles.length,cases:practice.length});
      expect(practice,skillId).toHaveLength(6);
      const ids=new Set<string>(),fens=new Set<string>();
      for(const step of practice){
        expect(step.type).toBe("move");
        if(step.type!=="move")continue;
        expect(ids.has(step.id),skillId).toBe(false);ids.add(step.id);
        const canonicalFen=new Chess(step.fen).fen();
        expect(prior.has(canonicalFen),skillId).toBe(false);
        expect(fens.has(canonicalFen),skillId).toBe(false);fens.add(canonicalFen);
        expect(step.acceptedMoves).toHaveLength(1);
        const uci=step.acceptedMoves[0],board=new Chess(step.fen);
        const move=board.move({from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci.slice(4)||"q"});
        expect(move,skillId+" "+step.id).not.toBeNull();
        expect(step.successBody.length,skillId).toBeGreaterThan(60);
        expect(step.misconceptionFeedback?.length,skillId).toBeGreaterThan(60);
        if(plan.kind==="puzzle"){
          expect(new Set(puzzles.map(p=>new Chess(p.initialFen).fen())).has(canonicalFen),skillId).toBe(true);
          expect(step.successBody,skillId).toContain("Recorded source line");
        }
      }
      expect(practice.filter(s=>s.type==="move"&&s.support==="transfer"),skillId).toHaveLength(2);
    }
    expect(stageCounts).toHaveLength(19);
    expect(stageCounts.reduce((n,s)=>n+s.cases,0)).toBe(114);
  });
});
