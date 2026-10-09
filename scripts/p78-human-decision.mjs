// P78 immutable cross-artifact evidence decision packet.
// Verification of CI metadata, screenshot bytes, offline bytes, and reviewer
// claims is NOT verification of human identity or authorization to deploy.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {pathToFileURL} from "node:url";
import {verifyVisualFiles} from "./p73-verify-visual-artifact.mjs";
import {makeHumanReviewTemplate} from "./p71-acceptance.mjs";
import {CASES} from "./p72-device-acceptance.mjs";
import {intakeHumanReleaseEvidence} from "./p75-human-approval-intake.mjs";
import {verifyRecoveredOffline} from "./p77-recovery-verifier.mjs";
import {rehearseReleaseGate} from "./p76-release-rehearsal.mjs";

const SHA40=/^[a-f0-9]{40}$/;
const sha256=x=>crypto.createHash("sha256").update(x).digest("hex");
const read=(file)=>JSON.parse(fs.readFileSync(file,"utf8"));
const requiredChecks=Object.freeze([
  "Quality","P68 Offline Release Candidate","P67 Visual Candidates",
  "Device UX Prequalification","Visual Regression"
]);
const mandatoryOfflineJobs=Object.freeze([
  "package","Independently verify downloaded guest-only artifact"
]);
function mismatch(message){throw Error("P78 evidence mismatch: "+message);}
function ensure(value,message){if(!value)mismatch(message);}
function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}

export function inspectExactHeadCi({sourceSha,prRuns=[],offlineJobs=[],branchName=null}) {
  ensure(SHA40.test(sourceSha??""),"exact source commit required");
  ensure(Array.isArray(prRuns)&&Array.isArray(offlineJobs),"CI results must be arrays");
  const found=new Map();
  for (const workflow of requiredChecks) {
    const matches=prRuns.filter(x=>x?.name===workflow&&
      x.head_sha===sourceSha&&x.event==="pull_request"&&
      (!branchName||x.head_branch===branchName))
      .sort((a,b)=>(b.run_number??0)-(a.run_number??0));
    const r=matches[0];
    const status=r?.status??"missing",result=r?.conclusion??null;
    const passed=status==="completed"&&result==="success";
    const runId=r?.id??null;
    found.set(workflow,{status,result,passed,runId});
  }
  const offline=found.get("P68 Offline Release Candidate");
  const details=mandatoryOfflineJobs.map(name=>{
    const job=offlineJobs.find(x=>x?.name===name&&x.run_id===offline.runId);
    return {name,runId:offline.runId,status:job?.status??"missing",
      result:job?.conclusion??null,
      passed:job?.status==="completed"&&job?.conclusion==="success"};
  });
  return {
    checks:Object.fromEntries(found),
    offlineRecoveryJobs:details,
    exactHeadMachineQualified:[...found.values()].every(v=>v.passed)&&
      details.every(x=>x.passed),
    mainPushQualified:false,
    releasePermission:false,
  };
}

export function reconcileDownloadedAcceptance({
  visualRoot,offlineRoot,recoveryReceiptPath,sourceSha,
  humanVisual=null,humanDevice=null,privateEvidenceDir=null,
  prRuns=[],offlineJobs=[],branchName=null,now=new Date(),
}){
  ensure(SHA40.test(sourceSha??""),"exact 40-hex source SHA required");
  const root=path.resolve(visualRoot);
  const visualPath=path.join(root,"manifest.json");
  const manifest=read(visualPath);
  const verified=verifyVisualFiles(manifest,root,sourceSha);
  const evidence=read(path.join(root,"p73-image-integrity.json"));
  ensure(evidence.schema===verified.schema&&evidence.sourceSha===sourceSha,
    "P73 source/schema");
  for(const key of ["manifestSha256","total","changed","status","releaseAuthorization"]){
    ensure(evidence[key]===verified[key],"P73 "+key);
  }
  ensure(same(evidence.records,verified.records),"P73 all 18 verified image digests");
  const prior74=read(path.join(root,"p74-release-evidence.json"));
  ensure(prior74.schema==="thiepn-chess-p74-reconciliation-v1"&&
    prior74.sourceSha===sourceSha&&prior74.productionReleaseAuthorized===false&&
    prior74.verdict==="HOLD_HUMAN_AND_PRODUCTION_GATES"&&
    prior74.visual?.manifestSha256===verified.manifestSha256&&
    prior74.visual?.imagesVerified===18&&
    prior74.visual?.changedImages===verified.changed,
    "P74 raw visual evidence and mandatory HOLD");
  const prior75=read(path.join(root,"p75-intake-evidence.json"));
  ensure(prior75.schema==="thiepn-chess-p75-human-intake-v1"&&
    prior75.candidateSha===sourceSha&&
    prior75.status==="HOLD_FOR_INDEPENDENT_HUMAN_ACCEPTANCE"&&
    prior75.visual?.total===18&&prior75.visual?.changed===verified.changed&&
    prior75.physical?.total===CASES.length&&
    prior75.releaseAuthorized===false&&
    prior75.readyToCommitGoldenBaselines===false&&
    prior75.readyToMerge===false&&
    prior75.readyToDeploy===false&&
    prior75.actualReviewerAuthorityEstablished===false,
    "P75 source/status/release boundary");
  // CI-produced templates are PENDING. Later privately held review claims are
  // supplied as additional evidence, and must never overwrite these originals.
  const template=read(path.join(root,"review-template.json"));
  ensure(same(template,makeHumanReviewTemplate(manifest)),
    "unmodified reviewer template/digests");
  const proposal=read(path.join(root,"p75-baseline-proposal.json"));
  ensure(proposal.candidateSha===sourceSha&&
    proposal.proposalOnly===true&&
    proposal.baselineFilesModified===false&&
    proposal.independentlyAuthorized===false&&
    proposal.commitPermission===false&&
    proposal.deploymentPermission===false&&
    Array.isArray(proposal.images)&&proposal.images.length===18,
    "human-only golden baseline gate");
  for(let i=0;i<18;i++){
    const v=manifest.images[i],p=proposal.images[i];
    ensure(p.name===v.name&&p.changed===v.changed&&
      p.baselineSha256===v.baselineSha256&&
      p.candidateSha256===v.candidateSha256&&p.reviewerClaim==="PENDING",
      "baseline review pair "+i);
  }
  ensure(prior74.visual.structuredDecisions.pending===18&&
    prior74.humanAcceptance.structuredCases.pending===CASES.length&&
    prior75.visual.pending===18&&prior75.physical.pending===CASES.length&&
    prior75.physical.verifiedEvidenceFiles===0&&
    prior75.humanFiles.length===0,
    "machine-generated source records must remain fully pending");
  const human=intakeHumanReleaseEvidence({manifest,root,exactHead:sourceSha,
    visualReview:humanVisual,deviceReview:humanDevice,
    evidenceDirectory:privateEvidenceDir,now});
  const recovered=verifyRecoveredOffline(path.resolve(offlineRoot),sourceSha);
  const written=read(path.resolve(recoveryReceiptPath));
  ensure(same(written,recovered),"P77 independent recovery receipt");
  const machine=inspectExactHeadCi({sourceSha,prRuns,offlineJobs,branchName});
  const imageStates=manifest.images.map(entry=>({
    name:entry.name,changed:entry.changed,
    baselineSha256:entry.baselineSha256,candidateSha256:entry.candidateSha256,
    claimedDecision:humanVisual?.images?.find(x=>x.name===entry.name)?.decision??"PENDING",
  }));
  const humanStatuses=new Map((humanDevice?.cases??[]).map(x=>[x.id,x.verdict]));
  return {
    schema:"thiepn-chess-p78-handoff-v1",
    sourceSha,
    evidence:{
      visualArtifactManifestSha256:sha256(fs.readFileSync(visualPath)),
      recoveredReceiptSha256:sha256(fs.readFileSync(recoveryReceiptPath)),
      verifiedPngs:36,changedScreens:verified.changed,
      screenshotDecisionCounts:human.visual,
      physicalDecisionCounts:human.physical,
      offlineBuildFiles:recovered.verifiedFiles,
      downloadedBytesVerified:true,
      privateHumanEvidenceFileHashesChecked:human.physical.verifiedEvidenceFiles,
    },
    imageReview:imageStates,
    manualCases:CASES.map(([id,objective,area])=>({
      id,area,objective,claimedVerdict:humanStatuses.get(id)??"PENDING",
    })),
    automated:machine,
    externalHumanAuthorityCorroborated:false,
    visualBaselineUpdatePermitted:false,
    chessOAuthRegistrationPermitted:false,
    chessAppActivationPermitted:false,
    mergePermitted:false,
    productionRollbackPerformed:false,
    deploymentPermitted:false,
    releaseAuthorized:false,
    decision:"HOLD_FOR_HUMAN_ACCEPTANCE_AND_EXACT_MAIN_SHA",
    blockers:[
      ...(!machine.exactHeadMachineQualified?["All five final-head PR workflows (including both offline jobs) must pass."]:[]),
      ...(human.visual.pending||human.visual.rejected?["All 18 independent screenshot reviews require verified decisions."]:[]),
      ...(human.physical.pending||human.physical.failed?["All 14 physical-device/OAuth/accessibility/educator cases require independent evidence."]:[]),
      "Outside authority must corroborate reviewer identity, real-device observations and OAuth operator permission.",
      "Strict unchanged Playwright visual regression must pass after authorized golden review.",
      "Current immutable main SHA, exact operator approval, controlled rollback and production health remain unverified.",
    ],
  };
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  try{
    const [,,visualRoot,offlineRoot,recoveryReceiptPath,sourceSha,outputPath,
      humanVisualPath,humanDevicePath,privateEvidenceDir,ciPath]=process.argv;
    if(!visualRoot||!offlineRoot||!recoveryReceiptPath||!sourceSha||!outputPath)
      throw Error("Usage: node scripts/p78-human-decision.mjs <unapproved-visual-folder> <downloaded-offline-folder> <P77-RECOVERY.json> <exact-sha> <new-output.json> [private-visual-decisions.json] [private-device-cases.json] [private-evidence-dir] [ci-runs.json]");
    const ci=ciPath?read(ciPath):{};
    const receipt=reconcileDownloadedAcceptance({visualRoot,offlineRoot,recoveryReceiptPath,
      sourceSha,humanVisual:humanVisualPath?read(humanVisualPath):null,
      humanDevice:humanDevicePath?read(humanDevicePath):null,
      privateEvidenceDir,prRuns:ci.runs??[],offlineJobs:ci.offlineJobs??[],
      branchName:ci.branchName??null});
    fs.writeFileSync(outputPath,JSON.stringify(receipt,null,2)+"\n",{flag:"wx"});
    console.log("P78 independently reconciled 36 PNGs and "+receipt.evidence.offlineBuildFiles+
      " downloaded build files for "+sourceSha+"; HOLD, NO RELEASE.");
  }catch(e){
    console.error("P78 acceptance decision blocked: "+(e?.message??e));
    process.exitCode=1;
  }
}
