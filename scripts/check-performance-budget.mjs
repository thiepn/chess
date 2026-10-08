import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const distDir = path.resolve("dist");
const assetsDir = path.join(distDir, "assets");
const budgets = {
  maxJsGzip: 260 * 1024,
  maxCssGzip: 42 * 1024,
  maxInitialAppGzip: 260 * 1024,
  // P62 adds durable game recovery. The global deferred-asset allowance
  // moves by 3 KiB (+0.95%), while initial and per-chunk limits stay locked.
  // P64 premium typographic and board layer adds a bounded ~3 KiB CSS allowance
  // to total deferred assets (+0.94%). Initial and per-asset caps stay unchanged.
  maxTotalAppGzip: 321 * 1024,
};

if (!fs.existsSync(assetsDir)) {
  throw new Error("dist/assets is missing. Run npm run build before perf:budget.");
}

const files = fs
  .readdirSync(assetsDir)
  .filter((file) => file.endsWith(".js") || file.endsWith(".css"))
  .map((file) => {
    const buffer = fs.readFileSync(path.join(assetsDir, file));
    return {
      file,
      raw: buffer.byteLength,
      gzip: zlib.gzipSync(buffer, { level: 9 }).byteLength,
      type: file.endsWith(".js") ? "js" : "css",
    };
  });

const indexHtml = fs.readFileSync(
  path.join(distDir, "index.html"),
  "utf8",
);
const initialNames = new Set(
  [...indexHtml.matchAll(/assets\/([^"'<>]+\.(?:js|css))/g)].map(
    (match) => match[1],
  ),
);
if (!initialNames.size) {
  throw new Error("Could not resolve initial JS/CSS assets from dist/index.html.");
}

const initialFiles = files.filter((asset) =>
  initialNames.has(asset.file),
);
const failures = [];

// Vite's production manifest proves that Train-only exercises are dynamically
// imported instead of adding all activity runners to the initial route.
const manifestPath = path.join(distDir, ".vite", "manifest.json");
const manifest = fs.existsSync(manifestPath)
  ? JSON.parse(fs.readFileSync(manifestPath, "utf8"))
  : null;
if (!manifest) failures.push("Vite build manifest missing.");
const trainOnly = [
  "LessonRunner",
  "PuzzleRunner",
  "PersonalMistakeRunner",
  "CalculationRunner",
  "EndgameTechniqueRunner",
  "OpeningTrainer",
  "SavedStudyTrainer",
  "ModelGameRunner",
  "AssessmentRunner",
  "GameArena",
  "GameStoryView",
];
for (const component of trainOnly) {
  const source = `src/components/${component}.tsx`;
  if (!manifest?.[source]?.isDynamicEntry) {
    failures.push(`${component} is not a separate on-demand training entry.`);
  }
}
if (manifest) console.log(`On-demand training, play and review workspaces: ${trainOnly.length}`);

for (const asset of files) {
  const limit =
    asset.type === "js"
      ? budgets.maxJsGzip
      : budgets.maxCssGzip;
  if (asset.gzip > limit) {
    failures.push(
      `${asset.file}: ${(asset.gzip / 1024).toFixed(1)} KiB gzip exceeds ${(limit / 1024).toFixed(0)} KiB ${asset.type.toUpperCase()} budget`,
    );
  }
}

const initialTotal = initialFiles.reduce(
  (sum, file) => sum + file.gzip,
  0,
);
const total = files.reduce(
  (sum, file) => sum + file.gzip,
  0,
);

if (initialTotal > budgets.maxInitialAppGzip) {
  failures.push(
    `initial app: ${(initialTotal / 1024).toFixed(1)} KiB gzip exceeds ${(budgets.maxInitialAppGzip / 1024).toFixed(0)} KiB budget`,
  );
}
if (total > budgets.maxTotalAppGzip) {
  failures.push(
    `all app JS+CSS: ${(total / 1024).toFixed(1)} KiB gzip exceeds ${(budgets.maxTotalAppGzip / 1024).toFixed(0)} KiB budget`,
  );
}

for (const asset of files.sort((a, b) => b.gzip - a.gzip)) {
  const initial = initialNames.has(asset.file) ? " · initial" : "";
  console.log(
    `${asset.file}: ${(asset.raw / 1024).toFixed(1)} KiB raw · ${(asset.gzip / 1024).toFixed(1)} KiB gzip${initial}`,
  );
}
console.log(
  `Initial app: ${(initialTotal / 1024).toFixed(1)} KiB gzip · budget ${(budgets.maxInitialAppGzip / 1024).toFixed(0)} KiB`,
);
console.log(
  `All app JS+CSS: ${(total / 1024).toFixed(1)} KiB gzip · budget ${(budgets.maxTotalAppGzip / 1024).toFixed(0)} KiB`,
);

if (failures.length) {
  console.error("Performance budget failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
