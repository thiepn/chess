import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {CASES,makeAcceptancePlan,evaluateAcceptance} from "./p72-device-acceptance.mjs";
const SHA="a".repeat(40);
const now=new Date("2026-10-09T12:00:00.000Z");
function complete(){
  const p=makeAcceptancePlan(SHA);
  for(const item of p.cases){
    Object.assign(item,{
      verdict:"PASS",testedCommit:SHA,tester:"Independent device tester",
      role:"Authorized human reviewer",testedAt:"2026-10-09T11:00:00.000Z",
      deviceModel:"Verified real device",os:"Android 15 / iOS 18 / Windows 11",
      browser:"Chrome / Safari / Edge",environment:"Real account test environment",
      steps:"Executed each required case on the listed hardware.",
      observations:"Observed expected real hardware behavior and logged outputs.",
      evidenceSha256:"b".repeat(64)
    });
  }
  return p;
}
test("P72 starts every real-device and human gate as PENDING",()=>{
  const p=makeAcceptancePlan(SHA);
  assert.equal(p.cases.length,CASES.length);
  assert.ok(CASES.length>=12);
  assert.ok(p.cases.every(c=>c.verdict==="PENDING"&&!c.tester));
  assert.deepEqual(evaluateAcceptance(p,now),{passed:0,failed:0,pending:CASES.length,formatComplete:false,releaseApprovalGranted:false});
});
test("P72 makes format completeness separate from actual release permission",()=>{
  const p=complete();
  assert.deepEqual(evaluateAcceptance(p,now),{passed:CASES.length,failed:0,pending:0,formatComplete:true,releaseApprovalGranted:false});
  p.cases[0].verdict="FAIL";
  assert.equal(evaluateAcceptance(p,now).formatComplete,false);
  assert.equal(evaluateAcceptance(p,now).failed,1);
  p.cases[0].verdict="PENDING";
  assert.equal(evaluateAcceptance(p,now).pending,1);
});
test("P72 refuses fabricated structure, duplicate case, stale SHA, no observations or no evidence digest",()=>{
  const edits=[
    p=>{p.sourceSha="b".repeat(40);},
    p=>{p.status="APPROVED";},
    p=>{p.cases.pop();},
    p=>{p.cases[2].id=p.cases[1].id;},
    p=>{p.cases[2].objective="shortened to conceal criteria";},
    p=>{p.cases[2].testedCommit="b".repeat(40);},
    p=>{p.cases[2].deviceModel="";},
    p=>{p.cases[2].steps="skip";},
    p=>{p.cases[2].observations="pass";},
    p=>{p.cases[2].evidenceSha256="not-a-sha";},
    p=>{p.cases[2].testedAt="2026-10-10T00:00:00.000Z";},
    p=>{p.cases[2].verdict="AUTOMATED_PASS";}
  ];
  for(const f of edits){const p=complete();f(p);assert.throws(()=>evaluateAcceptance(p,now));}
  assert.throws(()=>makeAcceptancePlan("P71"));
});
test("P72 CLI never replaces or fills an existing human record",()=>{
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),"chess-p72-"));
  try{
    const file=path.join(folder,"device-review.json"),tool=path.resolve("scripts/p72-device-acceptance.mjs");
    const result=execFileSync(process.execPath,[tool,"prepare",SHA,file],{encoding:"utf8"});
    assert.match(result,/PENDING.*no approval/);
    assert.equal(JSON.parse(fs.readFileSync(file,"utf8")).cases.every(x=>x.verdict==="PENDING"),true);
    assert.throws(()=>execFileSync(process.execPath,[tool,"prepare",SHA,file],{stdio:"ignore"}));
  }finally{fs.rmSync(folder,{recursive:true,force:true});}
});
