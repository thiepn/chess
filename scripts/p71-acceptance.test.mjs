import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { makeHumanReviewTemplate, inspectHumanReview, verifyCandidateManifest, reviewChecklist } from "./p71-acceptance.mjs";

const SHA = "a".repeat(40);
const HASH = (n) => n.toString(16).padStart(64, "0");
function fixture() {
  return {
    schema: "thiepn-chess-visual-review-v2",
    commit: SHA, status: "UNAPPROVED", createdAt: "2026-10-09T10:00:00.000Z",
    images: Array.from({length:18},(_,n)=>({
      name: "screen-"+String(n).padStart(2,"0")+"-"+(n%2===0?"desktop":"phone")+"-linux.png",
      baselineSha256: HASH(n+1), candidateSha256: HASH(n+101), changed:true,
      width:n%2===0?1440:393, height:n%2===0?900:852
    }))
  };
}
function accepted(manifest) {
  const report=makeHumanReviewTemplate(manifest);
  for(const image of report.images){
    image.decision="ACCEPT";
    image.reviewer="External visual reviewer";
    image.reviewedAt="2026-10-09T11:00:00.000Z";
    image.notes="Independently inspected this screenshot and layout.";
  }
  return report;
}
const now=new Date("2026-10-09T12:00:00.000Z");

test("P71 worksheet never pre-approves or changes baselines",()=>{
  const manifest=fixture(), template=makeHumanReviewTemplate(manifest);
  assert.equal(template.images.length,18);
  assert.equal(template.images.every(x=>x.decision==="PENDING"&&!x.reviewer),true);
  assert.match(reviewChecklist(manifest),/PENDING HUMAN REVIEW/);
  assert.deepEqual(inspectHumanReview(manifest,template,now),{
    accepted:0,rejected:0,pending:18,readyForIndependentApproval:false
  });
});
test("P71 hash-bound human decisions require complete image coverage",()=>{
  const manifest=fixture(), report=accepted(manifest);
  assert.equal(inspectHumanReview(manifest,report,now).readyForIndependentApproval,true);
  report.images[5].decision="REJECT";
  assert.deepEqual(inspectHumanReview(manifest,report,now),{
    accepted:17,rejected:1,pending:0,readyForIndependentApproval:false
  });
  report.images[5].decision="PENDING";
  assert.equal(inspectHumanReview(manifest,report,now).pending,1);
});
test("P71 refuses stale SHA, missing image, duplicate, changed digest and unverifiable decisions",()=>{
  const manifest=fixture();
  const cases=[
    r=>{r.candidateCommit="b".repeat(40);},
    r=>{r.images.pop();},
    r=>{r.images[1].name=r.images[0].name;},
    r=>{r.images[1].candidateSha256="f".repeat(64);},
    r=>{r.images[1].reviewer="";},
    r=>{r.images[1].notes="ok";},
    r=>{r.images[1].reviewedAt="2026-10-08T00:00:00.000Z";},
    r=>{r.images[1].reviewedAt="2026-10-10T00:00:00.000Z";},
    r=>{r.images[1].decision="APPROVED_BY_CI";}
  ];
  for(const edit of cases){
    const report=accepted(manifest);edit(report);
    assert.throws(()=>inspectHumanReview(manifest,report,now));
  }
});
test("P71 refuses incomplete or fabricated screenshot manifests",()=>{
  const m=fixture();
  const variants=[
    x=>{x.status="APPROVED";},
    x=>{x.commit="not-a-sha";},
    x=>{x.images.pop();},
    x=>{x.images[3].name=x.images[2].name;},
    x=>{x.images[3].changed=false;},
    x=>{x.images[3].candidateSha256="invalid";},
    x=>{x.createdAt="not-a-date";}
  ];
  for(const change of variants){
    const clone=structuredClone(m); change(clone);
    assert.throws(()=>verifyCandidateManifest(clone));
  }
});
test("P71 CLI produces only a template/worksheet and never a decision file",()=>{
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),"chess-p71-"));
  try{
    const m=fixture();
    fs.writeFileSync(path.join(folder,"manifest.json"),JSON.stringify(m));
    const tool=path.resolve("scripts/p71-acceptance.mjs");
    const output=execFileSync(process.execPath,[tool,"prepare",path.join(folder,"manifest.json"),folder],{encoding:"utf8"});
    assert.match(output,/NO APPROVAL/);
    assert.equal(fs.existsSync(path.join(folder,"review-template.json")),true);
    assert.equal(fs.existsSync(path.join(folder,"review-checklist.md")),true);
    assert.equal(fs.existsSync(path.join(folder,"review-decisions.json")),false);
  } finally { fs.rmSync(folder,{recursive:true,force:true}); }
});
