import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import {REQUIRED_NAMES,verifyVisualFiles} from "./p73-verify-visual-artifact.mjs";
import {makeHumanReviewTemplate} from "./p71-acceptance.mjs";
import {CASES} from "./p72-device-acceptance.mjs";
import {reconcileReleaseEvidence} from "./p74-release-reconcile.mjs";
import {intakeHumanReleaseEvidence,buildBaselineProposal} from "./p75-human-approval-intake.mjs";
import {buildIndependentReviewPacket,reviewPacketMarkdown,writeIndependentReviewPacket} from "./p79-independent-review.mjs";

const SHA="a".repeat(40);
const sha256=x=>crypto.createHash("sha256").update(x).digest("hex");
const json=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+"\n");
function png(name,marker){
  const b=Buffer.alloc(64);
  Buffer.from([137,80,78,71,13,10,26,10]).copy(b);
  b.writeUInt32BE(13,8);b.write("IHDR",12);
  b.writeUInt32BE(name.includes("-phone-")?393:1440,16);
  b.writeUInt32BE(name.includes("-phone-")?852:900,20);
  b[40]=marker;return b;
}
function fixture(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"chess-p79-"));
  for(const folder of ["baseline","candidate"])fs.mkdirSync(path.join(root,folder));
  const images=REQUIRED_NAMES.map((name,i)=>{
    const before=png(name,i),after=png(name,i<12?i+100:i);
    fs.writeFileSync(path.join(root,"baseline",name),before);
    fs.writeFileSync(path.join(root,"candidate",name),after);
    return {
      name,width:name.includes("-phone-")?393:1440,
      height:name.includes("-phone-")?852:900,
      baselineSha256:sha256(before),candidateSha256:sha256(after),
      baselineBytes:before.length,candidateBytes:after.length,changed:i<12,
    };
  });
  const manifest={schema:"thiepn-chess-visual-review-v2",
    status:"UNAPPROVED",commit:SHA,createdAt:"2026-10-09T10:00:00Z",images};
  json(path.join(root,"manifest.json"),manifest);
  const integrity=verifyVisualFiles(manifest,root,SHA);
  json(path.join(root,"p73-image-integrity.json"),integrity);
  json(path.join(root,"p74-release-evidence.json"),
    reconcileReleaseEvidence({manifest,integrity,expectedSha:SHA}));
  json(path.join(root,"p75-intake-evidence.json"),
    intakeHumanReleaseEvidence({manifest,root,exactHead:SHA}));
  json(path.join(root,"p75-baseline-proposal.json"),
    buildBaselineProposal(manifest,null));
  json(path.join(root,"review-template.json"),makeHumanReviewTemplate(manifest));
  return {root,manifest};
}
function withFixture(callback){
  const f=fixture();try{return callback(f)}finally{fs.rmSync(f.root,{recursive:true,force:true})}
}

test("P79 renders all 18 hash-bound image pairs and 14 operator-only human cases, with no approval",()=>withFixture(({root})=>{
  const {packet,deviceTemplate}=buildIndependentReviewPacket(root,SHA);
  assert.equal(packet.screenshots.count,18);
  assert.equal(packet.screenshots.changed,12);
  assert.equal(packet.screenshots.pending,18);
  assert.equal(packet.manual.count,CASES.length);
  assert.equal(packet.manual.pending,CASES.length);
  assert.equal(packet.screenshots.items.filter(x=>x.independentDecision==="PENDING").length,18);
  assert.equal(deviceTemplate.cases.length,14);
  assert.equal(deviceTemplate.cases.filter(x=>x.verdict==="PENDING").length,14);
  assert.equal(packet.verdict,"HOLD_INDEPENDENT_REVIEW_REQUIRED");
  for(const name of ["independentHumanDecisionSupplied","reviewerIdentityVerified",
    "externalReviewAuthorityEstablished","visualBaselineModificationAuthorized",
    "accountOAuthRegistrationAuthorized","accountActivationAuthorized",
    "independentDeviceValidationComplete","independentEducatorApproval",
    "mergeAuthorized","rollbackPerformed","deploymentAuthorized","releaseAuthorized"])
    assert.equal(packet[name],false,name);
  const md=reviewPacketMarkdown(packet);
  for(const image of packet.screenshots.items) {
    assert.match(md,new RegExp(image.name.replace(".","\\.")));
    assert.ok(md.includes("[before]("+image.baselineRelativePath+")"));
    assert.ok(md.includes("[after]("+image.candidateRelativePath+")"));
  }
  for(const [id] of CASES) assert.ok(md.includes(id));
}));
test("P79 refuses a stale SHA or a forged/missing screenshot",()=>withFixture(({root,manifest})=>{
  assert.throws(()=>buildIndependentReviewPacket(root,"b".repeat(40)));
  const target=path.join(root,"candidate",manifest.images[0].name);
  fs.appendFileSync(target,"candidate byte tampering");
  assert.throws(()=>buildIndependentReviewPacket(root,SHA));
  fs.unlinkSync(target);
  assert.throws(()=>buildIndependentReviewPacket(root,SHA));
}));
test("P79 refuses a forged P73 image receipt or altered P74/P75 source gates",()=>withFixture(({root})=>{
  const p73=path.join(root,"p73-image-integrity.json");
  const original=fs.readFileSync(p73);
  const forged=JSON.parse(original);forged.records[0].candidateSha256="f".repeat(64);
  json(p73,forged);
  assert.throws(()=>buildIndependentReviewPacket(root,SHA),/P73/);
  fs.writeFileSync(p73,original);
  const p74=path.join(root,"p74-release-evidence.json");
  const saved=fs.readFileSync(p74);
  const changed=JSON.parse(saved);changed.visual.structuredDecisions.pending=0;
  json(p74,changed);
  assert.throws(()=>buildIndependentReviewPacket(root,SHA),/P74/);
  fs.writeFileSync(p74,saved);
  const p75=path.join(root,"p75-intake-evidence.json");
  const saved75=fs.readFileSync(p75);
  const falseApproval=JSON.parse(saved75);falseApproval.releaseAuthorized=true;
  json(p75,falseApproval);
  assert.throws(()=>buildIndependentReviewPacket(root,SHA),/P75/);
  fs.writeFileSync(p75,saved75);
}));
test("P79 blocks fake golden authorization and altered visual reviewer template",()=>withFixture(({root})=>{
  const filename=path.join(root,"p75-baseline-proposal.json");
  const backup=fs.readFileSync(filename);
  const p=JSON.parse(backup);
  p.images[0].reviewerClaim="ACCEPT";
  json(filename,p);
  assert.throws(()=>buildIndependentReviewPacket(root,SHA),/proposal record/);
  fs.writeFileSync(filename,backup);
  const template=path.join(root,"review-template.json");
  const visual=JSON.parse(fs.readFileSync(template));
  visual.images[0].decision="ACCEPT";
  json(template,visual);
  assert.throws(()=>buildIndependentReviewPacket(root,SHA),/review template/);
}));
test("P79 writes strictly PENDING templates and refuses overwriting prior human records",()=>withFixture(({root})=>{
  const userReview=path.join(root,"review-decisions.json");
  fs.writeFileSync(userReview,"PRIVATE-INDEPENDENT-REVIEWER-WORK");
  const created=writeIndependentReviewPacket(root,SHA);
  assert.equal(created.releaseAuthorized,false);
  const onDisk=JSON.parse(fs.readFileSync(path.join(root,"p79-independent-review-request.json")));
  assert.deepEqual(onDisk,created);
  assert.equal(onDisk.screenshots.pending,18);
  const device=JSON.parse(fs.readFileSync(path.join(root,"p79-device-template.json")));
  assert.equal(device.cases.filter(x=>x.verdict==="PENDING").length,14);
  assert.match(fs.readFileSync(path.join(root,"p79-independent-review-queue.md"),"utf8"),
    /HOLD — zero approvals/);
  assert.equal(fs.readFileSync(userReview,"utf8"),"PRIVATE-INDEPENDENT-REVIEWER-WORK");
  assert.throws(()=>writeIndependentReviewPacket(root,SHA),/refusing to overwrite/);
  assert.equal(fs.readFileSync(userReview,"utf8"),"PRIVATE-INDEPENDENT-REVIEWER-WORK");
}));
test("P79 refuses non-regular evidence files and a source-mismatched visual manifest",()=>withFixture(({root})=>{
  const f=path.join(root,"candidate",REQUIRED_NAMES[0]);
  fs.unlinkSync(f);
  fs.symlinkSync(path.join(root,"baseline",REQUIRED_NAMES[0]),f);
  assert.throws(()=>buildIndependentReviewPacket(root,SHA));
  const m=path.join(root,"manifest.json");
  const original=JSON.parse(fs.readFileSync(m));
  original.commit="b".repeat(40);
  json(m,original);
  assert.throws(()=>buildIndependentReviewPacket(root,SHA));
}));
