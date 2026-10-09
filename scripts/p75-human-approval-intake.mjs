// P75: verify *actual redacted human evidence bytes* while keeping manual
// approval entirely outside CI. This never approves snapshots or release.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import { verifyVisualFiles } from "./p73-verify-visual-artifact.mjs";
import { inspectHumanReview, makeHumanReviewTemplate } from "./p71-acceptance.mjs";
import { evaluateAcceptance, makeAcceptancePlan, CASES } from "./p72-device-acceptance.mjs";
import { reconcileReleaseEvidence } from "./p74-release-reconcile.mjs";
const SHA40=/^[a-f0-9]{40}$/;
const DIGEST=/^[a-f0-9]{64}$/;
const MAX_EVIDENCE_BYTES=128*1024*1024;
const digest=bytes=>crypto.createHash("sha256").update(bytes).digest("hex");

export function verifyPhysicalEvidenceBytes(plan, evidenceDirectory) {
  if (!plan || !Array.isArray(plan.cases) || plan.cases.length!==CASES.length) {
    throw new Error("Human acceptance cases must be complete");
  }
  const listed=[];
  let verified=0;
  for(const testCase of plan.cases) {
    if(testCase.verdict==="PENDING") continue;
    if(testCase.verdict!=="PASS" && testCase.verdict!=="FAIL") {
      throw new Error("Invalid human test result for "+String(testCase.id));
    }
    if(!evidenceDirectory) {
      throw new Error("Redacted physical evidence files required for executed case "+testCase.id);
    }
    if(!CASES.some(([id])=>id===testCase.id))throw new Error("Unknown human acceptance case");
    const filename=testCase.id+".evidence";
    const location=path.join(evidenceDirectory,filename);
    const stat=fs.lstatSync(location);
    if(!stat.isFile() || stat.size<1 || stat.size>MAX_EVIDENCE_BYTES)
      throw new Error("Evidence must be a nonempty regular file: "+filename);
    const bytes=fs.readFileSync(location);
    const actual=digest(bytes);
    if(!DIGEST.test(testCase.evidenceSha256??"") || testCase.evidenceSha256!==actual)
      throw new Error("Recorded evidence SHA-256 mismatch: "+filename);
    verified++;
    listed.push({caseId:testCase.id,name:filename,bytes:bytes.length,sha256:actual});
  }
  return {verified,files:listed,provesHumanAuthority:false};
}

export function buildBaselineProposal(manifest, visualReview) {
  const decisions=visualReview ? inspectHumanReview(manifest,visualReview) :
    inspectHumanReview(manifest,makeHumanReviewTemplate(manifest));
  const lookup=new Map((visualReview?.images??[]).map(x=>[x.name,x]));
  return {
    schema:"thiepn-chess-p75-proposed-baseline-v1",
    candidateSha:manifest.commit,images:manifest.images.map(image=>({
      name:image.name,
      baselineSha256:image.baselineSha256,
      candidateSha256:image.candidateSha256,
      changed:image.changed,
      reviewerClaim:lookup.get(image.name)?.decision??"PENDING",
    })),
    reviewsRecorded:decisions,
    proposalOnly:true,
    baselineFilesModified:false,
    independentlyAuthorized:false,
    commitPermission:false,
    deploymentPermission:false,
  };
}

export function intakeHumanReleaseEvidence({manifest,root,exactHead,visualReview=null,deviceReview=null,evidenceDirectory=null,now=new Date()}) {
  if(!SHA40.test(exactHead??"") || manifest?.commit!==exactHead)throw new Error("Wrong exact-head source");
  const integrity=verifyVisualFiles(manifest,root,exactHead);
  const base=reconcileReleaseEvidence({
    manifest,integrity,expectedSha:exactHead,
    visualDecisions:visualReview,deviceDecisions:deviceReview,now
  });
  const physical=verifyPhysicalEvidenceBytes(deviceReview??makeAcceptancePlan(exactHead),evidenceDirectory);
  const proposal=buildBaselineProposal(manifest,visualReview);
  const pending=proposal.reviewsRecorded.pending+base.humanAcceptance.structuredCases.pending;
  const rejected=proposal.reviewsRecorded.rejected+base.humanAcceptance.structuredCases.failed;
  return {
    schema:"thiepn-chess-p75-human-intake-v1",
    candidateSha:exactHead,
    status:"HOLD_FOR_INDEPENDENT_HUMAN_ACCEPTANCE",
    visual:{total:integrity.total,changed:integrity.changed,
      pending:proposal.reviewsRecorded.pending,rejected:proposal.reviewsRecorded.rejected,
      acceptedClaims:proposal.reviewsRecorded.accepted},
    physical:{total:CASES.length,pending:base.humanAcceptance.structuredCases.pending,
      failed:base.humanAcceptance.structuredCases.failed,
      recordedPassClaims:base.humanAcceptance.structuredCases.passed,
      verifiedEvidenceFiles:physical.verified},
    humanFiles:physical.files,
    unresolved:{pending,rejected},
    // These booleans intentionally cannot change due to self-reported case values.
    actualReviewerAuthorityEstablished:false,
    approvedGoldenSnapshots:false,
    readyToCommitGoldenBaselines:false,
    readyToMerge:false,
    readyToDeploy:false,
    releaseAuthorized:false,
    reasons:[
      "Verification of bytes and structured human claims is not independent review.",
      "Visual baseline approval and strict Playwright comparison remain operator controlled.",
      "Real OAuth client registration and live A/B, revocation, cross-device acceptance remain operator-only.",
      "Physical-device, accessibility, instructor and release approvals require external corroboration.",
      "Final push-to-main release gate and approved immutable main SHA are not established.",
    ]
  };
}

export function formatHumanIntake(record) {
  return [
    "# P75 — Independent human approval intake",
    "",
    "**HOLD — no approval, no snapshot update, no merge and no deployment.**",
    "",
    "Exact source: \`"+record.candidateSha+"\`",
    "Visual images: "+record.visual.total+"; changed: "+record.visual.changed+
      "; accepted claims: "+record.visual.acceptedClaims+
      "; pending: "+record.visual.pending+"; rejected: "+record.visual.rejected,
    "Real-device/OAuth/accessibility/instructor cases: "+record.physical.total+
      "; PASS claims: "+record.physical.recordedPassClaims+
      "; independent redacted file hashes matched: "+record.physical.verifiedEvidenceFiles+
      "; pending: "+record.physical.pending+"; failed: "+record.physical.failed,
    "",
    "An operator must independently inspect the real files and corroborate reviewer",
    "identity, hardware observations, Account/PKCE configuration and permissions.",
    "Passing this tool **never approves** a visual baseline or production release.",
    "",
    "## Remaining gates",
    ...record.reasons.map(s=>"- [ ] "+s),
    "",
    "Baseline updates authorized: NO. Merge authorized: NO. Deploy authorized: NO.",
    "",
  ].join("\n");
}

if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  try{
    const [,,folder,sha,visualPath,devicePath,evidenceDir]=process.argv;
    if(!folder||!sha)throw new Error("Usage: node scripts/p75-human-approval-intake.mjs <visual-artifact-dir> <exact-head-sha> [human-review.json] [device-report.json] [redacted-evidence-dir]");
    const root=path.resolve(folder);
    const manifest=JSON.parse(fs.readFileSync(path.join(root,"manifest.json"),"utf8"));
    const read=p=>p?JSON.parse(fs.readFileSync(p,"utf8")):null;
    const visualReview=read(visualPath),deviceReview=read(devicePath);
    const record=intakeHumanReleaseEvidence({manifest,root,exactHead:sha,
      visualReview,deviceReview,evidenceDirectory:evidenceDir});
    const proposal=buildBaselineProposal(manifest,visualReview);
    const destinations=[
      [path.join(root,"p75-intake-evidence.json"),JSON.stringify(record,null,2)+"\n"],
      [path.join(root,"p75-baseline-proposal.json"),JSON.stringify(proposal,null,2)+"\n"],
      [path.join(root,"p75-human-review-guide.md"),formatHumanIntake(record)],
    ];
    for(const [p] of destinations)if(fs.existsSync(p))
      throw new Error("Refusing to overwrite previous acceptance packet");
    for(const [p,data] of destinations)fs.writeFileSync(p,data,{flag:"wx"});
    console.log("P75 verified "+record.visual.total+" actual visual pairs; "+
      record.physical.verifiedEvidenceFiles+" physical evidence files. NO APPROVAL.");
  }catch(e){console.error("P75 human approval intake blocked: "+(e?.message??e));process.exitCode=1;}
}
