import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const tool = path.resolve("scripts/build-visual-review.mjs");
function setup() {
  const base=fs.mkdtempSync(path.join(os.tmpdir(),"p69c-review-"));
  fs.mkdirSync(path.join(base,"baseline"));
  fs.mkdirSync(path.join(base,"candidate"));
  return base;
}
function run(base) {
  return execFileSync(process.execPath,[tool,base],{
    encoding:"utf8",env:{...process.env,REVIEW_SHA:"a".repeat(40)}
  });
}
test("P69C review keeps both versions, explicitly unapproved, with hashes",()=>{
  const base=setup();
  try {
    fs.writeFileSync(path.join(base,"baseline","train-desktop-linux.png"),"original");
    fs.writeFileSync(path.join(base,"candidate","train-desktop-linux.png"),"changed");
    assert.match(run(base),/1 image pairs; 1 changed/);
    const manifest=JSON.parse(fs.readFileSync(path.join(base,"manifest.json"),"utf8"));
    assert.equal(manifest.status,"UNAPPROVED");
    assert.equal(manifest.commit,"a".repeat(40));
    assert.equal(manifest.images.length,1);
    assert.notEqual(manifest.images[0].baselineSha256,manifest.images[0].candidateSha256);
    const html=fs.readFileSync(path.join(base,"index.html"),"utf8");
    assert.match(html,/Previously approved reference/);
    assert.match(html,/New candidate — NOT APPROVED/);
    assert.match(html,/train-desktop-linux\.png/);
  } finally {fs.rmSync(base,{recursive:true,force:true});}
});
test("P69C review fails if a new route has no original golden screenshot",()=>{
  const base=setup();
  try {
    fs.writeFileSync(path.join(base,"candidate","play-phone-linux.png"),"only candidate");
    assert.throws(()=>run(base),/Command failed/);
    assert.equal(fs.existsSync(path.join(base,"manifest.json")),false);
  } finally {fs.rmSync(base,{recursive:true,force:true});}
});
