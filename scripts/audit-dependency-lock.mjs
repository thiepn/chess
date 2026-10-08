import fs from "node:fs";
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
const root = lock.packages?.[""];
const failures = [];
if (lock.lockfileVersion !== 3) failures.push("Require npm lockfile v3");
if (root?.name !== pkg.name) failures.push("Package name mismatch in lockfile");
for (const section of ["dependencies", "devDependencies"]) {
  const expected = pkg[section] ?? {};
  const locked = root?.[section] ?? {};
  for (const [name, version] of Object.entries(expected)) {
    if (locked[name] !== version) failures.push(name + " is not pinned in the lock root");
    const entry = lock.packages?.["node_modules/" + name];
    if (!entry?.version) failures.push(name + " is not installed in package-lock.json");
  }
}
for (const [name, entry] of Object.entries(lock.packages ?? {})) {
  if (name && entry.resolved?.startsWith("https:") && !entry.integrity) {
    failures.push("Registry artifact without integrity hash: " + name);
  }
}
if (lock.packages?.["node_modules/stockfish"]?.version !== "19.0.0") {
  failures.push("Unreviewed Stockfish version");
}
if (failures.length) {
  for (const failure of failures) console.error("LOCKFILE ERROR: " + failure);
  process.exitCode = 1;
} else {
  console.log("Lockfile audit passed: " +
    Object.keys(lock.packages).length + " pinned packages with registry integrity");
}
