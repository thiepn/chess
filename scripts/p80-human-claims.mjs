// P80 private, source-bound HUMAN CLAIM intake. This never authorizes
// screenshot golden updates, an OAuth client, release, merge or deployment.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {pathToFileURL} from "node:url";
import {buildIndependentReviewPacket} from "./p79-independent-review.mjs";
import {inspectHumanReview,makeHumanReviewTemplate} from "./p71-acceptance.mjs";
import {evaluateAcceptance,makeAcceptancePlan,CASES} from "./p72-device-acceptance.mjs";
import {verifyPhysicalEvidenceBytes} from "./p75-human-approval-intake.mjs";

const hash=bytes=>crypto.createHash("sha256").update(bytes).digest("hex");
const read=file=>JSON.parse(fs.readFileSync(file,"utf8"));
const SHA=/^[a-f0-9]{40}$/;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const forbid=(message)=>{throw Error("P80 private intake rejected: "+message)};
function assert(ok,message){if(!ok)forbid(message)}
function childOf(folder,parent) {
  const relative=path.relative(parent,folder);
  return !relative.startsWith(".."+path.sep)&&relative!==".."&&!path.isAbsolute(relative);
}

export function inspectIndependentHumanClaims({
  visualRoot,sourceSha,visualDecisions=null,devicePlan=null,
  privateEvidenceDir=null,now=new Date()
}) {
  assert(SHA.test(sourceSha??""),"exact source SHA is required");
  assert(now instanceof Date&&Number.isFinite(now.getTime()),"valid review evaluation time");
  const root=path.resolve(visualRoot);
  const {packet}=buildIndependentReviewPacket(root,sourceSha);
  const original=read(path.join(root,"p79-independent-review-request.json"));
  assert(same(original,packet),"P79 source artifact is missing or has been modified");
  const manifest=read(path.join(root,"manifest.json"));
  const visual=inspectHumanReview(manifest,
    visualDecisions??makeHumanReviewTemplate(manifest),now);
  const plan=devicePlan??makeAcceptancePlan(sourceSha);
  assert(plan.sourceSha===sourceSha,"device decisions reference the wrong exact commit");
  const physical=evaluateAcceptance(plan,now);
  if(physical.passed+physical.failed>0) {
    assert(typeof privateEvidenceDir==="string"&&privateEvidenceDir.length>0,
      "private redacted evidence directory is required for completed device cases");
    const privatePath=fs.realpathSync(privateEvidenceDir);
    const visualPath=fs.realpathSync(root);
    assert(!childOf(privatePath,visualPath)&&!childOf(visualPath,privatePath),
      "private human evidence must be stored separately from the uploaded visual artifact");
    const listed=fs.readdirSync(privatePath,{withFileTypes:true});
    const expected=new Set(plan.cases.filter(x=>x.verdict!=="PENDING")
      .map(x=>x.id+".evidence"));
    assert(listed.length===expected.size&&
      listed.every(x=>x.isFile()&&expected.has(x.name)),
      "private evidence inventory contains missing, extra, or symlinked files");
  }
  const verified=verifyPhysicalEvidenceBytes(plan,privateEvidenceDir);
  assert(verified.verified===physical.passed+physical.failed,
    "missing independent bytes for completed case");
  const digestSource=Buffer.from(JSON.stringify({
    sourceSha,
    sourceManifestSha256:packet.sourceManifestSha256,
    visual:visualDecisions??null,
    device:devicePlan??null,
    evidenceFiles:verified.files
  }),"utf8");
  const claimDigest=hash(digestSource);
  const visualByName=new Map((visualDecisions?.images??[]).map(x=>[x.name,x]));
  const physicalById=new Map(plan.cases.map(x=>[x.id,x]));
  return {
    schema:"thiepn-chess-p80-human-claim-intake-v1",
    sourceSha,visualManifestSha256:packet.sourceManifestSha256,
    importedClaimsSha256:claimDigest,
    claimsProvided:{visual:visualDecisions!==null,devices:devicePlan!==null},
    sourceVisualPairsVerified:packet.screenshots.count,
    changedScreens:packet.screenshots.changed,
    imageDecisions:packet.screenshots.items.map(row=>({
      name:row.name,baselineSha256:row.baselineSha256,
      candidateSha256:row.candidateSha256,
      claimedDecision:visualByName.get(row.name)?.decision??"PENDING"
    })),
    visualClaims:{accepted:visual.accepted,rejected:visual.rejected,pending:visual.pending},
    deviceClaims:{passed:physical.passed,failed:physical.failed,pending:physical.pending,
      redactedEvidenceFilesHashVerified:verified.verified},
    manualCases:CASES.map(([id,objective,area])=>({
      id,area,objective,
      claimedVerdict:physicalById.get(id)?.verdict??"PENDING",
      evidenceSha256:physicalById.get(id)?.verdict!=="PENDING"?
        physicalById.get(id)?.evidenceSha256:null
    })),
    // Important: a format-valid statement, even all ACCEPT/PASS, is
    // never independent confirmation of reviewer authority or device proof.
    independentlyVerifiedHumanIdentity:false,
    physicalObservationIndependentlyCorroborated:false,
    educatorSignoffIndependentlyCorroborated:false,
    visualGoldenUpdateAuthorized:false,
    chessOAuthRegistrationAuthorized:false,
    chessOAuthActivationAuthorized:false,
    mergeAuthorized:false,
    productionRollbackExecuted:false,
    productionDeployAuthorized:false,
    releaseAuthorized:false,
    verdict:"HOLD_EXTERNAL_HUMAN_AUTHORITY_AND_MAIN_RELEASE_GATES",
    blockers:[
      ...(visual.pending?["Missing visual decisions: "+visual.pending]:[]),
      ...(visual.rejected?["Visual reviewer claims rejected: "+visual.rejected]:[]),
      ...(physical.pending?["Missing physical/account/accessibility/educator cases: "+physical.pending]:[]),
      ...(physical.failed?["Human test claims failed: "+physical.failed]:[]),
      "External reviewers must independently establish authority, real hardware and actual observation.",
      "Unchanged strict screenshot comparison requires separately authorized reference update.",
      "Chess OAuth registration and real A/B/two-device acceptance require Account operator permission.",
      "Main-push exact SHA, real production rollback, approved release variable and deploy approval are absent."
    ]
  };
}

export function writeHumanClaimsRecord(options,outFile) {
  const record=inspectIndependentHumanClaims(options);
  const dest=path.resolve(outFile);
  const source=fs.realpathSync(options.visualRoot);
  const targetParent=fs.realpathSync(path.dirname(dest));
  // Operator evidence intake must not publish private claim metadata into the
  // generated visual artifact. Only the empty generated HOLD goes in CI.
  const hasPrivateClaims=options.visualDecisions!==null||options.devicePlan!==null;
  if(hasPrivateClaims)assert(!childOf(targetParent,source),
    "private claim summary must not be written inside uploadable visual artifacts");
  fs.writeFileSync(dest,JSON.stringify(record,null,2)+"\n",{flag:"wx",mode:0o600});
  return record;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  try{
    const [,,visualRoot,sourceSha,outFile,visualFile,deviceFile,evidenceDirectory]=process.argv;
    if(!visualRoot||!sourceSha||!outFile)throw Error(
      "Usage: node scripts/p80-human-claims.mjs <visual-root> <exact-source-sha> <new-output.json> [private-visual.json] [private-device.json] [private-evidence-dir]");
    const result=writeHumanClaimsRecord({
      visualRoot,sourceSha,
      visualDecisions:visualFile?read(visualFile):null,
      devicePlan:deviceFile?read(deviceFile):null,
      privateEvidenceDir:evidenceDirectory??null
    },outFile);
    console.log("P80 processed "+result.sourceVisualPairsVerified+
      " source-bound visual pairs and "+CASES.length+
      " human cases; claims only, NO HUMAN APPROVAL OR RELEASE.");
  }catch(e){console.error(e?.message??e);process.exitCode=1;}
}
