// Review evidence is a *human sign-off aid*, not permission to merge/deploy.
// It never approves candidate screenshots or changes golden screenshots.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SHA40 = /^[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const PNG = /^[a-z0-9-]+-(?:desktop|phone)-linux\.png$/;
export const EXPECTED_SCREENSHOTS = 18;

export function verifyCandidateManifest(manifest) {
  if (!manifest || manifest.schema !== "thiepn-chess-visual-review-v2" ||
      manifest.status !== "UNAPPROVED" || !SHA40.test(manifest.commit ?? "") ||
      !Number.isFinite(Date.parse(manifest.createdAt ?? ""))) {
    throw new Error("Invalid unapproved visual candidate manifest/provenance");
  }
  if (!Array.isArray(manifest.images) || manifest.images.length !== EXPECTED_SCREENSHOTS) {
    throw new Error("Visual review requires all 18 original screenshot pairs");
  }
  const names = new Set();
  for (const entry of manifest.images) {
    if (!PNG.test(entry.name ?? "") || names.has(entry.name) ||
        !SHA256.test(entry.baselineSha256 ?? "") || !SHA256.test(entry.candidateSha256 ?? "") ||
        !Number.isSafeInteger(entry.width) || entry.width <= 0 ||
        !Number.isSafeInteger(entry.height) || entry.height <= 0 ||
        typeof entry.changed !== "boolean" ||
        entry.changed !== (entry.baselineSha256 !== entry.candidateSha256)) {
      throw new Error("Invalid or duplicate screenshot evidence: " + String(entry?.name));
    }
    names.add(entry.name);
  }
  return manifest;
}

export function makeHumanReviewTemplate(manifest) {
  verifyCandidateManifest(manifest);
  return {
    schema: "thiepn-chess-human-visual-review-v1",
    candidateCommit: manifest.commit,
    provenance: "Human review required; this template is NOT approval",
    images: manifest.images.map((entry) => ({
      name: entry.name,
      baselineSha256: entry.baselineSha256,
      candidateSha256: entry.candidateSha256,
      decision: "PENDING",
      reviewer: "",
      reviewedAt: "",
      notes: "",
    })),
  };
}

export function reviewChecklist(manifest) {
  verifyCandidateManifest(manifest);
  const header = [
    "# THIEPN Chess — P71 visual sign-off worksheet",
    "",
    "**STATUS: PENDING HUMAN REVIEW.** This file is not a release authorization.",
    "",
    "- Exact candidate source commit: `" + manifest.commit + "`",
    "- Candidate images: " + manifest.images.length +
      "; changed: " + manifest.images.filter((x) => x.changed).length,
    "- Compare `baseline/` and `candidate/` side by side in `index.html`.",
    "- On actual mobile hardware, inspect board/piece contrast, the focus ring, promotion selection, landscape and 200% text.",
    "- Record independent reviewer identity, a dated decision and concrete reasons for **each** image in a *copy* of `review-template.json` named `review-decisions.json`.",
    "- A human must explicitly accept or reject each image; unchanged images must also be reviewed. Never promote images automatically.",
    "- Run `node scripts/p71-acceptance.mjs check <manifest.json> <review-decisions.json>` to verify completeness and hash binding.",
    "- A passing format check **cannot** verify reviewer identity or replace approval, accessibility, SSO, device or deployment gates.",
    "",
    "| Reference | Changed | Dimensions | Human decision |",
    "| --- | --- | --- | --- |",
  ];
  const lines = manifest.images.map((x) =>
    "| " + x.name + " | " + (x.changed ? "YES" : "NO") +
    " | " + x.width + "×" + x.height + " | PENDING |");
  return [...header, ...lines, ""].join("\n");
}

// This validates the evidence format and its exact candidate hashes, not
// whether someone actually inspected the pictures or has release authority.
export function inspectHumanReview(manifest, report, now = new Date()) {
  verifyCandidateManifest(manifest);
  if (!report || report.schema !== "thiepn-chess-human-visual-review-v1" ||
      report.candidateCommit !== manifest.commit ||
      !Array.isArray(report.images) || report.images.length !== EXPECTED_SCREENSHOTS) {
    throw new Error("Missing or stale visual review record");
  }
  const entries = new Map();
  for (const entry of report.images) {
    if (entries.has(entry.name)) throw new Error("Duplicate review decision: " + entry.name);
    entries.set(entry.name, entry);
  }
  let accepted = 0, rejected = 0, pending = 0;
  for (const candidate of manifest.images) {
    const entry = entries.get(candidate.name);
    if (!entry || entry.baselineSha256 !== candidate.baselineSha256 ||
        entry.candidateSha256 !== candidate.candidateSha256) {
      throw new Error("Missing/mismatched image digest for " + candidate.name);
    }
    if (entry.decision === "PENDING") {
      pending++;
      continue;
    }
    if (entry.decision !== "ACCEPT" && entry.decision !== "REJECT") {
      throw new Error("Invalid decision for " + candidate.name);
    }
    if (typeof entry.reviewer !== "string" || entry.reviewer.trim().length < 3 ||
        typeof entry.notes !== "string" || entry.notes.trim().length < 12 ||
        typeof entry.reviewedAt !== "string" ||
        !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(entry.reviewedAt) ||
        !Number.isFinite(Date.parse(entry.reviewedAt)) ||
        Date.parse(entry.reviewedAt) < Date.parse(manifest.createdAt) ||
        Date.parse(entry.reviewedAt) > now.getTime()) {
      throw new Error("Incomplete or invalid human attestation for " + candidate.name);
    }
    if (entry.decision === "ACCEPT") accepted++; else rejected++;
  }
  return { accepted, rejected, pending, readyForIndependentApproval: accepted === EXPECTED_SCREENSHOTS };
}

function usage() {
  throw new Error("Usage: node scripts/p71-acceptance.mjs prepare <manifest.json> <output-folder> | check <manifest.json> <review-decisions.json>");
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const [, , mode, manifestPath, destination] = process.argv;
    if (!manifestPath || !destination) usage();
    const manifest = verifyCandidateManifest(JSON.parse(fs.readFileSync(manifestPath, "utf8")));
    if (mode === "prepare") {
      const folder = path.resolve(destination);
      fs.mkdirSync(folder, { recursive: true });
      // Never write to a decision file: even an existing human record is untouched.
      fs.writeFileSync(path.join(folder, "review-template.json"),
        JSON.stringify(makeHumanReviewTemplate(manifest), null, 2) + "\n");
      fs.writeFileSync(path.join(folder, "review-checklist.md"), reviewChecklist(manifest));
      console.log("P71 prepared " + EXPECTED_SCREENSHOTS + " PENDING decisions for " + manifest.commit + "; NO APPROVAL.");
    } else if (mode === "check") {
      const report = JSON.parse(fs.readFileSync(destination, "utf8"));
      const result = inspectHumanReview(manifest, report);
      console.log(JSON.stringify(result));
      if (!result.readyForIndependentApproval) process.exitCode = 1;
    } else usage();
  } catch (error) {
    console.error("P71 acceptance evidence blocked: " + (error?.message ?? String(error)));
    process.exitCode = 1;
  }
}
