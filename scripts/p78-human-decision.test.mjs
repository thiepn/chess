import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import {REQUIRED_NAMES,verifyVisualFiles} from "./p73-verify-visual-artifact.mjs";
import {makeHumanReviewTemplate} from "./p71-acceptance.mjs";
import {makeAcceptancePlan} from "./p72-device-acceptance.mjs";
import {reconcileReleaseEvidence} from "./p74-release-reconcile.mjs";
import {intakeHumanReleaseEvidence,buildBaselineProposal} from "./p75-human-approval-intake.mjs";
import {verifyOfflineCandidatePackage} from "./p76-release-rehearsal.mjs";
import {verifyRecoveredOffline} from "./p77-recovery-verifier.mjs";
import {reconcileDownloadedAcceptance,inspectExactHeadCi} from "./p78-human-decision.mjs";

const SHA="a".repeat(40);
const hash=x=>crypto.createHash("sha256").update(x).digest("hex");
const writeJSON=(name,object)=>fs.writeFileSync(name,JSON.stringify(object,null,2)+"\n");
function png(name,marker){
  const b=Buffer.alloc(64);
  Buffer.from([137,80,78,71,13,10,26,10]).copy(b);
  b.writeUInt32BE(13,8);b.write("IHDR",12);
  b.writeUInt32BE(name.includes("-phone-")?393:1440,16);
  b.writeUInt32BE(name.includes("-phone-")?852:900,20);
  b[40]=marker;return b;
}
function fixture(){
  const base=fs.mkdtempSync(path.join(os.tmpdir(),"chess-p78-decision-"));
  const visualRoot=path.join(base,"visual"),offlineRoot=path.join(base,"offline");
  for(const d of ["visual/baseline","visual/candidate","offline/candidate-evidence",
    "offline/dist/.vite","offline/dist/assets","private-evidence"]) {
    fs.mkdirSync(path.join(base,d),{recursive:true});
  }
  const images=REQUIRED_NAMES.map((name,i)=>{
    const before=png(name,i),after=png(name,i<12?i+100:i);
    fs.writeFileSync(path.join(visualRoot,"baseline",name),before);
    fs.writeFileSync(path.join(visualRoot,"candidate",name),after);
    return {name,width:name.includes("-phone-")?393:1440,
      height:name.includes("-phone-")?852:900,changed:i<12,
      baselineSha256:hash(before),candidateSha256:hash(after),
      baselineBytes:before.length,candidateBytes:after.length};
  });
  const manifest={schema:"thiepn-chess-visual-review-v2",
    commit:SHA,status:"UNAPPROVED",createdAt:"2026-10-09T10:00:00.000Z",images};
  writeJSON(path.join(visualRoot,"manifest.json"),manifest);
  const integrity=verifyVisualFiles(manifest,visualRoot,SHA);
  writeJSON(path.join(visualRoot,"p73-image-integrity.json"),integrity);
  const prior74=reconcileReleaseEvidence({manifest,integrity,expectedSha:SHA});
  writeJSON(path.join(visualRoot,"p74-release-evidence.json"),prior74);
  const prior75=intakeHumanReleaseEvidence({manifest,root:visualRoot,exactHead:SHA});
  writeJSON(path.join(visualRoot,"p75-intake-evidence.json"),prior75);
  writeJSON(path.join(visualRoot,"p75-baseline-proposal.json"),buildBaselineProposal(manifest,null));
  writeJSON(path.join(visualRoot,"review-template.json"),makeHumanReviewTemplate(manifest));
  const names=["dist/index.html","dist/404.html","dist/.vite/manifest.json","dist/assets/chess.js"];
  for(const name of names)fs.writeFileSync(path.join(offlineRoot,name),"immutable evidence "+name);
  fs.writeFileSync(path.join(offlineRoot,"candidate-evidence/SHA256SUMS.txt"),
    names.map(n=>hash(fs.readFileSync(path.join(offlineRoot,n)))+"  "+n).join("\n")+"\n");
  fs.writeFileSync(path.join(offlineRoot,"candidate-evidence/RELEASE-CANDIDATE.txt"),[
    "candidate_sha="+SHA,"candidate_type=OFFLINE_PREVIEW_ONLY",
    "authenticated_sync=NOT_QUALIFIED","production_deploy=NO","node=v22.0.0","npm=10.0.0"
  ].join("\n")+"\n");
  writeJSON(path.join(offlineRoot,"candidate-evidence/P76-OFFLINE-REHEARSAL.json"),
    verifyOfflineCandidatePackage(offlineRoot,SHA));
  const recoveryReceiptPath=path.join(base,"P77-RECOVERY.json");
  writeJSON(recoveryReceiptPath,verifyRecoveredOffline(offlineRoot,SHA));
  return {base,visualRoot,offlineRoot,recoveryReceiptPath,sourceSha:SHA,manifest};
}
function workflow(name,overrides={}){
  return {name,head_sha:SHA,head_branch:"p78-cross-artifact-human-decision",
    event:"pull_request",status:"completed",conclusion:"success",
    id:name==="P68 Offline Release Candidate"?71:10,run_number:1,...overrides};
}
const checks=["Quality","P68 Offline Release Candidate","P67 Visual Candidates",
  "Device UX Prequalification","Visual Regression"];
const successful=()=>checks.map(name=>workflow(name));
const jobs=[
  {name:"package",run_id:71,status:"completed",conclusion:"success"},
  {name:"Independently verify downloaded guest-only artifact",run_id:71,
    status:"completed",conclusion:"success"}
];
test("P78 binds every PNG, SHA and recovery byte to a HOLD-only receipt",()=>{
  const f=fixture();
  try{
    const v=reconcileDownloadedAcceptance(f);
    assert.equal(v.sourceSha,SHA);
    assert.equal(v.evidence.verifiedPngs,36);
    assert.equal(v.evidence.changedScreens,12);
    assert.equal(v.evidence.offlineBuildFiles,4);
    assert.equal(v.evidence.screenshotDecisionCounts.pending,18);
    assert.equal(v.evidence.physicalDecisionCounts.pending,14);
    assert.equal(v.imageReview.length,18);
    assert.equal(v.manualCases.length,14);
    assert.equal(v.automated.exactHeadMachineQualified,false);
    for(const key of ["externalHumanAuthorityCorroborated","visualBaselineUpdatePermitted",
      "chessOAuthRegistrationPermitted","chessAppActivationPermitted","mergePermitted",
      "productionRollbackPerformed","deploymentPermitted","releaseAuthorized"]){
      assert.equal(v[key],false,key);
    }
    assert.equal(v.decision,"HOLD_FOR_HUMAN_ACCEPTANCE_AND_EXACT_MAIN_SHA");
  }finally{fs.rmSync(f.base,{recursive:true,force:true});}
});
test("P78 exact-head CI requires all five workflows and both separate offline jobs",()=>{
  const qualified=inspectExactHeadCi({sourceSha:SHA,prRuns:successful(),offlineJobs:jobs,
    branchName:"p78-cross-artifact-human-decision"});
  assert.equal(qualified.exactHeadMachineQualified,true);
  assert.equal(qualified.releasePermission,false);
  assert.equal(inspectExactHeadCi({sourceSha:SHA,prRuns:successful(),
    offlineJobs:jobs.slice(0,1)}).exactHeadMachineQualified,false);
  const bad=successful().map(x=>x.name==="Quality"?{...x,head_sha:"b".repeat(40)}:x);
  assert.equal(inspectExactHeadCi({sourceSha:SHA,prRuns:bad,offlineJobs:jobs}).exactHeadMachineQualified,false);
  const failed=successful().map(x=>x.name==="Visual Regression"?{...x,conclusion:"failure"}:x);
  assert.equal(inspectExactHeadCi({sourceSha:SHA,prRuns:failed,offlineJobs:jobs}).exactHeadMachineQualified,false);
  const pushed=successful().map(x=>({...x,event:"push"}));
  assert.equal(inspectExactHeadCi({sourceSha:SHA,prRuns:pushed,offlineJobs:jobs}).exactHeadMachineQualified,false);
  const branch=inspectExactHeadCi({sourceSha:SHA,prRuns:successful(),
    offlineJobs:jobs,branchName:"unrelated-branch"});
  assert.equal(branch.exactHeadMachineQualified,false);
});
test("P78 refuses screenshot tampering and forged source-bound P73/74/75 receipts",()=>{
  const f=fixture();
  try{
    const target=path.join(f.visualRoot,"candidate",f.manifest.images[0].name);
    fs.appendFileSync(target,"tamper");
    assert.throws(()=>reconcileDownloadedAcceptance(f));
    fs.writeFileSync(target,png(f.manifest.images[0].name,100));
    const integrityPath=path.join(f.visualRoot,"p73-image-integrity.json");
    const rec=JSON.parse(fs.readFileSync(integrityPath));
    rec.records[0].candidateSha256="f".repeat(64);
    writeJSON(integrityPath,rec);
    assert.throws(()=>reconcileDownloadedAcceptance(f),/P73/);
    rec.records[0].candidateSha256=f.manifest.images[0].candidateSha256;
    writeJSON(integrityPath,rec);
    const p75=path.join(f.visualRoot,"p75-intake-evidence.json");
    const report=JSON.parse(fs.readFileSync(p75));
    report.readyToCommitGoldenBaselines=true;
    writeJSON(p75,report);
    assert.throws(()=>reconcileDownloadedAcceptance(f),/P75/);
  }finally{fs.rmSync(f.base,{recursive:true,force:true});}
});
test("P78 rejects forged machine-generated reviewer claims and approved-golden proposals",()=>{
  const f=fixture();
  try {
    const visual=path.join(f.visualRoot,"review-template.json");
    const report=JSON.parse(fs.readFileSync(visual));
    report.images[0].decision="ACCEPT";
    writeJSON(visual,report);
    assert.throws(()=>reconcileDownloadedAcceptance(f),/template/);
    writeJSON(visual,makeHumanReviewTemplate(f.manifest));
    const proposal=path.join(f.visualRoot,"p75-baseline-proposal.json");
    const p=JSON.parse(fs.readFileSync(proposal));
    p.images[3].reviewerClaim="ACCEPT";
    writeJSON(proposal,p);
    assert.throws(()=>reconcileDownloadedAcceptance(f),/baseline review pair/);
  }finally{fs.rmSync(f.base,{recursive:true,force:true});}
});
test("P78 refuses incorrect recovered receipt, missing hidden file and stale SHA",()=>{
  const f=fixture();
  try{
    assert.throws(()=>reconcileDownloadedAcceptance({...f,sourceSha:"b".repeat(40)}));
    const rec=JSON.parse(fs.readFileSync(f.recoveryReceiptPath));
    rec.releaseAuthorized=true;
    writeJSON(f.recoveryReceiptPath,rec);
    assert.throws(()=>reconcileDownloadedAcceptance(f),/P77/);
    rec.releaseAuthorized=false;
    writeJSON(f.recoveryReceiptPath,rec);
    fs.unlinkSync(path.join(f.offlineRoot,"dist/.vite/manifest.json"));
    assert.throws(()=>reconcileDownloadedAcceptance(f));
  }finally{fs.rmSync(f.base,{recursive:true,force:true});}
});
test("P78 accepts structured private claims only as evidence, not approval or deployment rights",()=>{
  const f=fixture(),now=new Date("2026-10-10T00:00:00Z");
  try {
    const v=makeHumanReviewTemplate(f.manifest);
    for(const item of v.images)Object.assign(item,{
      decision:"ACCEPT",reviewer:"Unverified independent review CLAIM",
      reviewedAt:"2026-10-09T11:00:00.000Z",
      notes:"This review is a synthetic claim and does not establish human authority."
    });
    const d=makeAcceptancePlan(SHA);
    for(const item of d.cases){
      const bytes=Buffer.from("synthetic test fixture evidence "+item.id);
      fs.writeFileSync(path.join(f.base,"private-evidence",item.id+".evidence"),bytes);
      Object.assign(item,{
        verdict:"PASS",testedCommit:SHA,tester:"Unverified tester",
        role:"Human reviewer claimed",testedAt:"2026-10-09T11:00:00.000Z",
        deviceModel:"Physical device claimed",os:"Android iOS",
        browser:"Chrome Safari",environment:"Synthetic test fixture lab",
        steps:"Synthetic test fixture only: ran complete independent acceptance steps.",
        observations:"Synthetic test fixture only: observations not independently verified.",
        evidenceSha256:hash(bytes)
      });
    }
    const packet=reconcileDownloadedAcceptance({...f,now,
      humanVisual:v,humanDevice:d,privateEvidenceDir:path.join(f.base,"private-evidence"),
      prRuns:successful(),offlineJobs:jobs,branchName:"p78-cross-artifact-human-decision"});
    assert.equal(packet.evidence.screenshotDecisionCounts.acceptedClaims,18);
    assert.equal(packet.evidence.physicalDecisionCounts.recordedPassClaims,14);
    assert.equal(packet.evidence.privateHumanEvidenceFileHashesChecked,14);
    assert.equal(packet.automated.exactHeadMachineQualified,true);
    assert.equal(packet.visualBaselineUpdatePermitted,false);
    assert.equal(packet.externalHumanAuthorityCorroborated,false);
    assert.equal(packet.releaseAuthorized,false);
    const text=JSON.stringify(packet);
    assert.doesNotMatch(text,/Unverified tester/);
    assert.doesNotMatch(text,/Synthetic test fixture lab/);
    assert.doesNotMatch(text,/synthetic test fixture evidence/);
  }finally{fs.rmSync(f.base,{recursive:true,force:true});}
});
