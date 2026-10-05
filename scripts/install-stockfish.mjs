import fs from "node:fs";
import path from "node:path";

const sourceDir = path.resolve("node_modules/stockfish/bin");
const outputDir = path.resolve("public/engine");

if (!fs.existsSync(sourceDir)) {
  throw new Error("stockfish package is not installed");
}

const files = fs.readdirSync(sourceDir);
const jsFile = files
  .filter((file) => /^stockfish-\d+(?:\.\d+)?-lite-single\.js$/.test(file))
  .sort()
  .at(-1);
const wasmFile = jsFile?.replace(/\.js$/, ".wasm");

if (!jsFile || !wasmFile || !files.includes(wasmFile)) {
  throw new Error(
    "Could not locate the Stockfish lite single-threaded browser build.",
  );
}

fs.mkdirSync(outputDir, { recursive: true });
fs.copyFileSync(path.join(sourceDir, jsFile), path.join(outputDir, jsFile));
fs.copyFileSync(path.join(sourceDir, wasmFile), path.join(outputDir, wasmFile));

const licenseCandidates = [
  path.resolve("node_modules/stockfish/Copying.txt"),
  path.resolve("node_modules/stockfish/COPYING"),
];

for (const candidate of licenseCandidates) {
  if (fs.existsSync(candidate)) {
    fs.copyFileSync(candidate, path.join(outputDir, "STOCKFISH-GPL-3.0.txt"));
    break;
  }
}

fs.writeFileSync(
  path.join(outputDir, "manifest.json"),
  JSON.stringify(
    {
      version: 1,
      engine: "Stockfish",
      package: "stockfish",
      script: jsFile,
      wasm: wasmFile,
      license: "GPL-3.0",
    },
    null,
    2,
  ),
);

process.stdout.write(`Installed ${jsFile} and ${wasmFile} into public/engine.\n`);
