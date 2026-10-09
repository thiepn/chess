import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import {REQUIRED_NAMES,verifyVisualFiles} from "./p73-verify-visual-artifact.mjs";
import {makeHumanReviewTemplate} from "./p71-acceptance.mjs";
import {makeAcceptancePlan,CASES} from "./p72-device-acceptance.mjs";
import {reconcileReleaseEvidence} from "./p74-release-reconcile.mjs";
import {intakeHumanReleaseEvidence,buildBaselineProposal} from "./p75-human-approval-intake.mjs";
import {writeIndependentReviewPacket} from "./p79-independent-review.mjs";
import {inspectIndependentHumanClaims,writeHumanClaimsRecord} from "./p80-human-claims.mjs";
const SHA="a".repeat(40),NOW=new Date("2026-10-10T22:00:00Z");
const digest=bytes=>crypto.createHash("sha256").update(bytes).digest("hex");
const json=(p,obj)=>fs.writeFileSync(p,JSON.stringify(obj,null,2)+"\n");
function png(name,marker){
  const b=Buffer.alloc(64);
  Buffer.from([137,80,78,71,13,10,26,10]).copy(b);
  b.writeUInt32BE(13,8);b.write("IHDR",12);
  b.writeUInt32BE(name.includes("-phone-")?393:1440,16);
  b.writeUInt32BE(name.includes("-phone-")?852:900,20);
  b[40]=marker;return b;
}
function createFixture(){
  const base=fs.mkdtempSync(path.join(os.tmpdir(),"chess-p80-"));
  const root=path.join(base,"visual"),privateEvidenceDir=path.join(base,"private");
  for(const p of ["visual/baseline","visual/candidate","private"])
    fs.mkdirSync(path.join(base,p),{recursive:true});
  const images=REQUIRED_NAMES.map((name,i)=>{
    const before=png(name,i),after=png(name,i<12?i+100:i);
    fs.writeFileSync(path.join(root,"baseline",name),before);
    fs.writeFileSync(path.join(root,"candidate",name),after);
    return {name,width:name.includes("-phone-")?393:1440,
      height:name.includes("-phone-")?852:900,
      baselineSha256:digest(before),candidateSha256:digest(after),
      baselineBytes:before.length,candidateBytes:after.length,changed:i<12};
  });
  const manifest={schema:"thiepn-chess-visual-review-v2",commit:SHA,
    status:"UNAPPROVED",createdAt:"2026-10-09T10:00:00Z",images};
  json(path.join(root,"manifest.json"),manifest);
  const integrity=verifyVisualFiles(manifest,root,SHA);
  json(path.join(root,"p73-image-integrity.json"),integrity);
  json(path.join(root,"p74-release-evidence.json"),
    reconcileReleaseEvidence({manifest,integrity,expectedSha:SHA}));
  json(path.join(root,"p75-intake-evidence.json"),
    intakeHumanReleaseEvidence({manifest,root,exactHead:SHA}));
  json(path.join(root,"p75-baseline-proposal.json"),buildBaselineProposal(manifest,null));
  json(path.join(root,"review-template.json"),makeHumanReviewTemplate(manifest));
  writeIndependentReviewPacket(root,SHA);
  return {base,root,privateEvidenceDir,manifest,sourceSha:SHA,visualRoot:root,now:NOW};
}
function fixture(f){
  const ctx=createFixture();
  try{return f(ctx)}finally{fs.rmSync(ctx.base,{recursive:true,force:true})}
}
function visualClaims(manifest,decision="ACCEPT"){
  const v=makeHumanReviewTemplate(manifest);
  for(const item of v.images)Object.assign(item,{decision,reviewer:"Unverified reviewer",
    reviewedAt:"2026-10-09T11:00:00Z",
    notes:"Synthetic fixture claim is not independent reviewer authority"});
  return v;
}
function oneDeviceCase(ctx,verdict="PASS") {
  const p=makeAcceptancePlan(SHA),first=p.cases[0];
  const bytes=Buffer.from("fixture redacted evidence, not real device proof");
  fs.writeFileSync(path.join(ctx.privateEvidenceDir,first.id+".evidence"),bytes);
  Object.assign(first,{verdict,testedCommit:SHA,tester:"Fixture tester",role:"Human tester",
    testedAt:"2026-10-09T11:00:00Z",deviceModel:"Physical fixture device",
    os:"Android test",browser:"Chrome mobile",environment:"Controlled fixture testing",
    steps:"Followed the independent physical acceptance script in this synthetic fixture.",
    observations:"This is synthetic test data, not corroborated physical observation.",
    evidenceSha256:digest(bytes)});
  return p;
}
test("P80 without human evidence keeps all 18 visual and 14 device decisions PENDING",()=>fixture(ctx=>{
  const r=inspectIndependentHumanClaims(ctx);
  assert.equal(r.sourceSha,SHA);
  assert.equal(r.imageDecisions.length,18);
  assert.equal(r.visualClaims.pending,18);
  assert.equal(r.deviceClaims.pending,14);
  assert.equal(r.deviceClaims.redactedEvidenceFilesHashVerified,0);
  assert.equal(r.manualCases.length,CASES.length);
  assert.equal(r.verdict,"HOLD_EXTERNAL_HUMAN_AUTHORITY_AND_MAIN_RELEASE_GATES");
  for(const k of ["independentlyVerifiedHumanIdentity","physicalObservationIndependentlyCorroborated",
    "educatorSignoffIndependentlyCorroborated","visualGoldenUpdateAuthorized",
    "chessOAuthRegistrationAuthorized","chessOAuthActivationAuthorized","mergeAuthorized",
    "productionRollbackExecuted","productionDeployAuthorized","releaseAuthorized"])
    assert.equal(r[k],false,k);
  const output=path.join(ctx.root,"p80-automated-intake-hold.json");
  const actual=writeHumanClaimsRecord(ctx,output);
  assert.deepEqual(actual,r);
  assert.equal(JSON.parse(fs.readFileSync(output)).releaseAuthorized,false);
  assert.throws(()=>writeHumanClaimsRecord(ctx,output),/EEXIST/);
}));
test("P80 accepts all 18 formatted review CLAIMS without authorizing golden references",()=>fixture(ctx=>{
  const c=visualClaims(ctx.manifest),r=inspectIndependentHumanClaims({...ctx,visualDecisions:c});
  assert.equal(r.visualClaims.accepted,18);
  assert.equal(r.visualClaims.pending,0);
  assert.equal(r.visualGoldenUpdateAuthorized,false);
  assert.equal(r.releaseAuthorized,false);
  assert.equal(r.independentlyVerifiedHumanIdentity,false);
  assert.equal(r.imageDecisions[0].claimedDecision,"ACCEPT");
  assert.doesNotMatch(JSON.stringify(r),/Unverified reviewer/);
  assert.doesNotMatch(JSON.stringify(r),/Synthetic fixture claim/);
  const output=path.join(ctx.root,"private-claims-must-not-upload.json");
  assert.throws(()=>writeHumanClaimsRecord({...ctx,visualDecisions:c},output),/private claim summary/);
  assert.equal(fs.existsSync(output),false);
  const safe=path.join(ctx.base,"private-claims-summary.json");
  writeHumanClaimsRecord({...ctx,visualDecisions:c},safe);
  assert.equal(JSON.parse(fs.readFileSync(safe)).releaseAuthorized,false);
}));
test("P80 device PASS claims require genuine file bytes but never become actual acceptance",()=>fixture(ctx=>{
  const p=oneDeviceCase(ctx);
  const r=inspectIndependentHumanClaims({...ctx,devicePlan:p});
  assert.equal(r.deviceClaims.passed,1);
  assert.equal(r.deviceClaims.pending,13);
  assert.equal(r.deviceClaims.redactedEvidenceFilesHashVerified,1);
  assert.equal(r.manualCases[0].claimedVerdict,"PASS");
  assert.equal(r.releaseAuthorized,false);
  assert.equal(r.physicalObservationIndependentlyCorroborated,false);
  assert.doesNotMatch(JSON.stringify(r),/Fixture tester/);
  assert.doesNotMatch(JSON.stringify(r),/Controlled fixture testing/);
  assert.throws(()=>inspectIndependentHumanClaims({...ctx,devicePlan:p,
    privateEvidenceDir:ctx.root}),/separately|inventory/);
}));
test("P80 rejects missing, corrupted or unexpected private evidence files",()=>fixture(ctx=>{
  const p=oneDeviceCase(ctx);
  const name=path.join(ctx.privateEvidenceDir,p.cases[0].id+".evidence");
  fs.appendFileSync(name,"changed");
  assert.throws(()=>inspectIndependentHumanClaims({...ctx,devicePlan:p}),/mismatch/);
  fs.writeFileSync(name,"fixture redacted evidence, not real device proof");
  fs.writeFileSync(path.join(ctx.privateEvidenceDir,"unexpected.evidence"),"extra");
  assert.throws(()=>inspectIndependentHumanClaims({...ctx,devicePlan:p}),/inventory/);
  fs.unlinkSync(path.join(ctx.privateEvidenceDir,"unexpected.evidence"));
  fs.unlinkSync(name);
  fs.symlinkSync(path.join(ctx.root,"manifest.json"),name);
  assert.throws(()=>inspectIndependentHumanClaims({...ctx,devicePlan:p}),/inventory/);
}));
test("P80 rejects stale human SHA and forged source-bound P79 request",()=>fixture(ctx=>{
  const p=oneDeviceCase(ctx);
  p.sourceSha="b".repeat(40);
  assert.throws(()=>inspectIndependentHumanClaims({...ctx,devicePlan:p}),/wrong exact commit/);
  assert.throws(()=>inspectIndependentHumanClaims({...ctx,sourceSha:"b".repeat(40)}));
  const file=path.join(ctx.root,"p79-independent-review-request.json");
  const request=JSON.parse(fs.readFileSync(file));
  request.visualBaselineModificationAuthorized=true;
  json(file,request);
  assert.throws(()=>inspectIndependentHumanClaims(ctx),/modified/);
}));
test("P80 blocks invalid review claims, rejected decisions and fake future timestamps",()=>fixture(ctx=>{
  const visual=visualClaims(ctx.manifest);
  visual.images[0].decision="REJECT";
  const r=inspectIndependentHumanClaims({...ctx,visualDecisions:visual});
  assert.equal(r.visualClaims.rejected,1);
  assert.equal(r.releaseAuthorized,false);
  visual.images[0].reviewedAt="2099-01-01T00:00:00Z";
  assert.throws(()=>inspectIndependentHumanClaims({...ctx,visualDecisions:visual}));
  visual.images[0].reviewedAt="2026-10-09T11:00:00Z";
  visual.images[0].baselineSha256="0".repeat(64);
  assert.throws(()=>inspectIndependentHumanClaims({...ctx,visualDecisions:visual}));
}));
