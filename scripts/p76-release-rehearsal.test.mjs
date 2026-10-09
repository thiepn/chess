import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import {verifyOfflineCandidatePackage,rehearseReleaseGate} from "./p76-release-rehearsal.mjs";

const SHA="a".repeat(40);
const hash=x=>crypto.createHash("sha256").update(x).digest("hex");
const PR_CHECKS=["Quality","Device UX Prequalification","Visual Regression",
  "P67 Visual Candidates","P68 Offline Release Candidate"];
const MAIN_CHECKS=["Quality","Device UX Prequalification","Visual Regression"];
function run(name,sha=SHA,overrides={}) {
  return {name,head_sha:sha,head_branch:"p76-exact-head-release-rehearsal",
    event:"pull_request",status:"completed",conclusion:"success",run_number:12,...overrides};
}
function mainRun(name,sha=SHA) {
  return run(name,sha,{head_branch:"main",event:"push"});
}
function fixture() {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"chess-p76-release-"));
  fs.mkdirSync(path.join(root,"candidate-evidence"));
  fs.mkdirSync(path.join(root,"dist",".vite"),{recursive:true});
  fs.mkdirSync(path.join(root,"dist","assets"),{recursive:true});
  const names=["dist/index.html","dist/404.html","dist/.vite/manifest.json","dist/assets/app.js"];
  for(const name of names)fs.writeFileSync(path.join(root,name),"test content for "+name);
  const sums=names.map(n=>hash(fs.readFileSync(path.join(root,n)))+"  "+n).join("\n")+"\n";
  fs.writeFileSync(path.join(root,"candidate-evidence","SHA256SUMS.txt"),sums);
  fs.writeFileSync(path.join(root,"candidate-evidence","RELEASE-CANDIDATE.txt"),[
    "candidate_sha="+SHA,"candidate_type=OFFLINE_PREVIEW_ONLY",
    "authenticated_sync=NOT_QUALIFIED","production_deploy=NO","node=v22.21.0","npm=10.0.0",
  ].join("\n")+"\n");
  return root;
}
test("P76 offline rehearsal checks actual artifact SHA-256 and keeps release and rollback false",()=>{
  const root=fixture();
  try{
    const result=verifyOfflineCandidatePackage(root,SHA);
    assert.equal(result.verifiedFiles,4);
    assert.equal(result.artifactContentsVerified,true);
    assert.equal(result.rollbackTestedOnProduction,false);
    assert.equal(result.releaseAuthorized,false);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test("P76 offline rehearsal rejects stale SHA, tampered files and unlisted or symlink assets",()=>{
  const root=fixture();
  try{
    assert.throws(()=>verifyOfflineCandidatePackage(root,"b".repeat(40)),/stale/);
    fs.appendFileSync(path.join(root,"dist/index.html"),"malicious edit");
    assert.throws(()=>verifyOfflineCandidatePackage(root,SHA),/SHA-256 mismatch/);
    const names=fs.readFileSync(path.join(root,"candidate-evidence","SHA256SUMS.txt"),"utf8");
    fs.writeFileSync(path.join(root,"dist/index.html"),"test content for dist/index.html");
    fs.writeFileSync(path.join(root,"dist/extra.txt"),"stray file");
    assert.throws(()=>verifyOfflineCandidatePackage(root,SHA),/Unexpected/);
    fs.unlinkSync(path.join(root,"dist/extra.txt"));
    fs.unlinkSync(path.join(root,"dist/404.html"));
    fs.symlinkSync(path.join(root,"dist/index.html"),path.join(root,"dist/404.html"));
    assert.throws(()=>verifyOfflineCandidatePackage(root,SHA));
    assert.equal(fs.readFileSync(path.join(root,"candidate-evidence","SHA256SUMS.txt"),"utf8"),names);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test("P76 rejects forged package approval, unsafe checksum paths and incomplete inventory",()=>{
  const root=fixture();
  try{
    const meta=path.join(root,"candidate-evidence","RELEASE-CANDIDATE.txt");
    let content=fs.readFileSync(meta,"utf8").replace("production_deploy=NO","production_deploy=YES");
    fs.writeFileSync(meta,content);
    assert.throws(()=>verifyOfflineCandidatePackage(root,SHA),/production authorization/);
    content=content.replace("production_deploy=YES","production_deploy=NO");
    fs.writeFileSync(meta,content);
    const sums=path.join(root,"candidate-evidence","SHA256SUMS.txt");
    let original=fs.readFileSync(sums,"utf8");
    fs.writeFileSync(sums,original+hash("x")+"  dist/../outside.txt\n");
    assert.throws(()=>verifyOfflineCandidatePackage(root,SHA));
    fs.writeFileSync(sums,original.split("\n").filter(s=>!s.includes("dist/404.html")).join("\n"));
    assert.throws(()=>verifyOfflineCandidatePackage(root,SHA),/Missing mandatory/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test("P76 rehearsal refuses to substitute PR checks or an older commit for main push checks",()=>{
  const pr=PR_CHECKS.map(name=>run(name));
  const main=MAIN_CHECKS.map(name=>mainRun(name));
  const receipt=rehearseReleaseGate({candidateSha:SHA,prRuns:pr,mainSha:SHA,
    mainRuns:main,approvedProductionSha:SHA});
  assert.equal(receipt.automatedPrQualified,true);
  assert.equal(receipt.mainPushQualification,"ready");
  assert.equal(receipt.exactOperatorApprovalClaim,true);
  assert.equal(receipt.productionReleaseAuthorized,false);
  assert.equal(receipt.verdict,"REHEARSAL_ONLY_HOLD");
  const stale=rehearseReleaseGate({candidateSha:SHA,prRuns:pr,mainSha:"b".repeat(40),
    mainRuns:main,approvedProductionSha:SHA});
  assert.equal(stale.mainPushQualification,"not-on-main");
  assert.equal(stale.exactOperatorApprovalClaim,false);
  assert.equal(stale.productionReleaseAuthorized,false);
});
test("P76 rehearsal refuses missing, failed, skipped, superseded and PR-only CI",()=>{
  const base=PR_CHECKS.map(name=>run(name));
  for(const status of ["failure","cancelled","skipped","timed_out"]){
    const failed=base.map(j=>j.name==="Visual Regression"?{...j,conclusion:status}:j);
    const report=rehearseReleaseGate({candidateSha:SHA,prRuns:failed,mainSha:null});
    assert.equal(report.automatedPrQualified,false);
    assert.equal(report.prChecks["Visual Regression"].qualified,false);
  }
  const newer=[...base,{...run("Quality"),run_number:13,conclusion:"failure"}];
  assert.equal(rehearseReleaseGate({candidateSha:SHA,prRuns:newer}).automatedPrQualified,false);
  const prOnly=base.map(x=>({...x,event:"push"}));
  assert.equal(rehearseReleaseGate({candidateSha:SHA,prRuns:prOnly}).automatedPrQualified,false);
  const oldHead=base.map(x=>({...x,head_sha:"b".repeat(40)}));
  assert.equal(rehearseReleaseGate({candidateSha:SHA,prRuns:oldHead}).automatedPrQualified,false);
});
test("P76 does not equate validated offline preview with a proven rollback or approval",()=>{
  const preview={candidateSha:SHA,artifactContentsVerified:true,origin:"OFFLINE_PREVIEW_ONLY",releaseAuthorized:false};
  const receipt=rehearseReleaseGate({candidateSha:SHA,prRuns:PR_CHECKS.map(name=>run(name)),
    mainSha:SHA,mainRuns:MAIN_CHECKS.map(name=>mainRun(name)),approvedProductionSha:SHA,
    rollbackEvidence:preview});
  assert.equal(receipt.candidatePreviewIntegrity,true);
  assert.equal(receipt.productionRollbackTested,false);
  assert.equal(receipt.humanVisualApprovalIndependentlyValidated,false);
  assert.equal(receipt.productionReleaseAuthorized,false);
});
