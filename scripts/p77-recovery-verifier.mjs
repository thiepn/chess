// P77 post-upload independent recovery check. Verifies bytes *after*
// GitHub artifact storage/download, not just the pre-upload workspace.
import fs from "node:fs";
import path from "node:path";
import {pathToFileURL} from "node:url";
import {verifyOfflineCandidatePackage} from "./p76-release-rehearsal.mjs";

const EXPECTED_PROVENANCE=new Set([
  "RELEASE-CANDIDATE.txt","SHA256SUMS.txt","P76-OFFLINE-REHEARSAL.json"
]);
export function verifyRecoveredOffline(root,sha) {
  const base=path.resolve(root);
  const recovered=verifyOfflineCandidatePackage(base,sha);
  const evidenceDir=path.join(base,"candidate-evidence");
  const entries=fs.readdirSync(evidenceDir,{withFileTypes:true});
  if(entries.length!==EXPECTED_PROVENANCE.size ||
     entries.some(x=>!x.isFile()||!EXPECTED_PROVENANCE.has(x.name)))
    throw Error("Recovered candidate includes missing, additional, or symlinked provenance files");
  const original=JSON.parse(fs.readFileSync(path.join(evidenceDir,"P76-OFFLINE-REHEARSAL.json"),"utf8"));
  const requiredKeys=Object.keys(recovered).sort();
  if(Object.keys(original).sort().join("|")!==requiredKeys.join("|") ||
     requiredKeys.some(k=>original[k]!==recovered[k])) {
    throw Error("Pre-upload rehearsal receipt disagrees with independently recovered bytes");
  }
  const hidden=[];
  const list=(dirname)=>{
    for(const ent of fs.readdirSync(path.join(base,dirname),{withFileTypes:true})){
      const relative=dirname+"/"+ent.name;
      if(ent.name.startsWith("."))hidden.push(relative);
      if(ent.isDirectory())list(relative);
      else if(!ent.isFile())throw Error("Recovered artifact contains non-file or symlink: "+relative);
    }
  };
  list("dist");
  if(hidden.length!==1||hidden[0]!=="dist/.vite")
    throw Error("Recovered artifact hidden-file inventory differs from approved build manifest");
  const rootItems=fs.readdirSync(base,{withFileTypes:true});
  if(rootItems.length!==2 || rootItems.some(item=>
    !item.isDirectory()||!["dist","candidate-evidence"].includes(item.name)))
    throw Error("Downloaded offline candidate contains unexpected top-level entries");
  return {
    schema:"thiepn-chess-p77-downloaded-artifact-v1",
    candidateSha:sha,verifiedFiles:recovered.verifiedFiles,
    verifiedHiddenManifest:true,preUploadReceiptReconciled:true,
    downloadedArtifactBytesRehashed:true,artifactType:"OFFLINE_PREVIEW_ONLY",
    authenticatedAccountEvidence:false,productionRollbackExecuted:false,
    humanVisualApproval:false,releaseAuthorized:false,
    verdict:"INTEGRITY_VERIFIED_RELEASE_HOLD",
  };
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  try {
    const [,,artifactDir,sourceSha,outFile]=process.argv;
    if(!artifactDir||!sourceSha||!outFile)
      throw Error("Usage: node scripts/p77-recovery-verifier.mjs <downloaded-artifact-dir> <exact-pr-sha> <new-report.json>");
    const receipt=verifyRecoveredOffline(artifactDir,sourceSha);
    fs.writeFileSync(outFile,JSON.stringify(receipt,null,2)+"\n",{flag:"wx"});
    console.log("P77 independently verified "+receipt.verifiedFiles+" DOWNLOADED build files, including dist/.vite/manifest.json, exact PR head "+sourceSha+". NO PRODUCTION RELEASE.");
  }catch(error){
    console.error("P77 recovered artifact blocked: "+(error?.message??error));
    process.exitCode=1;
  }
}
