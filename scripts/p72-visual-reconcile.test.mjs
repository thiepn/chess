import {test} from "node:test";
import assert from "node:assert/strict";
import {visualDecisionInventory,formatVisualInventory} from "./p72-visual-reconcile.mjs";
import {makeHumanReviewTemplate} from "./p71-acceptance.mjs";
function fixture(){
  const hash=n=>n.toString(16).padStart(64,"0");
  return {schema:"thiepn-chess-visual-review-v2",commit:"a".repeat(40),status:"UNAPPROVED",
    createdAt:"2026-10-09T10:00:00.000Z",
    images:Array.from({length:18},(_,i)=>({
      name:"test-"+i+"-desktop-linux.png",width:1440,height:900,
      baselineSha256:hash(i+1),candidateSha256:hash(i<12?i+101:i+1),
      changed:i<12
    }))
  };
}
test("P72 emits all 18 decision entries with 12 changed and unapproved defaults",()=>{
  const m=fixture(),v=visualDecisionInventory(m);
  assert.equal(v.changed,12);assert.equal(v.unchanged,6);
  assert.equal(v.decisions.pending,18);assert.equal(v.releaseAuthorized,false);
  assert.equal(v.images.length,18);
  assert.match(formatVisualInventory(v),/NOT APPROVED/);
});
test("P72 refuses mismatched decision hashes instead of reconciling as a pass",()=>{
  const m=fixture(),d=makeHumanReviewTemplate(m);
  d.images[3].candidateSha256="f".repeat(64);
  assert.throws(()=>visualDecisionInventory(m,d));
});
test("P72 keeps pending decisions distinct from release authority",()=>{
  const m=fixture(),d=makeHumanReviewTemplate(m);
  const v=visualDecisionInventory(m,d);
  assert.equal(v.decisions.pending,18);
  assert.equal(v.decisions.readyForIndependentApproval,false);
  assert.equal(v.releaseAuthorized,false);
});
