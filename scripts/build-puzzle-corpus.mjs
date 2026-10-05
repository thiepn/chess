import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { Chess } from "chess.js";

const args = process.argv.slice(2);

function option(name, fallback) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

function hasFlag(name) {
  return args.includes(name);
}

const positional = args.filter((value, index) => {
  if (value.startsWith("--")) return false;
  if (index > 0 && args[index - 1]?.startsWith("--")) return false;
  return true;
});

const inputPath = positional[0] ?? "-";
const outputDir = path.resolve(option("--out", "public/data/puzzles"));
const maxPerSkill = Number(option("--max-per-skill", "5000"));
const minPopularity = Number(option("--min-popularity", "75"));
const minPlays = Number(option("--min-plays", "50"));
const minRating = Number(option("--min-rating", "600"));
const maxRating = Number(option("--max-rating", "2400"));
const maxRatingDeviation = Number(option("--max-rd", "140"));
const includeVeryLong = hasFlag("--include-very-long");
const bucketWidth = 200;
const bucketCount = Math.max(1, Math.floor((maxRating - minRating) / bucketWidth) + 1);
const perBucketCap = Math.max(1, Math.floor(maxPerSkill / bucketCount));

const themeMap = JSON.parse(
  fs.readFileSync(new URL("../src/puzzles/theme-map.json", import.meta.url), "utf8"),
);

class MinHeap {
  constructor(limit) {
    this.limit = limit;
    this.items = [];
  }

  push(value) {
    if (this.items.length < this.limit) {
      this.items.push(value);
      this.bubbleUp(this.items.length - 1);
      return;
    }

    if (value.quality <= this.items[0].quality) return;
    this.items[0] = value;
    this.bubbleDown(0);
  }

  bubbleUp(index) {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.items[parent].quality <= this.items[index].quality) break;
      [this.items[parent], this.items[index]] = [this.items[index], this.items[parent]];
      index = parent;
    }
  }

  bubbleDown(index) {
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      let smallest = index;

      if (
        left < this.items.length &&
        this.items[left].quality < this.items[smallest].quality
      ) smallest = left;

      if (
        right < this.items.length &&
        this.items[right].quality < this.items[smallest].quality
      ) smallest = right;

      if (smallest === index) break;
      [this.items[index], this.items[smallest]] = [this.items[smallest], this.items[index]];
      index = smallest;
    }
  }

  values() {
    return this.items;
  }
}

function parseCsvLine(line) {
  const fields = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === "," && !quoted) {
      fields.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  fields.push(current);
  return fields;
}

function uciMove(chess, encoded) {
  if (!encoded || encoded.length < 4) return null;
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

function qualityScore({ popularity, plays, ratingDeviation, themes, solutionLength }) {
  const pop = Math.max(0, Math.min(1, (popularity + 100) / 200));
  const confidence = Math.min(1, Math.log10(Math.max(10, plays)) / 4);
  const rd = Math.max(0, Math.min(1, 1 - ratingDeviation / 200));
  const concise =
    themes.includes("oneMove") || themes.includes("short")
      ? 1
      : solutionLength <= 5
        ? .75
        : .45;

  return pop * .5 + confidence * .25 + rd * .15 + concise * .1;
}

function normalize(fields) {
  if (fields.length < 10) return null;

  const [
    id,
    fen,
    rawMoves,
    rawRating,
    rawRatingDeviation,
    rawPopularity,
    rawPlays,
    rawThemes,
    sourceUrl,
    rawOpeningTags,
  ] = fields;

  const rating = Number(rawRating);
  const ratingDeviation = Number(rawRatingDeviation);
  const popularity = Number(rawPopularity);
  const plays = Number(rawPlays);
  const themes = rawThemes.split(" ").filter(Boolean);
  const moves = rawMoves.split(" ").filter(Boolean);

  if (
    !id ||
    !fen ||
    moves.length < 2 ||
    !Number.isFinite(rating) ||
    !Number.isFinite(popularity) ||
    !Number.isFinite(plays) ||
    rating < minRating ||
    rating > maxRating ||
    popularity < minPopularity ||
    plays < minPlays ||
    (Number.isFinite(ratingDeviation) && ratingDeviation > maxRatingDeviation) ||
    (!includeVeryLong && themes.includes("veryLong"))
  ) {
    return null;
  }

  const chess = new Chess(fen);
  if (!uciMove(chess, moves[0])) return null;

  const initialFen = chess.fen();
  const solutionMoves = moves.slice(1);
  const skillIds = new Set();

  for (const theme of themes) {
    for (const skillId of themeMap[theme] ?? []) skillIds.add(skillId);
  }

  // Lichess tags forks generically. Detect the solving piece so knight forks
  // can also train the more specific curriculum node.
  if (themes.includes("fork") && solutionMoves[0]) {
    const solvingPiece = chess.get(solutionMoves[0].slice(0, 2));
    if (solvingPiece?.type === "n") skillIds.add("tactics.knight-fork");
  }

  if (!skillIds.size) return null;

  const validator = new Chess(initialFen);
  for (const encoded of solutionMoves) {
    if (!uciMove(validator, encoded)) return null;
  }

  return {
    record: {
      id,
      initialFen,
      solutionMoves,
      rating,
      ratingDeviation,
      popularity,
      plays,
      themes,
      skillIds: [...skillIds],
      openingTags: rawOpeningTags.split(" ").filter(Boolean),
      source: "lichess",
      sourceUrl,
    },
    quality: qualityScore({
      popularity,
      plays,
      ratingDeviation,
      themes,
      solutionLength: solutionMoves.length,
    }),
  };
}

const source =
  inputPath === "-"
    ? process.stdin
    : fs.createReadStream(path.resolve(inputPath), { encoding: "utf8" });

const rl = readline.createInterface({
  input: source,
  crlfDelay: Infinity,
});

const buckets = new Map();
let scanned = 0;
let accepted = 0;
let rejected = 0;

for await (const line of rl) {
  if (!line.trim()) continue;
  if (line.startsWith("PuzzleId,")) continue;

  scanned += 1;
  const normalized = normalize(parseCsvLine(line));
  if (!normalized) {
    rejected += 1;
    continue;
  }

  accepted += 1;

  for (const skillId of normalized.record.skillIds) {
    const ratingBucket = Math.max(
      0,
      Math.min(
        bucketCount - 1,
        Math.floor((normalized.record.rating - minRating) / bucketWidth),
      ),
    );

    const key = `${skillId}::${ratingBucket}`;
    if (!buckets.has(key)) buckets.set(key, new MinHeap(perBucketCap));
    buckets.get(key).push(normalized);
  }

  if (scanned % 250_000 === 0) {
    process.stderr.write(
      `Scanned ${scanned.toLocaleString()} puzzles; ${accepted.toLocaleString()} passed filters.\n`,
    );
  }
}

fs.mkdirSync(outputDir, { recursive: true });

const skillRecords = new Map();
for (const [key, heap] of buckets.entries()) {
  const [skillId] = key.split("::");
  if (!skillRecords.has(skillId)) skillRecords.set(skillId, []);
  skillRecords.get(skillId).push(...heap.values());
}

const manifest = {
  version: 1,
  generatedAt: new Date().toISOString(),
  source: "https://database.lichess.org/lichess_db_puzzle.csv.zst",
  license: "CC0",
  total: 0,
  filters: {
    minPopularity,
    minPlays,
    minRating,
    maxRating,
    maxRatingDeviation,
    includeVeryLong,
    maxPerSkill,
    bucketWidth,
  },
  scanned,
  accepted,
  rejected,
  shards: {},
};

for (const [skillId, entries] of [...skillRecords.entries()].sort()) {
  const bestById = new Map();

  for (const entry of entries) {
    const previous = bestById.get(entry.record.id);
    if (!previous || previous.quality < entry.quality) {
      bestById.set(entry.record.id, entry);
    }
  }

  const records = [...bestById.values()]
    .sort((a, b) => a.record.rating - b.record.rating || b.quality - a.quality)
    .slice(0, maxPerSkill)
    .map(({ record }) => record);

  if (!records.length) continue;

  const file = `${skillId.replaceAll(".", "__")}.json`;
  fs.writeFileSync(
    path.join(outputDir, file),
    JSON.stringify(records),
  );

  manifest.shards[skillId] = {
    file,
    count: records.length,
    minRating: Math.min(...records.map((item) => item.rating)),
    maxRating: Math.max(...records.map((item) => item.rating)),
  };
  manifest.total += records.length;
}

fs.writeFileSync(
  path.join(outputDir, "manifest.json"),
  JSON.stringify(manifest, null, 2),
);

process.stderr.write(
  `Wrote ${manifest.total.toLocaleString()} curated puzzle records across ${Object.keys(manifest.shards).length} skill shards to ${outputDir}.\n`,
);
