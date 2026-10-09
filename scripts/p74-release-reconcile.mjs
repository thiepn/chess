// P74 read-only acceptance receipt: verifies files and recorded decisions,
// but NEVER grants release approval or promotes screenshot baselines.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import { verifyVisualFiles } from "./p73-verify-visual-artifact.mjs";
import { inspectHumanReview } from "./p71-acceptance.mjs";
import { evaluateAcceptance, makeAcceptancePlan, CASES } from "./p72-device-acceptance.mjs";
const SHA40=/^[a-f0-9]{40}$/;
const hash=bytes=>crypto.createHash("sha256").update(bytes).digest("hex");

export function reconcileReleaseEvidence({manifest,integrity,expectedSha,visualDecisions=null,deviceDecisions=null,now=new Date()}) {
  if(!SHA40.test(expectedSha??"") || manifest?.commit!==expectedSha ||
     integrity?.sourceSha!==expectedSha || integrity?.status!=="UNAPPROVED" ||
     integrity.releaseAuthorization!==false || integrity.total!==18 ||
     !Array.isArray(integrity.records) || integrity.records.length!==18 ||
     integrity.changed!==manifest.images.filter(x=>x.changed).length) {
    throw new Error("Acceptance data not bound to exact source and unapproved visual evidence");
  }
  for (let n=0;n<18;n++){
    const r=integrity.records[n],v=manifest.images[n];
    if (!r||!v||r.name!==v.name||r.changed!==v.changed||
        r.baselineSha256!==v.baselineSha256||r.candidateSha256!==v.candidateSha256)
      throw new Error("Inconsistent screenshot data in release receipt");
  }
  // These are merely self-reported human *claims*. There is no way for CI
  // to prove the reviewer inspected a real physical device or owns authority.
  const visual=visualDecisions
    ? inspectHumanReview(manifest,visualDecisions,now)
    : {accepted:0,rejected:0,pending:18,readyForIndependentApproval:false};
  const devices=evaluateAcceptance(deviceDecisions??makeAcceptancePlan(expectedSha),now);
  if(deviceDecisions?.sourceSha && deviceDecisions.sourceSha!==expectedSha)
    throw new Error("Stale hardware/account acceptance references another source SHA");
  const reasons=[
    "Exact-main-SHA production release approval has not been established.",
    "Independent reviewer identity and authority must be checked outside automation.",
    "Strict Visual Regression must pass after independently approved baselines.",
    "First-party Chess OAuth registration, real-user A/B and revoked-session tests need operator approval.",
    "Actual Android/iPhone/iPad, screen readers, clocks and educator review need human evidence.",
  ];
  if(!visualDecisions||visual.pending||visual.rejected)
    reasons.push("Visual reviewer decisions are missing, rejected or incomplete.");
  if(!deviceDecisions||devices.pending||devices.failed)
    reasons.push("Physical-device, OAuth, accessibility or educator decisions are missing or failed.");
  return {
    schema:"thiepn-chess-p74-reconciliation-v1",
    sourceSha:expectedSha,
    visual:{
      imagesVerified:18,changedImages:integrity.changed,
      manifestSha256:integrity.manifestSha256,integrityUnapproved:true,
      independentHumanDecisionsSupplied:Boolean(visualDecisions),
      structuredDecisions:visual
    },
    humanAcceptance:{
      casesRequired:CASES.length,
      independentEvidenceSupplied:Boolean(deviceDecisions),
      structuredCases:devices
    },
    // Intentionally unconditionally false: this artifact has no authority.
    productionReleaseAuthorized:false,
    verdict:"HOLD_HUMAN_AND_PRODUCTION_GATES",
    reasons,
  };
}

export function composeHumanReviewGuide(receipt){
  return [
    "# P74 — Chess release acceptance packet (no approvals issued)",
    "",
    "**HOLD:** This is a machine-created checklist. No screenshot, OAuth",
    "connection, physical device, educator review or release has been approved.",
    "",
    "- Exact candidate commit: \`"+receipt.sourceSha+"\`",
    "- Screenshot pairs: 18 verified, "+receipt.visual.changedImages+" changed; manual reviewer evidence present: "+receipt.visual.independentHumanDecisionsSupplied,
    "- Device/account/educator cases: "+CASES.length+"; human evidence present: "+receipt.humanAcceptance.independentEvidenceSupplied,
    "",
    "## Visual review",
    "Open the matching before/after review HTML from this exact SHA; all 18",
    "image decisions need independent reviewer evidence bound to both hashes.",
    "Screen captures do not qualify keyboard navigation, accessible names or touch behavior.",
    "Do not replace golden images until the independent reviewer explicitly approves them.",
    "",
    "## Physical hardware and authenticated Account checks",
    ...CASES.map(([id,goal])=>"- [ ] **"+id+"** — "+goal),
    "",
    "## Operator-only Chess first-party OAuth registration",
    "Account app is inactive with zero Chess OAuth clients at the last read-only inspection.",
    "Authorized operator must manually register an app-scoped PKCE public client for",
    "\`https://chess.thiepn.dev/auth/callback/\`, then perform real A/B→guest",
    "partitioning, revocation, access grants and independent-device conflict tests.",
    "Never generate a client UUID, activate the app or insert credentials from CI.",
    "",
    "## Promotion checklist",
    "- [ ] Strict Visual Regression green at final reviewed head, unchanged tolerances.",
    "- [ ] Quality, Device UX, P67 candidate integrity and offline checks green for same exact head.",
    "- [ ] Human sign-offs corroborated with redacted evidence and reviewer authority.",
    "- [ ] Ordered stacked PR merges explicitly authorized.",
    "- [ ] Three required main-push checks green at the resulting **main SHA**.",
    "- [ ] Authorized operator sets CHESS_RELEASE_APPROVED_SHA to that exact main SHA.",
    "- [ ] Independent rollback/artifact checks and post-release real-user smoke test.",
    "",
    "**Production release authorization: FALSE.**",
    ""
  ].join("\n");
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  try{
    const [,,dir,exactHead,reviewPath,devicePath]=process.argv;
    if(!dir||!exactHead)throw new Error("Usage: node scripts/p74-release-reconcile.mjs <candidate-folder> <exact-head-sha> [human-visual-decisions.json] [human-device-evidence.json]");
    const base=path.resolve(dir);
    const manifest=JSON.parse(fs.readFileSync(path.join(base,"manifest.json"),"utf8"));
    // Independent on-disk hash verification -- not just supplied JSON assertions.
    const integrity=verifyVisualFiles(manifest,base,exactHead);
    const read=filename=>filename?JSON.parse(fs.readFileSync(filename,"utf8")):null;
    const visual=read(reviewPath);
    const devices=read(devicePath);
    const receipt=reconcileReleaseEvidence({manifest,integrity,expectedSha:exactHead,
      visualDecisions:visual,deviceDecisions:devices});
    const outputs=[
      ["p74-release-evidence.json",JSON.stringify(receipt,null,2)+"\n"],
      ["p74-human-acceptance-guide.md",composeHumanReviewGuide(receipt)],
    ];
    for(const [name] of outputs)if(fs.existsSync(path.join(base,name)))
      throw new Error("Refusing overwrite of existing release evidence: "+name);
    for(const [name,data] of outputs)fs.writeFileSync(path.join(base,name),data,{flag:"wx"});
    console.log("P74 integrity and structured evidence validated for "+exactHead+
      "; verdict HOLD, not approved and not deployed.");
  }catch(error){
    console.error("P74 reconciliation blocked: "+(error?.message??error));
    process.exitCode=1;
  }
}
