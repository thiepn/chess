// P76 dry-run release rehearsal. Read-only: checks exact artifact bytes and
// prior workflow metadata; never publishes, updates approvals or claims human signoff.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import {classifyReleaseEvidence} from "./release-evidence.mjs";
import {matchesReleaseApproval} from "./release-approval.mjs";

const SHA40=/^[0-9a-f]{40}$/;
const SHA256=/^[0-9a-f]{64}$/;
const REQUIRED_PR_JOBS=Object.freeze([
  "Quality","Device UX Prequalification","Visual Regression",
  "P67 Visual Candidates","P68 Offline Release Candidate",
]);
const hash=bytes=>crypto.createHash("sha256").update(bytes).digest("hex");

export function verifyOfflineCandidatePackage(root,sourceSha) {
  if(!SHA40.test(sourceSha??""))throw Error("Exact 40-character SHA required");
  const metadataPath=path.join(root,"candidate-evidence","RELEASE-CANDIDATE.txt");
  const sumsPath=path.join(root,"candidate-evidence","SHA256SUMS.txt");
  const meta=Object.create(null);
  for(const line of fs.readFileSync(metadataPath,"utf8").trim().split(/\r?\n/)) {
    const match=/^([a-z_]+)=([A-Za-z0-9_.-]+)$/.exec(line);
    if(!match||Object.hasOwn(meta,match[1]))throw Error("Corrupt or duplicate offline candidate provenance");
    meta[match[1]]=match[2];
  }
  if(meta.candidate_sha!==sourceSha ||
     meta.candidate_type!=="OFFLINE_PREVIEW_ONLY"||
     meta.authenticated_sync!=="NOT_QUALIFIED"||
     meta.production_deploy!=="NO") {
    throw Error("Offline preview provenance is stale or claims production authorization");
  }
  const sums=fs.readFileSync(sumsPath,"utf8").trim().split(/\r?\n/);
  const files=new Map();
  for(const line of sums){
    const match=/^([0-9a-f]{64})  (dist\/[A-Za-z0-9_./@-]+)$/.exec(line);
    if(!match || !SHA256.test(match[1]))throw Error("Invalid offline artifact checksum inventory");
    const name=match[2];
    const normalized=path.posix.normalize(name);
    if(normalized!==name || name.includes("..") || files.has(name)) {
      throw Error("Noncanonical, duplicate or unsafe artifact filename");
    }
    files.set(name,match[1]);
  }
  for(const required of ["dist/index.html","dist/404.html","dist/.vite/manifest.json"]){
    if(!files.has(required))throw Error("Missing mandatory production artifact: "+required);
  }
  function visit(dir){
    const items=fs.readdirSync(path.join(root,dir),{withFileTypes:true});
    for(const ent of items){
      const loc=dir+"/"+ent.name;
      if(ent.isDirectory())visit(loc);
      else if(!ent.isFile()||!files.has(loc))
        throw Error("Unexpected/symlink/unlisted candidate file: "+loc);
    }
  }
  visit("dist");
  for(const [file,wanted] of files){
    const target=path.join(root,...file.split("/"));
    const st=fs.lstatSync(target);
    if(!st.isFile()||st.size<1)throw Error("Empty, symlinked or missing candidate file: "+file);
    if(hash(fs.readFileSync(target))!==wanted)throw Error("Candidate artifact SHA-256 mismatch: "+file);
  }
  return {
    schema:"thiepn-chess-p76-offline-package-v1",
    candidateSha:sourceSha,verifiedFiles:files.size,
    artifactContentsVerified:true,origin:"OFFLINE_PREVIEW_ONLY",
    authenticatedSyncQualified:false,rollbackTestedOnProduction:false,
    readyToDeploy:false,releaseAuthorized:false,
  };
}

export function rehearseReleaseGate({candidateSha,prRuns=[],mainSha=null,mainRuns=[],
  approvedProductionSha=null,rollbackEvidence=null}) {
  if(!SHA40.test(candidateSha??""))throw Error("Exact candidate SHA required");
  const statuses=Object.fromEntries(REQUIRED_PR_JOBS.map(name=>{
    const matches=prRuns.filter(r=>r?.name===name&&r.head_sha===candidateSha&&r.event==="pull_request")
      .sort((a,b)=>(b.run_number??0)-(a.run_number??0));
    const run=matches[0];
    return [name,{state:run?.status??"missing",result:run?.conclusion??null,
      qualified:run?.status==="completed"&&run?.conclusion==="success"}];
  }));
  const automatedPrQualified=Object.values(statuses).every(x=>x.qualified);
  const onMain=mainSha===candidateSha;
  const machineMain=onMain?classifyReleaseEvidence(mainRuns,mainSha):
    {verdict:"not-on-main",reasons:["Candidate is not an immutable main commit"]};
  const exactOperatorApproval=onMain&&matchesReleaseApproval(approvedProductionSha,mainSha);
  const verifiedOfflineOnly=rollbackEvidence?.candidateSha===candidateSha &&
    rollbackEvidence?.artifactContentsVerified===true &&
    rollbackEvidence?.origin==="OFFLINE_PREVIEW_ONLY" &&
    rollbackEvidence?.releaseAuthorized===false;
  return {
    schema:"thiepn-chess-p76-release-rehearsal-v1",
    candidateSha,automatedPrQualified,prChecks:statuses,
    currentMainSha:mainSha,mainPushQualification:machineMain.verdict,
    exactOperatorApprovalClaim:exactOperatorApproval,
    candidatePreviewIntegrity:verifiedOfflineOnly,
    productionRollbackTested:false,
    humanVisualApprovalIndependentlyValidated:false,
    realAccountAndPhysicalDeviceAcceptanceValidated:false,
    productionReleaseAuthorized:false,
    verdict:"REHEARSAL_ONLY_HOLD",
    blockers:[
      ...Object.entries(statuses).filter(([,v])=>!v.qualified).map(([n])=>"PR check missing/failing: "+n),
      ...(!onMain?["Candidate SHA is not current main"]:[]),
      ...(machineMain.verdict!=="ready"?["Required main push checks are not qualified"]:[]),
      ...(!exactOperatorApproval?["No independently approved exact-main-SHA release variable"]:[]),
      ...(!verifiedOfflineOnly?["Candidate offline artifact bytes not verified"]:[]),
      "Visual, OAuth A/B, physical devices, accessibility and pedagogy require actual independent human approval",
      "Rollback execution and real production smoke tests require an authorized operator",
    ],
  };
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  try{
    const [,,command,root,sha]=process.argv;
    if(command!=="inspect-offline"||!root||!sha)
      throw Error("Usage: node scripts/p76-release-rehearsal.mjs inspect-offline <artifact-root> <exact-source-sha>");
    const receipt=verifyOfflineCandidatePackage(path.resolve(root),sha);
    const output=path.join(root,"candidate-evidence","P76-OFFLINE-REHEARSAL.json");
    if(fs.existsSync(output))throw Error("Refusing to overwrite existing rehearsal evidence");
    fs.writeFileSync(output,JSON.stringify(receipt,null,2)+"\n",{flag:"wx"});
    console.log("P76 verified "+receipt.verifiedFiles+" offline files, exact SHA "+
      sha+"; NO RELEASE, NO ROLLBACK CLAIM.");
  }catch(error){
    console.error("P76 rehearsal blocked: "+(error?.message??error));process.exitCode=1;
  }
}
