import fs from "node:fs";
import path from "node:path";
import { Chess } from "chess.js";

const corpusDir = path.resolve(process.argv[2] ?? "public/data/puzzles");
const minUnique = Number(process.env.PUZZLE_MIN_UNIQUE ?? 600);
const minPerSkill = Number(process.env.PUZZLE_MIN_PER_SKILL ?? 3);
const minRatingBands = Number(process.env.PUZZLE_MIN_RATING_BANDS ?? 5);

const manifestPath = path.join(corpusDir, "manifest.json");
if (!fs.existsSync(manifestPath)) {
  throw new Error(`Puzzle manifest missing at ${manifestPath}`);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const themeMap = JSON.parse(
  fs.readFileSync(new URL("../src/puzzles/theme-map.json", import.meta.url), "utf8"),
);
const requiredSkills = [...new Set(Object.values(themeMap).flat())].sort();

if (manifest.license !== "CC0") {
  throw new Error(`Puzzle corpus must be CC0; got ${manifest.license ?? "unknown"}`);
}

const uniqueIds = new Set();
const ratingBands = new Set();
let shardRecords = 0;
const failures = [];

function applyUci(chess, encoded) {
  try {
    return chess.move({
      from: encoded.slice(0, 2),
      to: encoded.slice(2, 4),
      promotion: encoded.slice(4, 5) || "q",
    });
  } catch {
    return null;
  }
}

for (const skillId of requiredSkills) {
  const shard = manifest.shards?.[skillId];
  if (!shard) {
    failures.push(`${skillId}: missing shard`);
    continue;
  }

  if (shard.count < minPerSkill) {
    failures.push(`${skillId}: only ${shard.count} puzzles (minimum ${minPerSkill})`);
  }

  const filePath = path.join(corpusDir, shard.file);
  if (!fs.existsSync(filePath)) {
    failures.push(`${skillId}: shard file missing (${shard.file})`);
    continue;
  }

  const records = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (records.length !== shard.count) {
    failures.push(`${skillId}: manifest says ${shard.count}, file has ${records.length}`);
  }

  const localIds = new Set();
  for (const record of records) {
    shardRecords += 1;
    uniqueIds.add(record.id);
    localIds.add(record.id);
    ratingBands.add(Math.floor(record.rating / 200) * 200);

    if (record.source !== "lichess") {
      failures.push(`${skillId}: ${record.id} has non-Lichess source ${record.source}`);
      continue;
    }
    if (!record.skillIds?.includes(skillId)) {
      failures.push(`${skillId}: ${record.id} is not tagged for its shard skill`);
    }

    const chess = new Chess(record.initialFen);
    for (const move of record.solutionMoves ?? []) {
      if (!applyUci(chess, move)) {
        failures.push(`${skillId}: illegal solution move ${move} in ${record.id}`);
        break;
      }
    }
  }

  if (localIds.size !== records.length) {
    failures.push(`${skillId}: duplicate puzzle IDs inside shard`);
  }
}

if (uniqueIds.size < minUnique) {
  failures.push(`only ${uniqueIds.size} unique puzzles (minimum ${minUnique})`);
}
if (ratingBands.size < minRatingBands) {
  failures.push(`only ${ratingBands.size} populated 200-point rating bands (minimum ${minRatingBands})`);
}
if (manifest.uniqueTotal !== undefined && manifest.uniqueTotal !== uniqueIds.size) {
  failures.push(`manifest uniqueTotal ${manifest.uniqueTotal} != audited ${uniqueIds.size}`);
}

if (failures.length) {
  console.error("Puzzle corpus audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Puzzle corpus healthy: ${uniqueIds.size} unique Lichess puzzles, ${shardRecords} shard records, ${requiredSkills.length} mapped skills, ${ratingBands.size} rating bands.`,
);
