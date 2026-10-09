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
function png(width=1440,height=900,variant=0) {
  const bytes=Buffer.alloc(25);
  Buffer.from([137,80,78,71,13,10,26,10]).copy(bytes);
  bytes.writeUInt32BE(13,8);
  bytes.write("IHDR",12,"ascii");
  bytes.writeUInt32BE(width,16);
  bytes.writeUInt32BE(height,20);
  bytes[24]=variant;
  return bytes;
}
function run(base, environment={}) {
  return execFileSync(process.execPath,[tool,base],{
    encoding:"utf8",env:{...process.env,REVIEW_SHA:"a".repeat(40),...environment}
  });
}
test("P69C review keeps both versions, explicitly unapproved, with hashes",()=>{
  const base=setup();
  try {
    fs.writeFileSync(path.join(base,"baseline","train-desktop-linux.png"),png(1440,900,1));
    fs.writeFileSync(path.join(base,"candidate","train-desktop-linux.png"),png(1440,900,2));
    assert.match(run(base),/1 image pairs; 1 changed/);
    const manifest=JSON.parse(fs.readFileSync(path.join(base,"manifest.json"),"utf8"));
    assert.equal(manifest.status,"UNAPPROVED");
    assert.equal(manifest.commit,"a".repeat(40));
    assert.equal(manifest.images.length,1);
    assert.equal(manifest.images[0].width,1440);
    assert.equal(manifest.images[0].height,900);
    assert.equal(manifest.schema,"thiepn-chess-visual-review-v2");
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
    fs.writeFileSync(path.join(base,"candidate","play-phone-linux.png"),png());
    assert.throws(()=>run(base),/Command failed/);
    assert.equal(fs.existsSync(path.join(base,"manifest.json")),false);
  } finally {fs.rmSync(base,{recursive:true,force:true});}
});

test("P70 rejects missing/invalid immutable commit provenance",()=>{
  const base=setup();
  try {
    fs.writeFileSync(path.join(base,"baseline","train-desktop-linux.png"),png());
    fs.writeFileSync(path.join(base,"candidate","train-desktop-linux.png"),png());
    assert.throws(()=>run(base,{REVIEW_SHA:"UNKNOWN"}),/Command failed/);
    assert.equal(fs.existsSync(path.join(base,"manifest.json")),false);
  } finally {fs.rmSync(base,{recursive:true,force:true});}
});
test("P70 rejects viewport drift and corrupt screenshot files",()=>{
  const base=setup();
  try {
    fs.writeFileSync(path.join(base,"baseline","train-desktop-linux.png"),png());
    fs.writeFileSync(path.join(base,"candidate","train-desktop-linux.png"),png(393,852));
    assert.throws(()=>run(base),/Command failed/);
    fs.writeFileSync(path.join(base,"candidate","train-desktop-linux.png"),"not-a-png");
    assert.throws(()=>run(base),/Command failed/);
    assert.equal(fs.existsSync(path.join(base,"manifest.json")),false);
  } finally {fs.rmSync(base,{recursive:true,force:true});}
});
test("P70 enforces the complete approved screenshot inventory",()=>{
  const base=setup();
  try {
    fs.writeFileSync(path.join(base,"baseline","train-desktop-linux.png"),png());
    fs.writeFileSync(path.join(base,"candidate","train-desktop-linux.png"),png());
    assert.throws(()=>run(base,{REVIEW_EXPECTED_PAIRS:"18"}),/Command failed/);
    assert.equal(fs.existsSync(path.join(base,"manifest.json")),false);
  } finally {fs.rmSync(base,{recursive:true,force:true});}
});
