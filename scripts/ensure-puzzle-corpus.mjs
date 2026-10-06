import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const corpusDir = path.resolve("public/data/puzzles");
const manifestPath = path.join(corpusDir, "manifest.json");

function usableManifest() {
  if (!fs.existsSync(manifestPath)) return false;

  try {
    const manifest = JSON.parse(
      fs.readFileSync(manifestPath, "utf8"),
    );
    return (
      manifest.license === "CC0" &&
      Number(manifest.uniqueTotal ?? 0) >= 600 &&
      Object.keys(manifest.shards ?? {}).length >= 30
    );
  } catch {
    return false;
  }
}

if (usableManifest()) {
  console.log("Using existing healthy puzzle corpus.");
  process.exit(0);
}

console.log(
  "No healthy generated puzzle corpus found; building the checked-in Lichess baseline.",
);

const result = spawnSync(
  process.execPath,
  [
    "scripts/build-puzzle-corpus.mjs",
    "scripts/data/lichess-production-baseline.csv",
    "--out",
    "public/data/puzzles",
    "--max-per-skill",
    "250",
    "--min-popularity",
    "55",
    "--min-plays",
    "10",
    "--min-rating",
    "600",
    "--max-rating",
    "2400",
    "--max-rd",
    "220",
    "--source-label",
    "Lichess CC0 production baseline",
  ],
  { stdio: "inherit" },
);

process.exit(result.status ?? 1);
