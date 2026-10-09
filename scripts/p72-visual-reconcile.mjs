// Human review reconciliation is observational evidence only.
// It cannot promote screenshots or authorize a production merge.
import fs from "node:fs";
import path from "node:path";
import {pathToFileURL} from "node:url";
import {verifyCandidateManifest,inspectHumanReview} from "./p71-acceptance.mjs";

export function visualDecisionInventory(manifest,review) {
  verifyCandidateManifest(manifest);
  const decisions=review ? inspectHumanReview(manifest,review) : {
    accepted:0,rejected:0,pending:manifest.images.length,readyForIndependentApproval:false
  };
  const index=new Map(review?.images?.map(item=>[item.name,item])??[]);
  const images=manifest.images.map(image=>({
    name:image.name,changed:image.changed,width:image.width,height:image.height,
    oldHash:image.baselineSha256,newHash:image.candidateSha256,
    decision:index.get(image.name)?.decision??"PENDING"
  }));
  return {commit:manifest.commit,status:"HUMAN_REVIEW_PENDING_OR_UNVERIFIED",
    changed:images.filter(item=>item.changed).length,unchanged:images.filter(item=>!item.changed).length,
    decisions,images,releaseAuthorized:false};
}
export function formatVisualInventory(result) {
  return [
    "# P72 Visual Decision Reconciliation",
    "",
    "**NOT APPROVED. A reviewer must inspect the actual image pairs and real interactions.**",
    "",
    "Candidate SHA: `"+result.commit+"`",
    "Changes: "+result.changed+" changed / "+result.unchanged+" unchanged.",
    "Review: "+result.decisions.accepted+" accepted / "+result.decisions.rejected+" rejected / "+result.decisions.pending+" pending.",
    "",
    "| Image | Changed | Old SHA-256 | New SHA-256 | Decision |",
    "| --- | --- | --- | --- | --- |",
    ...result.images.map(i=>"| "+i.name+" | "+(i.changed?"YES":"NO")+" | `"+i.oldHash+"` | `"+i.newHash+"` | "+i.decision+" |"),
    "",
    "No screenshot, manifest or release gate was modified. Human approval must be checked outside CI.",
    ""
  ].join("\n");
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  try{
    const [, ,manifestPath,outputPath,decisionsPath]=process.argv;
    if(!manifestPath||!outputPath)throw Error("Usage: p72-visual-reconcile.mjs <manifest.json> <out.md> [review-decisions.json]");
    const manifest=JSON.parse(fs.readFileSync(manifestPath,"utf8"));
    const decisions=decisionsPath?JSON.parse(fs.readFileSync(decisionsPath,"utf8")):null;
    const summary=visualDecisionInventory(manifest,decisions);
    fs.writeFileSync(outputPath,formatVisualInventory(summary),{flag:"wx"});
    console.log("P72 visual inventory: "+summary.changed+" changed, "+
      summary.unchanged+" unchanged; human review not granted.");
    if(decisions&&(!summary.decisions.readyForIndependentApproval||summary.decisions.rejected))
      process.exitCode=1;
  }catch(e){
    console.error("P72 reconciliation blocked: "+(e?.message||e));process.exitCode=1;
  }
}
