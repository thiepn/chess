import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import {verifyVisualFiles,REQUIRED_NAMES} from "./p73-verify-visual-artifact.mjs";

const SHA="a".repeat(40);
const hash=bytes=>crypto.createHash("sha256").update(bytes).digest("hex");
function image(name,marker){
  const b=Buffer.alloc(64);
  Buffer.from([137,80,78,71,13,10,26,10]).copy(b);
  b.writeUInt32BE(13,8);b.write("IHDR",12,"ascii");
  b.writeUInt32BE(name.includes("-phone-")?393:1440,16);
  b.writeUInt32BE(name.includes("-phone-")?852:900,20);
  b[40]=marker;return b;
}
function fixture(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"chess-p73-integrity-"));
  for(const side of ["baseline","candidate"])fs.mkdirSync(path.join(dir,side));
  const images=REQUIRED_NAMES.map((name,i)=>{
    const before=image(name,i),after=image(name,i<12?i+100:i);
    fs.writeFileSync(path.join(dir,"baseline",name),before);
    fs.writeFileSync(path.join(dir,"candidate",name),after);
    return {name,width:name.includes("-phone-")?393:1440,
      height:name.includes("-phone-")?852:900,baselineSha256:hash(before),
      candidateSha256:hash(after),baselineBytes:before.length,
      candidateBytes:after.length,changed:i<12};
  });
  const manifest={schema:"thiepn-chess-visual-review-v2",
    commit:SHA,status:"UNAPPROVED",createdAt:"2026-10-09T10:00:00Z",images};
  return {dir,manifest};
}
test("P73 independently re-hashes all 36 PNGs and never approves them",()=>{
  const {dir,manifest}=fixture();
  try{
    const report=verifyVisualFiles(manifest,dir,SHA);
    assert.equal(report.total,18);assert.equal(report.changed,12);
    assert.equal(report.status,"UNAPPROVED");assert.equal(report.releaseAuthorization,false);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test("P73 rejects stale PR head and missing, substituted or extra images",()=>{
  const {dir,manifest}=fixture();
  try{
    assert.throws(()=>verifyVisualFiles(manifest,dir,"b".repeat(40)),/exact PR head/);
    const original=manifest.images[0].name;
    fs.renameSync(path.join(dir,"candidate",original),path.join(dir,"candidate","not-a-scenario.png"));
    assert.throws(()=>verifyVisualFiles(manifest,dir,SHA));
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test("P73 rejects modified candidate bytes even when manifest is unchanged",()=>{
  const {dir,manifest}=fixture();
  try{
    const n=manifest.images[4].name;
    const p=path.join(dir,"candidate",n);
    const content=fs.readFileSync(p);content[40]^=0xff;fs.writeFileSync(p,content);
    assert.throws(()=>verifyVisualFiles(manifest,dir,SHA),/do not match/);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test("P73 rejects forged manifest hashes and altered viewport metadata",()=>{
  const {dir,manifest}=fixture();
  try{
    const clone=structuredClone(manifest);clone.images[2].candidateSha256="f".repeat(64);
    assert.throws(()=>verifyVisualFiles(clone,dir,SHA));
    const other=structuredClone(manifest);other.images[2].width=1;
    assert.throws(()=>verifyVisualFiles(other,dir,SHA));
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test("P73 rejects non-PNG input and symbolic links",()=>{
  const {dir,manifest}=fixture();
  try{
    const p=path.join(dir,"candidate",manifest.images[0].name);
    fs.writeFileSync(p,Buffer.from("not a valid PNG"));
    assert.throws(()=>verifyVisualFiles(manifest,dir,SHA));
    fs.unlinkSync(p);
    fs.symlinkSync(path.join(dir,"baseline",manifest.images[0].name),p);
    assert.throws(()=>verifyVisualFiles(manifest,dir,SHA));
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test("P73 enforces real screenshot scenario names, not just count 18",()=>{
  const {dir,manifest}=fixture();
  try{
    manifest.images[0].name="fabricated-desktop-linux.png";
    assert.throws(()=>verifyVisualFiles(manifest,dir,SHA),/substituted/);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
