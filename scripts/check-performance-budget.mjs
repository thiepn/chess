import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const assetsDir = path.resolve("dist/assets");
const budgets = {
  maxJsGzip: 260 * 1024,
  maxCssGzip: 42 * 1024,
  maxTotalAppGzip: 315 * 1024,
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

const failures = [];
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

const total = files.reduce((sum, file) => sum + file.gzip, 0);
if (total > budgets.maxTotalAppGzip) {
  failures.push(
    `initial app JS+CSS: ${(total / 1024).toFixed(1)} KiB gzip exceeds ${(budgets.maxTotalAppGzip / 1024).toFixed(0)} KiB budget`,
  );
}

for (const asset of files.sort((a, b) => b.gzip - a.gzip)) {
  console.log(
    `${asset.file}: ${(asset.raw / 1024).toFixed(1)} KiB raw · ${(asset.gzip / 1024).toFixed(1)} KiB gzip`,
  );
}
console.log(
  `App asset total: ${(total / 1024).toFixed(1)} KiB gzip · budget ${(budgets.maxTotalAppGzip / 1024).toFixed(0)} KiB`,
);

if (failures.length) {
  console.error("Performance budget failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
