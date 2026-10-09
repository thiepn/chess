import {test} from "node:test";
import assert from "node:assert/strict";
import {reconcileReleaseEvidence,composeHumanReviewGuide} from "./p74-release-reconcile.mjs";
import {makeHumanReviewTemplate} from "./p71-acceptance.mjs";
import {makeAcceptancePlan} from "./p72-device-acceptance.mjs";

const SHA="a".repeat(40);
const now=new Date("2026-10-09T12:00:00.000Z");
const hash=n=>n.toString(16).padStart(64,"0");
const KEYS=["train","learn","play","review","library","progress",
  "learn-lesson","review-analysis","library-workspace"];
function fixtures(){
  const images=KEYS.flatMap((key)=>["desktop","phone"].map(device=>key+"-"+device+"-linux.png"))
    .sort().map((name,i)=>({
      name,width:name.includes("-phone-")?393:1440,
      height:name.includes("-phone-")?852:900,
      baselineSha256:hash(i+1),candidateSha256:hash(i<12?i+101:i+1),
      baselineBytes:1000+i,candidateBytes:1200+i,changed:i<12,
    }));
  const manifest={schema:"thiepn-chess-visual-review-v2",commit:SHA,status:"UNAPPROVED",
    createdAt:"2026-10-09T10:00:00.000Z",images};
  const integrity={sourceSha:SHA,status:"UNAPPROVED",releaseAuthorization:false,
    total:18,changed:12,manifestSha256:"b".repeat(64),
    records:images.map(({name,changed,baselineSha256,candidateSha256})=>({name,changed,baselineSha256,candidateSha256}))};
  return {manifest,integrity,expectedSha:SHA,now};
}
function fullReview(manifest){
  const record=makeHumanReviewTemplate(manifest);
  for(const image of record.images)Object.assign(image,{
    decision:"ACCEPT",reviewer:"Independent reviewer",
    reviewedAt:"2026-10-09T11:00:00.000Z",
    notes:"Reviewed actual image pair at original pixel resolution.",
  });
  return record;
}
function fullDevices(){
  const report=makeAcceptancePlan(SHA);
  for(const entry of report.cases)Object.assign(entry,{
    verdict:"PASS",testedCommit:SHA,
    tester:"Independent human tester",role:"Qualified independent reviewer",
    testedAt:"2026-10-09T11:00:00.000Z",
    deviceModel:"Physical device reference",os:"Android 15 or desktop OS",
    browser:"Chrome or Safari",environment:"Local physical staging lab",
    steps:"Observed all actual required steps for this test case.",
    observations:"Confirmed the expected behavior with independent evidence.",
    evidenceSha256:"c".repeat(64),
  });
  return report;
}

test("P74 receipt with no human inputs is HOLD regardless of verified image payloads",()=>{
  const receipt=reconcileReleaseEvidence(fixtures());
  assert.equal(receipt.sourceSha,SHA);
  assert.equal(receipt.visual.imagesVerified,18);
  assert.equal(receipt.visual.changedImages,12);
  assert.equal(receipt.visual.structuredDecisions.pending,18);
  assert.equal(receipt.humanAcceptance.structuredCases.pending,14);
  assert.equal(receipt.verdict,"HOLD_HUMAN_AND_PRODUCTION_GATES");
  assert.equal(receipt.productionReleaseAuthorized,false);
  assert.match(composeHumanReviewGuide(receipt),/Production release authorization: FALSE/);
});
test("P74 cannot translate even a fully formatted self-reported review into production authority",()=>{
  const f=fixtures();
  const receipt=reconcileReleaseEvidence({...f,visualDecisions:fullReview(f.manifest),deviceDecisions:fullDevices()});
  assert.equal(receipt.visual.structuredDecisions.accepted,18);
  assert.equal(receipt.humanAcceptance.structuredCases.passed,14);
  assert.equal(receipt.visual.structuredDecisions.readyForIndependentApproval,true);
  assert.equal(receipt.productionReleaseAuthorized,false);
  assert.equal(receipt.verdict,"HOLD_HUMAN_AND_PRODUCTION_GATES");
});
test("P74 refuses wrong commit, unknown source, stale review or stale device evidence",()=>{
  const f=fixtures();
  assert.throws(()=>reconcileReleaseEvidence({...f,expectedSha:"b".repeat(40)}));
  assert.throws(()=>reconcileReleaseEvidence({...f,integrity:{...f.integrity,releaseAuthorization:true}}));
  assert.throws(()=>reconcileReleaseEvidence({...f,integrity:{...f.integrity,total:17}}));
  const review=fullReview(f.manifest);review.candidateCommit="b".repeat(40);
  assert.throws(()=>reconcileReleaseEvidence({...f,visualDecisions:review}));
  const device=fullDevices();device.sourceSha="b".repeat(40);
  assert.throws(()=>reconcileReleaseEvidence({...f,deviceDecisions:device}));
});
test("P74 checks every screenshot digest against its corresponding verified record",()=>{
  const f=fixtures();
  const integrity=structuredClone(f.integrity);
  integrity.records[8].candidateSha256="f".repeat(64);
  assert.throws(()=>reconcileReleaseEvidence({...f,integrity}),/Inconsistent screenshot/);
  const wrongOrder=structuredClone(f.integrity);
  [wrongOrder.records[0],wrongOrder.records[1]]=[wrongOrder.records[1],wrongOrder.records[0]];
  assert.throws(()=>reconcileReleaseEvidence({...f,integrity:wrongOrder}));
});
test("P74 keeps rejection, pending evidence and explicit human review deficits visible",()=>{
  const f=fixtures();const review=fullReview(f.manifest);
  review.images[4].decision="REJECT";
  const device=fullDevices();device.cases[3].verdict="FAIL";
  const receipt=reconcileReleaseEvidence({...f,visualDecisions:review,deviceDecisions:device});
  assert.equal(receipt.visual.structuredDecisions.rejected,1);
  assert.equal(receipt.humanAcceptance.structuredCases.failed,1);
  assert.equal(receipt.productionReleaseAuthorized,false);
  assert.ok(receipt.reasons.some(x=>/rejected/.test(x)));
  assert.ok(receipt.reasons.some(x=>/failed/.test(x)));
});
