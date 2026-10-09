import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import {verifyOfflineCandidatePackage} from "./p76-release-rehearsal.mjs";
import {verifyRecoveredOffline} from "./p77-recovery-verifier.mjs";
const SHA="a".repeat(40);
const hash=s=>crypto.createHash("sha256").update(s).digest("hex");
function fixture() {
  const base=fs.mkdtempSync(path.join(os.tmpdir(),"chess-p77-recovery-"));
  for(const d of ["dist/.vite","dist/assets","candidate-evidence"])fs.mkdirSync(path.join(base,d),{recursive:true});
  const names=["dist/index.html","dist/404.html","dist/.vite/manifest.json","dist/assets/chess.js"];
  for(const name of names)fs.writeFileSync(path.join(base,name),"P77 immutable fixture "+name);
  fs.writeFileSync(path.join(base,"candidate-evidence/SHA256SUMS.txt"),
    names.map(n=>hash(fs.readFileSync(path.join(base,n)))+"  "+n).join("\n")+"\n");
  fs.writeFileSync(path.join(base,"candidate-evidence/RELEASE-CANDIDATE.txt"),[
    "candidate_sha="+SHA,"candidate_type=OFFLINE_PREVIEW_ONLY",
    "authenticated_sync=NOT_QUALIFIED","production_deploy=NO",
    "node=v22.0.0","npm=10.0.0"
  ].join("\n")+"\n");
  const rec=verifyOfflineCandidatePackage(base,SHA);
  fs.writeFileSync(path.join(base,"candidate-evidence/P76-OFFLINE-REHEARSAL.json"),
    JSON.stringify(rec,null,2)+"\n");
  return base;
}
test("P77 rechecks every downloaded byte, including hidden manifest and prior receipt",()=>{
  const base=fixture();
  try {
    const result=verifyRecoveredOffline(base,SHA);
    assert.equal(result.verifiedFiles,4);
    assert.equal(result.verifiedHiddenManifest,true);
    assert.equal(result.preUploadReceiptReconciled,true);
    assert.equal(result.downloadedArtifactBytesRehashed,true);
    assert.equal(result.productionRollbackExecuted,false);
    assert.equal(result.humanVisualApproval,false);
    assert.equal(result.releaseAuthorized,false);
  }finally{fs.rmSync(base,{recursive:true,force:true});}
});
test("P77 refuses stale source, altered downloaded bytes and missing hidden manifest",()=>{
  const base=fixture();
  try {
    assert.throws(()=>verifyRecoveredOffline(base,"b".repeat(40)),/stale/);
    fs.appendFileSync(path.join(base,"dist/assets/chess.js"),"modified");
    assert.throws(()=>verifyRecoveredOffline(base,SHA),/SHA-256 mismatch/);
    fs.writeFileSync(path.join(base,"dist/assets/chess.js"),"P77 immutable fixture dist/assets/chess.js");
    fs.unlinkSync(path.join(base,"dist/.vite/manifest.json"));
    assert.throws(()=>verifyRecoveredOffline(base,SHA));
  }finally{fs.rmSync(base,{recursive:true,force:true});}
});
test("P77 rejects tampered provenance and claims of release authorization",()=>{
  const base=fixture();
  try{
    const name=path.join(base,"candidate-evidence/P76-OFFLINE-REHEARSAL.json");
    const data=JSON.parse(fs.readFileSync(name,"utf8"));
    data.releaseAuthorized=true;
    fs.writeFileSync(name,JSON.stringify(data));
    assert.throws(()=>verifyRecoveredOffline(base,SHA),/disagrees/);
    data.releaseAuthorized=false;
    data.verifiedFiles=999;
    fs.writeFileSync(name,JSON.stringify(data));
    assert.throws(()=>verifyRecoveredOffline(base,SHA),/disagrees/);
  }finally{fs.rmSync(base,{recursive:true,force:true});}
});
test("P77 rejects extra files and symlinks, including hidden files and provenance",()=>{
  const base=fixture();
  try{
    fs.writeFileSync(path.join(base,"dist/.vite/credentials"),"private");
    assert.throws(()=>verifyRecoveredOffline(base,SHA));
    fs.unlinkSync(path.join(base,"dist/.vite/credentials"));
    fs.writeFileSync(path.join(base,"candidate-evidence/extra.txt"),"tampered");
    assert.throws(()=>verifyRecoveredOffline(base,SHA),/provenance/);
    fs.unlinkSync(path.join(base,"candidate-evidence/extra.txt"));
    const p=path.join(base,"candidate-evidence/P76-OFFLINE-REHEARSAL.json");
    fs.unlinkSync(p);
    fs.symlinkSync(path.join(base,"candidate-evidence/RELEASE-CANDIDATE.txt"),p);
    assert.throws(()=>verifyRecoveredOffline(base,SHA));
  }finally{fs.rmSync(base,{recursive:true,force:true});}
});
test("P77 refuses a downloaded ZIP that replaced the hidden manifest with an alternate path",()=>{
  const base=fixture();
  try{
    const p=path.join(base,"dist/.vite/manifest.json");
    const other=path.join(base,"dist/manifest.json");
    fs.renameSync(p,other);
    assert.throws(()=>verifyRecoveredOffline(base,SHA));
  }finally{fs.rmSync(base,{recursive:true,force:true});}
});
