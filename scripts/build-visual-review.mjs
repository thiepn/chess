import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// A PR merge-ref build is not the same source as the PR head. Refuse
// screenshot artifacts without immutable provenance and comparable images.
const sha = process.env.REVIEW_SHA;
if (!/^[0-9a-f]{40}$/.test(sha ?? "")) {
  throw new Error("REVIEW_SHA must be the exact 40-character lowercase PR head SHA");
}
const out = path.resolve(process.argv[2] ?? "p69c-visual-review");
const before = path.join(out, "baseline");
const after = path.join(out, "candidate");
const images = (folder) => fs.readdirSync(folder).filter(name => /^[a-z0-9-]+\.png$/.test(name)).sort();
const originals = images(before);
const candidates = images(after);
const expectedPairs = process.env.REVIEW_EXPECTED_PAIRS;
if (!originals.length || originals.join("|") !== candidates.join("|")) {
  throw new Error("Baseline and candidate screenshot names/counts must match exactly");
}
if (expectedPairs !== undefined && (!/^[1-9][0-9]*$/.test(expectedPairs) || Number(expectedPairs) !== originals.length)) {
  throw new Error("Visual candidate count differs from approved scenario inventory");
}
const signature = Buffer.from([137,80,78,71,13,10,26,10]);
function pngGeometry(file) {
  const bytes = fs.readFileSync(file);
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(signature) ||
      bytes.toString("ascii", 12, 16) !== "IHDR") {
    throw new Error("Invalid PNG header: " + path.basename(file));
  }
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (!width || !height || width > 8192 || height > 8192) {
    throw new Error("Invalid screenshot dimensions: " + path.basename(file));
  }
  return { width, height };
}
const hash = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const records = originals.map(name => {
  const a=path.join(before,name), b=path.join(after,name);
  const baseline = pngGeometry(a), candidate = pngGeometry(b);
  if (baseline.width !== candidate.width || baseline.height !== candidate.height) {
    throw new Error("Screenshot viewport mismatch for " + name);
  }
  return { name, width: baseline.width, height: baseline.height,
    baselineSha256:hash(a), candidateSha256:hash(b), changed:hash(a)!==hash(b),
    baselineBytes:fs.statSync(a).size, candidateBytes:fs.statSync(b).size };
});
const manifest={schema:"thiepn-chess-visual-review-v2",commit:sha,
  status:"UNAPPROVED", createdAt:new Date().toISOString(),images:records};
fs.writeFileSync(path.join(out,"manifest.json"),JSON.stringify(manifest,null,2)+"\n");
const esc=str=>str.replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
const sections=records.map(r=>'<section><h2>'+esc(r.name)+'</h2>'+
 '<p>'+ (r.changed?"Changed":"Identical") +' · candidate SHA-256 '+r.candidateSha256+'</p>'+
 '<div class="pair"><figure><figcaption>Previously approved reference</figcaption><img src="./baseline/'+esc(r.name)+'" alt="Prior '+esc(r.name)+'"></figure>'+
 '<figure><figcaption>New candidate — NOT APPROVED</figcaption><img src="./candidate/'+esc(r.name)+'" alt="Candidate '+esc(r.name)+'"></figure></div>'+
 '<p>Review: typography, chess pieces, focus, clipped controls, empty progress history, phone viewport, and accessibility.</p></section>').join("\n");
const html='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
'<title>THIEPN Chess P69C — visual acceptance review</title><style>'+
'body{margin:0;background:#171c1b;color:#e7e9e4;font:15px/1.55 system-ui,sans-serif}'+
'header{padding:26px clamp(16px,3vw,48px);border-bottom:1px solid #5c6560}h1{font-size:24px;margin:0 0 12px}p{max-width:82ch;color:#b8c2ba}'+
'main{padding:24px clamp(14px,3vw,48px)}section{margin:0 0 46px;border-bottom:1px solid #3c4840;padding-bottom:34px}'+
'h2{font-size:17px} .pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}figure{margin:0;min-width:0}'+
'figcaption{margin-bottom:12px;font-weight:600}img{display:block;width:100%;height:auto;max-height:900px;object-fit:contain;object-position:top;border:1px solid #5d6860}'+
'@media(max-width:760px){.pair{grid-template-columns:1fr}}</style>'+
'<header><h1>Chess P69C · Visual review</h1><p>Commit: '+esc(sha)+'</p>'+
'<p>UNAPPROVED CANDIDATES. This artifact compares images only. Do not commit golden snapshots or bypass strict Visual Regression until all images are independently reviewed and explicitly signed off.</p></header>'+
'<main>'+sections+'</main></html>';
fs.writeFileSync(path.join(out,"index.html"),html);
console.log("P69C review: "+records.length+" image pairs; "+records.filter(x=>x.changed).length+" changed, approval pending.");
