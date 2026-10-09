// Rehash the ACTUAL file pairs in an unapproved visual candidate artifact.
// This checks evidence integrity only. It is NOT visual approval or release authorization.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import { verifyCandidateManifest } from "./p71-acceptance.mjs";

export const REQUIRED_KEYS = Object.freeze([
  "train", "learn", "play", "review", "library", "progress",
  "learn-lesson", "review-analysis", "library-workspace",
]);
export const REQUIRED_NAMES = Object.freeze(
  REQUIRED_KEYS.flatMap(key => ["desktop", "phone"].map(device => key + "-" + device + "-linux.png")).sort(),
);
const PNG_MAGIC = Buffer.from([137,80,78,71,13,10,26,10]);
const SHA = /^[a-f0-9]{40}$/;
const sha256 = bytes => crypto.createHash("sha256").update(bytes).digest("hex");

function names(folder) {
  const entries = fs.readdirSync(folder, { withFileTypes:true });
  if (entries.some(e => !e.isFile() || !REQUIRED_NAMES.includes(e.name))) {
    throw new Error("Unexpected, missing, non-file or symlink screenshot in " + folder);
  }
  return entries.map(e=>e.name).sort();
}
function inspectPng(folder, file) {
  const bytes=fs.readFileSync(path.join(folder,file));
  if (bytes.length<33 || !bytes.subarray(0,8).equals(PNG_MAGIC) ||
      bytes.toString("ascii",12,16)!=="IHDR" || bytes.readUInt32BE(8)!==13) {
    throw new Error("Invalid PNG/IHDR evidence: " + file);
  }
  const width=bytes.readUInt32BE(16), height=bytes.readUInt32BE(20);
  const expected=file.includes("-phone-")?[393,852]:[1440,900];
  if(width!==expected[0]||height!==expected[1]) {
    throw new Error("Unexpected screenshot viewport for " + file);
  }
  return {sha256:sha256(bytes),bytes:bytes.length,width,height};
}
export function verifyVisualFiles(manifest,root,expectedSha) {
  verifyCandidateManifest(manifest);
  if (!SHA.test(expectedSha??"") || manifest.commit!==expectedSha)
    throw new Error("Visual evidence is not bound to the exact PR head SHA");
  // The receipt must fingerprint the exact manifest bytes uploaded to the artifact,
  // not a freshly serialized object whose whitespace/order differs from the file.
  const manifestBytes=fs.readFileSync(path.join(root,"manifest.json"));
  if(JSON.stringify(JSON.parse(manifestBytes.toString("utf8")))!==JSON.stringify(manifest))
    throw new Error("Supplied review manifest differs from actual artifact file");
  const actualNames=manifest.images.map(x=>x.name).sort();
  if(JSON.stringify(actualNames)!==JSON.stringify(REQUIRED_NAMES))
    throw new Error("Missing or substituted screenshot scenario");
  const before=path.join(root,"baseline");
  const after=path.join(root,"candidate");
  for(const folder of [before,after]){
    if(JSON.stringify(names(folder))!==JSON.stringify(REQUIRED_NAMES))
      throw new Error("Screenshot inventory differs from expected scenarios");
  }
  const records=manifest.images.map(entry=>{
    const baseline=inspectPng(before,entry.name),candidate=inspectPng(after,entry.name);
    if(baseline.sha256!==entry.baselineSha256 ||
       candidate.sha256!==entry.candidateSha256 ||
       baseline.bytes!==entry.baselineBytes ||
       candidate.bytes!==entry.candidateBytes ||
       baseline.width!==entry.width || candidate.width!==entry.width ||
       baseline.height!==entry.height || candidate.height!==entry.height ||
       entry.changed!==(baseline.sha256!==candidate.sha256))
      throw new Error("Screenshot bytes do not match signed inventory: " + entry.name);
    return {name:entry.name,changed:entry.changed,
      baselineSha256:baseline.sha256,candidateSha256:candidate.sha256};
  });
  return {
    schema:"thiepn-chess-p73-visual-integrity-v1",
    sourceSha:expectedSha,
    manifestSha256:sha256(manifestBytes),
    total:records.length,changed:records.filter(x=>x.changed).length,
    status:"UNAPPROVED", releaseAuthorization:false, records,
  };
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  try{
    const [,,folder,expectedSha]=process.argv;
    if(!folder||!expectedSha)throw Error("Usage: node scripts/p73-verify-visual-artifact.mjs <artifact-folder> <exact-40-character-head-sha>");
    const manifest=JSON.parse(fs.readFileSync(path.join(folder,"manifest.json"),"utf8"));
    const result=verifyVisualFiles(manifest,path.resolve(folder),expectedSha);
    const target=path.join(folder,"p73-image-integrity.json");
    if(fs.existsSync(target))throw Error("Refusing to overwrite existing immutable evidence");
    fs.writeFileSync(target,JSON.stringify(result,null,2)+"\n",{flag:"wx"});
    console.log("P73 validated "+result.total+" paired screenshot hashes; "+
      result.changed+" changed; NOT APPROVED.");
  }catch(error){
    console.error("P73 visual integrity blocked: "+(error?.message??error));
    process.exitCode=1;
  }
}
