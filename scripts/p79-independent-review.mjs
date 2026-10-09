// P79 reproducible *request* for independent review of exact-head evidence.
// This packet never records human acceptance or confers release authorization.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {pathToFileURL} from "node:url";
import {verifyVisualFiles} from "./p73-verify-visual-artifact.mjs";
import {makeHumanReviewTemplate} from "./p71-acceptance.mjs";
import {makeAcceptancePlan,CASES} from "./p72-device-acceptance.mjs";

const sha256=bytes=>crypto.createHash("sha256").update(bytes).digest("hex");
const read=file=>JSON.parse(fs.readFileSync(file,"utf8"));
const sha40=/^[0-9a-f]{40}$/;
function requireEvidence(ok,message){if(!ok)throw Error("P79 independent review packet blocked: "+message);}
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

/** Build the packet ONLY from physically present visual evidence. */
export function buildIndependentReviewPacket(root,exactSha) {
  requireEvidence(sha40.test(exactSha??""),"exact 40-character SHA");
  const manifestPath=path.join(root,"manifest.json");
  const manifest=read(manifestPath);
  const verified=verifyVisualFiles(manifest,root,exactSha);
  const p73=read(path.join(root,"p73-image-integrity.json"));
  requireEvidence(equal(verified,p73),"P73 byte-level manifest and 36 PNG proof mismatch");
  const p74=read(path.join(root,"p74-release-evidence.json"));
  requireEvidence(p74.schema==="thiepn-chess-p74-reconciliation-v1"&&
    p74.sourceSha===exactSha&&p74.verdict==="HOLD_HUMAN_AND_PRODUCTION_GATES"&&
    p74.productionReleaseAuthorized===false&&
    p74.visual?.imagesVerified===18&&
    p74.visual?.changedImages===verified.changed&&
    p74.visual?.manifestSha256===verified.manifestSha256&&
    p74.visual?.structuredDecisions?.pending===18&&
    p74.visual?.structuredDecisions?.accepted===0&&
    p74.visual?.structuredDecisions?.rejected===0&&
    p74.humanAcceptance?.structuredCases?.pending===CASES.length,
    "P74 must be source-bound and fully HOLD");
  const p75=read(path.join(root,"p75-intake-evidence.json"));
  requireEvidence(p75.schema==="thiepn-chess-p75-human-intake-v1"&&
    p75.candidateSha===exactSha&&
    p75.status==="HOLD_FOR_INDEPENDENT_HUMAN_ACCEPTANCE"&&
    p75.visual?.total===18&&p75.visual?.changed===verified.changed&&
    p75.visual?.pending===18&&p75.visual?.acceptedClaims===0&&
    p75.physical?.total===CASES.length&&p75.physical?.pending===CASES.length&&
    p75.physical?.verifiedEvidenceFiles===0&&
    Array.isArray(p75.humanFiles)&&p75.humanFiles.length===0&&
    p75.actualReviewerAuthorityEstablished===false&&
    p75.approvedGoldenSnapshots===false&&
    p75.readyToCommitGoldenBaselines===false&&
    p75.readyToMerge===false&&p75.readyToDeploy===false&&
    p75.releaseAuthorized===false,
    "P75 immutable unapproved/human-pending receipt");
  const expectedVisual=makeHumanReviewTemplate(manifest);
  requireEvidence(equal(read(path.join(root,"review-template.json")),expectedVisual),
    "P71 review template was modified or pre-approved");
  const proposal=read(path.join(root,"p75-baseline-proposal.json"));
  requireEvidence(proposal.schema==="thiepn-chess-p75-proposed-baseline-v1"&&
    proposal.candidateSha===exactSha&&
    proposal.proposalOnly===true&&proposal.baselineFilesModified===false&&
    proposal.independentlyAuthorized===false&&
    proposal.commitPermission===false&&proposal.deploymentPermission===false&&
    proposal.images?.length===18,"P75 baseline proposal must never grant golden permission");
  for (let i=0;i<manifest.images.length;i++){
    const m=manifest.images[i],p=proposal.images[i];
    requireEvidence(p.name===m.name&&p.baselineSha256===m.baselineSha256&&
      p.candidateSha256===m.candidateSha256&&p.changed===m.changed&&
      p.reviewerClaim==="PENDING","P75 reviewer proposal record "+m.name);
  }
  const imageRows=manifest.images.map((m)=>({
    name:m.name,changed:m.changed,width:m.width,height:m.height,
    baselineSha256:m.baselineSha256,candidateSha256:m.candidateSha256,
    baselineRelativePath:"baseline/"+m.name,
    candidateRelativePath:"candidate/"+m.name,
    independentDecision:"PENDING",
  }));
  const deviceTemplate=makeAcceptancePlan(exactSha);
  const packet={
    schema:"thiepn-chess-p79-independent-review-request-v1",
    sourceSha:exactSha,sourceManifestSha256:sha256(fs.readFileSync(manifestPath)),
    screenshots:{count:imageRows.length,changed:verified.changed,
      pending:imageRows.length,items:imageRows},
    manual:{count:CASES.length,pending:CASES.length,
      cases:CASES.map(([id,objective,area])=>({id,objective,area,decision:"PENDING"}))},
    candidateType:"UNAPPROVED_VISUAL_REVIEW",
    provenanceVerified:true,independentHumanDecisionSupplied:false,
    reviewerIdentityVerified:false,externalReviewAuthorityEstablished:false,
    visualBaselineModificationAuthorized:false,
    accountOAuthRegistrationAuthorized:false,
    accountActivationAuthorized:false,
    independentDeviceValidationComplete:false,
    independentEducatorApproval:false,
    mergeAuthorized:false,rollbackPerformed:false,
    deploymentAuthorized:false,releaseAuthorized:false,
    verdict:"HOLD_INDEPENDENT_REVIEW_REQUIRED",
  };
  return {packet,visualTemplate:expectedVisual,deviceTemplate};
}

export function reviewPacketMarkdown(packet){
  requireEvidence(packet?.schema==="thiepn-chess-p79-independent-review-request-v1"&&
    packet.releaseAuthorized===false&&packet.screenshots.count===18&&
    packet.manual.count===CASES.length,"review queue source");
  const lines=[
    "# P79 — Independent reviewer work queue",
    "",
    "**HOLD — zero approvals, no golden replacement, no OAuth activation, no merge/deploy.**",
    "",
    "Exact source SHA: \`"+packet.sourceSha+"\`",
    "Exact visual manifest SHA-256: \`"+packet.sourceManifestSha256+"\`",
    "36 PNG bytes independently verified: YES. Changed: "+packet.screenshots.changed+
      ". Pending visual decisions: "+packet.screenshots.pending+".",
    "",
    "## Human visual review — ALL 18 required",
    "",
    "Open \`index.html\` within the artifact or use the relative PNG links below.",
    "Inspect real interaction, mobile/desktop layout, focus/keyboard, 200% zoom and contrast on actual hardware.",
    "Record ACCEPT/REJECT for *each* hash-bound pair in a **private copy** of \`review-template.json\`; never edit the generated original.",
    "",
    "| Pair | Changed | Dimensions | Baseline | Candidate | Decision |",
    "|---|---|---|---|---|---|",
    ...packet.screenshots.items.map(x=>"| "+x.name+" | "+(x.changed?"YES":"NO")+
      " | "+x.width+"×"+x.height+" | [before]("+x.baselineRelativePath+
      ") | [after]("+x.candidateRelativePath+") | PENDING |"),
    "",
    "## Independent device, account, accessibility and pedagogy cases",
    "",
    "Each real case needs actual person/device observations and privately stored redacted SHA-256-bound evidence.",
    "Copy \`p79-device-template.json\` privately and retain real evidence outside public GitHub artifacts.",
    "",
    "| Case ID | Area | Required real acceptance | Status |",
    "|---|---|---|---|",
    ...packet.manual.cases.map(x=>"| "+x.id+" | "+x.area+" | "+
      x.objective.replace(/\|/g,"\\|")+" | PENDING |"),
    "",
    "## Operator-only release boundary",
    "",
    "- Chess OAuth client is not created or activated by this packet; independently confirm live Account configuration and callback.",
    "- Independently inspect two distinct physical account/device sessions, A/B isolation, revocation and conflict recovery.",
    "- Independent chess educator must inspect actual 86 lessons and 49 retrieval-only cases.",
    "- No screenshot baseline may change without separate human approval on exact image hashes.",
    "- Re-run unchanged strict Playwright screenshots after any separately approved golden commit.",
    "- Verify exact-current-main push checks, human operator authorization, real rollback test and deployed production SHA.",
    "- The existence of this worksheet is **not** a human signature, deployment authorization or proof of release readiness.",
    "",
  ];
  return lines.join("\n");
}

export function writeIndependentReviewPacket(root,exactSha){
  const {packet,deviceTemplate}=buildIndependentReviewPacket(root,exactSha);
  const outputs=[
    ["p79-independent-review-request.json",JSON.stringify(packet,null,2)+"\n"],
    ["p79-independent-review-queue.md",reviewPacketMarkdown(packet)],
    ["p79-device-template.json",JSON.stringify(deviceTemplate,null,2)+"\n"],
  ];
  for(const [file] of outputs){
    const target=path.join(root,file);
    requireEvidence(!fs.existsSync(target)&&!fs.existsSync(target+".tmp"),
      "refusing to overwrite a previous review artifact: "+file);
  }
  // Exclusive writes: never overwrite an existing reviewer file or decision record.
  for(const [file,data] of outputs)
    fs.writeFileSync(path.join(root,file),data,{flag:"wx",mode:0o600});
  return packet;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  try{
    const [,,root,sha]=process.argv;
    if(!root||!sha)throw Error("Usage: node scripts/p79-independent-review.mjs <visual-artifact-folder> <exact-pr-head-sha>");
    const packet=writeIndependentReviewPacket(path.resolve(root),sha);
    console.log("P79 prepared "+packet.screenshots.count+" verified paired screenshots and "+
      packet.manual.count+" PENDING independent cases for "+sha+"; NO APPROVAL.");
  }catch(e){
    console.error(e?.message??e);process.exitCode=1;
  }
}
