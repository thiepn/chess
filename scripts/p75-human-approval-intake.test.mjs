import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import {REQUIRED_NAMES} from "./p73-verify-visual-artifact.mjs";
import {makeHumanReviewTemplate} from "./p71-acceptance.mjs";
import {makeAcceptancePlan} from "./p72-device-acceptance.mjs";
import {intakeHumanReleaseEvidence,verifyPhysicalEvidenceBytes,buildBaselineProposal,formatHumanIntake} from "./p75-human-approval-intake.mjs";

const SHA="a".repeat(40),hash=bytes=>crypto.createHash("sha256").update(bytes).digest("hex");
function png(name,marker){
  const b=Buffer.alloc(64);
  Buffer.from([137,80,78,71,13,10,26,10]).copy(b);
  b.writeUInt32BE(13,8);b.write("IHDR",12);
  b.writeUInt32BE(name.includes("-phone-")?393:1440,16);
  b.writeUInt32BE(name.includes("-phone-")?852:900,20);
  b[40]=marker;return b;
}
function fixture(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"chess-p75-"));
  for(const sub of ["baseline","candidate","human-evidence"])fs.mkdirSync(path.join(dir,sub));
  const images=REQUIRED_NAMES.map((name,i)=>{
    const before=png(name,i),after=png(name,i<12?i+100:i);
    fs.writeFileSync(path.join(dir,"baseline",name),before);
    fs.writeFileSync(path.join(dir,"candidate",name),after);
    return {
      name,width:name.includes("-phone-")?393:1440,
      height:name.includes("-phone-")?852:900,
      baselineSha256:hash(before),candidateSha256:hash(after),
      baselineBytes:before.length,candidateBytes:after.length,changed:i<12
    };
  });
  const manifest={schema:"thiepn-chess-visual-review-v2",commit:SHA,
    status:"UNAPPROVED",createdAt:"2026-10-09T10:00:00.000Z",images};
  fs.writeFileSync(path.join(dir,"manifest.json"),JSON.stringify(manifest,null,2)+"\n");
  return {dir,manifest};
}
function fullVisual(manifest){
  const review=makeHumanReviewTemplate(manifest);
  for(const entry of review.images) Object.assign(entry,{
    decision:"ACCEPT",reviewer:"Independent reviewer",
    reviewedAt:"2026-10-09T11:00:00.000Z",
    notes:"Independent visual approval claim awaiting external corroboration."
  });
  return review;
}
function fullDevice(evidenceDir){
  const record=makeAcceptancePlan(SHA);
  for(const entry of record.cases){
    const contents=Buffer.from("redacted independent evidence for "+entry.id);
    fs.writeFileSync(path.join(evidenceDir,entry.id+".evidence"),contents);
    Object.assign(entry,{
      verdict:"PASS",testedCommit:SHA,
      tester:"Independent tester",role:"Authorized reviewer",
      testedAt:"2026-10-09T11:00:00.000Z",
      deviceModel:"Real physical device",os:"Android/iOS/Windows",
      browser:"Chrome/Safari",environment:"Independent acceptance lab",
      steps:"Executed and recorded the required complete human acceptance journey.",
      observations:"Recorded independent check evidence and observed successful test.",
      evidenceSha256:hash(contents)
    });
  }
  return record;
}
test("P75 packet opens as 18 visual + 14 human cases PENDING and NEVER authorizes baseline or release",()=>{
  const {dir,manifest}=fixture();
  try{
    const receipt=intakeHumanReleaseEvidence({manifest,root:dir,exactHead:SHA});
    assert.equal(receipt.visual.total,18);
    assert.equal(receipt.visual.changed,12);
    assert.equal(receipt.visual.pending,18);
    assert.equal(receipt.physical.pending,14);
    assert.equal(receipt.physical.verifiedEvidenceFiles,0);
    for(const key of ["actualReviewerAuthorityEstablished","approvedGoldenSnapshots",
       "readyToCommitGoldenBaselines","readyToMerge","readyToDeploy","releaseAuthorized"]){
      assert.equal(receipt[key],false);
    }
    assert.match(formatHumanIntake(receipt),/Deploy authorized: NO/);
    assert.equal(buildBaselineProposal(manifest,null).baselineFilesModified,false);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test("P75 requires and hashes actual redacted evidence bytes for each completed human case",()=>{
  const {dir,manifest}=fixture();
  try{
    const evidenceDir=path.join(dir,"human-evidence");
    const deviceReview=fullDevice(evidenceDir);
    const review=fullVisual(manifest);
    const verified=verifyPhysicalEvidenceBytes(deviceReview,evidenceDir);
    assert.equal(verified.verified,14);
    const receipt=intakeHumanReleaseEvidence({manifest,root:dir,exactHead:SHA,
      visualReview:review,deviceReview,evidenceDirectory:evidenceDir,
      now:new Date("2026-10-09T12:00:00.000Z")});
    assert.equal(receipt.visual.acceptedClaims,18);
    assert.equal(receipt.physical.recordedPassClaims,14);
    assert.equal(receipt.physical.verifiedEvidenceFiles,14);
    // Self-reported PASS claims and valid hashes are not human authorization.
    assert.equal(receipt.readyToCommitGoldenBaselines,false);
    assert.equal(receipt.releaseAuthorized,false);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test("P75 cannot accept nonexistent, empty, tampered or symlink evidence",()=>{
  const {dir}=fixture();
  try{
    const base=path.join(dir,"human-evidence");
    const rec=fullDevice(base);
    const file=path.join(base,rec.cases[0].id+".evidence");
    fs.appendFileSync(file,"tampering");
    assert.throws(()=>verifyPhysicalEvidenceBytes(rec,base),/mismatch/);
    fs.unlinkSync(file);
    assert.throws(()=>verifyPhysicalEvidenceBytes(rec,base));
    fs.writeFileSync(file,Buffer.alloc(0));
    assert.throws(()=>verifyPhysicalEvidenceBytes(rec,base),/nonempty/);
    fs.unlinkSync(file);
    fs.symlinkSync(path.join(base,rec.cases[1].id+".evidence"),file);
    assert.throws(()=>verifyPhysicalEvidenceBytes(rec,base),/nonempty/);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test("P75 refuses a PASS claim with no physical evidence directory",()=>{
  const {dir}=fixture();
  try{const r=fullDevice(path.join(dir,"human-evidence"));
    assert.throws(()=>verifyPhysicalEvidenceBytes(r,null),/required/);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test("P75 refuses a stale source SHA and a forged visual decision hash",()=>{
  const {dir,manifest}=fixture();
  try{
    assert.throws(()=>intakeHumanReleaseEvidence({manifest,root:dir,exactHead:"b".repeat(40)}),/Wrong/);
    const review=fullVisual(manifest);review.images[5].candidateSha256="f".repeat(64);
    assert.throws(()=>intakeHumanReleaseEvidence({manifest,root:dir,exactHead:SHA,visualReview:review}));
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test("P75 shows human rejection as a blocker and never treats completed forms as permission",()=>{
  const {dir,manifest}=fixture();
  try{
    const review=fullVisual(manifest);review.images[4].decision="REJECT";
    const record=intakeHumanReleaseEvidence({manifest,root:dir,exactHead:SHA,visualReview:review});
    assert.equal(record.visual.rejected,1);
    assert.equal(record.readyToCommitGoldenBaselines,false);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
