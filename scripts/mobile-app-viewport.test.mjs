import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { test } from "node:test";
const css=readFileSync("src/styles/mobile-app-viewport.css","utf8");
const app=readFileSync("src/App.tsx","utf8");
const learn=readFileSync("src/components/LearnView.tsx","utf8");
const main=readFileSync("src/main.tsx","utf8");
const html=readFileSync("index.html","utf8");
test("one mobile stylesheet is last and protects lesson and game controls",()=>{
  assert.ok(main.includes('import "./styles/mobile-app-viewport.css"'));
  assert.ok(main.indexOf('import "./styles/mobile-app-viewport.css"')>main.indexOf('import "./styles/p107-study.css"'));
  assert.match(css,/height:100dvh/);
  assert.match(css,/\.train-runtime-body\.board-first-sheet \.lesson-instruction > :first-child/);
  assert.match(css,/\.train-runtime-body\.board-first-sheet \.lesson-controls/);
  assert.match(css,/overflow-y:auto/);
  assert.match(css,/touch-action:manipulation/);
});
test("Train has no empty board and primary action stays above tab bar",()=>{
  assert.match(app,/\{previewFen && <div className="train-room-board-column">/);
  assert.doesNotMatch(app,/No training position is due\./);
  assert.match(css,/\.train-room-coach\s*\{[\s\S]*?order:0/);
  assert.match(css,/\.train-task-actions\s*\{[\s\S]*?position:fixed/);
});
test("course lesson and practice actions belong to the lesson action dock",()=>{
  assert.match(learn,/<div className="learn-v2-lesson-actions">[\s\S]*Begin lesson[\s\S]*Practice positions/);
  assert.match(css,/\.learn-v2-lesson-actions\s*\{[\s\S]*?display:grid;position:fixed/);
});
test("PWA manifest, touch and accessible scaling survive",()=>{
  assert.match(html,/rel="manifest"/);
  assert.match(html,/viewport-fit=cover/);
  assert.doesNotMatch(html,/user-scalable=no|maximum-scale=1/);
  const manifest=JSON.parse(readFileSync("public/manifest.webmanifest","utf8"));
  assert.equal(manifest.display,"standalone");
  for(const size of [192,512]){
    const png=readFileSync("public/icons/chess-"+size+".png");
    assert.equal(png.toString("hex",0,8),"89504e470d0a1a0a");
    assert.equal(png.readUInt32BE(16),size);
  }
});

test("adaptive policy shares the workspace rather than moving Continue below the viewport",()=>{
  assert.match(css,/\.train-runtime-body\.board-first-sheet:has\(\.lesson-runner \.lesson-stage\) \{\s*display:flex;flex-direction:column;overflow:hidden/);
  assert.match(css,/\.train-runtime-body\.board-first-sheet:has\(\.lesson-runner \.lesson-stage\) \.train-runtime-runner \{\s*flex:1 1 auto;height:auto;min-height:0/);
  assert.match(css,/\.train-runtime-body \.lesson-progress-rail \{\s*display:flex;flex-wrap:nowrap/);
});
