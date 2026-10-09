// P72 evidence schema for actual people and real devices.
// Machine validation only: this module never grants production approval.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SHA40=/^[a-f0-9]{40}$/;
const HASH=/^[a-f0-9]{64}$/;
export const CASES=Object.freeze([
  ["android-game-recovery","Android Chrome physical device: play, promotion, reload, true Stockfish restore and background 10+0/15+10 clocks","android"],
  ["android-pwa-offline","Android Chrome PWA home-screen launch, disconnect/recovery, small viewport and landscape","android"],
  ["iphone-webkit-recovery","iPhone Safari physical device: reload, deep link, promotion, game/engine lifetime and 200% zoom","iphone"],
  ["ipad-webkit-split-view","iPad Safari physical device: portrait/landscape, split view, input and background resume","ipad"],
  ["desktop-chromium-game","Desktop Chrome: keyboard navigation, finished engine game, PGN review, offline restore","desktop"],
  ["desktop-edge-accessibility","Desktop Edge: keyboard-only focus, 200% browser zoom, reduced motion and 10+0/15+10 clocks","desktop"],
  ["talkback-board","Android TalkBack on hardware: board labels, move selection, live status and focus","android"],
  ["voiceover-board","iPhone/iPad VoiceOver on hardware: board labels, status, focus and interaction","iphone"],
  ["nvda-board","Windows NVDA on hardware: game controls, focus, live status, navigation","desktop"],
  ["account-a-b-guest","Live registered Chess OAuth client: real A to B to guest, no private history or token leakage","oauth"],
  ["account-revocation","Live account: PKCE callback replay, token rotation/revocation, stale tab and disconnected grant rejection","oauth"],
  ["account-two-device-conflict","Two independent physical devices: simultaneous revision edits, explicit conflict choices, recovery and export","oauth"],
  ["educator-curriculum","Independent educator: rules, lesson quality, engine/notation, tactical explanations and 49 retrieval-only cases","educator"],
  ["visual-human-approval","Independent visual reviewer: all 18 image decisions with before/after SHA, plus actual interaction","visual"],
]);
export const CASE_IDS=Object.freeze(CASES.map(([id])=>id));

export function makeAcceptancePlan(sourceSha) {
  if(!SHA40.test(sourceSha??"")) throw new Error("Exact 40-character source SHA required");
  return {
    schema:"thiepn-chess-p72-real-device-acceptance-v1",
    sourceSha,
    status:"PENDING_HUMAN_REVIEW",
    warning:"Generated checklists are NOT test evidence, visual approvals or release authorization.",
    cases:CASES.map(([id,objective,area])=>({
      id,area,objective,verdict:"PENDING",testedCommit:"",
      tester:"",role:"",testedAt:"",deviceModel:"",os:"",browser:"",
      environment:"",steps:"",observations:"",evidenceSha256:""
    }))
  };
}
export function evaluateAcceptance(plan,now=new Date()){
  if(!plan||plan.schema!=="thiepn-chess-p72-real-device-acceptance-v1"||
     plan.status!=="PENDING_HUMAN_REVIEW"||!SHA40.test(plan.sourceSha??"")||
     !Array.isArray(plan.cases)||plan.cases.length!==CASES.length) {
    throw new Error("Invalid, stale or incomplete P72 evidence plan");
  }
  const ids=new Set();let passed=0,failed=0,pending=0;
  for(const entry of plan.cases){
    if(ids.has(entry.id))throw new Error("Duplicate acceptance case: "+entry.id);
    ids.add(entry.id);
    const expected=CASES.find(([id])=>id===entry.id);
    if(!expected||entry.objective!==expected[1]||entry.area!==expected[2])
      throw new Error("Missing or altered mandatory acceptance case: "+entry.id);
    if(entry.verdict==="PENDING"){pending++;continue}
    if(entry.verdict!=="PASS"&&entry.verdict!=="FAIL")
      throw new Error("Unrecognized human verdict: "+entry.id);
    const meaningful=(v,n=5)=>typeof v==="string"&&v.trim().length>=n;
    if(entry.testedCommit!==plan.sourceSha||
       !meaningful(entry.tester,3)||!meaningful(entry.role,4)||
       !meaningful(entry.deviceModel,4)||!meaningful(entry.os,3)||
       !meaningful(entry.browser,3)||!meaningful(entry.environment,8)||
       !meaningful(entry.steps,24)||!meaningful(entry.observations,24)||
       !HASH.test(entry.evidenceSha256??"")||
       typeof entry.testedAt!=="string"||
       !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(entry.testedAt)||
       !Number.isFinite(Date.parse(entry.testedAt))||
       Date.parse(entry.testedAt)>now.getTime()){
      throw new Error("Incomplete/invalid human evidence for "+entry.id);
    }
    if(entry.verdict==="PASS")passed++;else failed++;
  }
  return {passed,failed,pending,formatComplete:passed===CASES.length,
    releaseApprovalGranted:false};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  try{
    const [, ,action,shaOrFile,target]=process.argv;
    if(action==="prepare"){
      if(!target)throw new Error("Usage: prepare <source_sha> <plan.json>");
      if(fs.existsSync(target))throw new Error("Refusing to overwrite an existing human evidence file");
      fs.writeFileSync(target,JSON.stringify(makeAcceptancePlan(shaOrFile),null,2)+"\n",{flag:"wx"});
      console.log("P72 prepared "+CASES.length+" PENDING human acceptance cases; no approval.");
    } else if(action==="check"){
      if(!shaOrFile)throw new Error("Usage: check <plan.json>");
      const summary=evaluateAcceptance(JSON.parse(fs.readFileSync(shaOrFile,"utf8")));
      console.log(JSON.stringify(summary));
      if(!summary.formatComplete)process.exitCode=1;
    } else throw new Error("Usage: prepare <source_sha> <plan.json> | check <plan.json>");
  }catch(e){console.error("P72 evidence blocked: "+(e?.message||e));process.exitCode=1;}
}
