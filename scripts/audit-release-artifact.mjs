import fs from "node:fs";
import path from "node:path";

const target = path.resolve("dist");
const production = process.argv.includes("--production");
const expectedProject = "hycegznamzjhwinegaai";
const expectedUrl = "https://" + expectedProject + ".supabase.co";
const violations = [];

function check(condition, message) {
  if (!condition) violations.push(message);
}
function listed(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? listed(full) : [full];
  });
}
function exists(relative) { return fs.existsSync(path.join(target, relative)); }

check(exists("index.html"), "Missing entry HTML");
check(exists("404.html"), "GitHub Pages deep-link fallback missing");
check(exists(".vite/manifest.json"), "Vite asset manifest missing");
check(exists("engine/manifest.json"), "Stockfish manifest missing");
check(exists("engine/STOCKFISH-GPL-3.0.txt"), "Stockfish GPL license missing");
check(exists("engine/STOCKFISH-SOURCE.txt"), "Stockfish corresponding source reference missing");

const entries = listed(target);
check(entries.length > 8, "Production artifact is unexpectedly empty");
const sourceMaps = entries.filter((entry) => entry.endsWith(".map"));
check(sourceMaps.length === 0, "Public .map source maps must not ship");
for (const entry of entries) {
  check(!/(?:^|\/)\.env(?:\.|$)/.test(entry), "Environment file shipped: " + path.relative(target, entry));
}
const assets = entries.filter((entry) => /\.(?:js|html|css)$/.test(entry));
check(assets.length > 0, "No built JS/CSS or HTML assets");

for (const entry of assets) {
  const body = fs.readFileSync(entry, "utf8");
  // Only scan for credential-shaped values. The literal text "service_role"
  // can occur in a harmless error message or source comment.
  check(!/sb_secret_[a-zA-Z0-9_-]{8,}/.test(body),
    "Supabase secret key detected in " + path.relative(target, entry));
  check(!/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(body),
    "Private key detected in " + path.relative(target, entry));
}
try {
  const m = JSON.parse(fs.readFileSync(path.join(target, "engine/manifest.json"), "utf8"));
  check(m.package === "stockfish", "Unexpected engine package");
  check(m.packageVersion === "19.0.0", "Unreviewed Stockfish version");
  check(m.license === "GPL-3.0", "Incorrect Stockfish license");
  check(/^stockfish-19(?:\.0+)?-lite-single\.js$/.test(m.script ?? ""),
    "Unexpected Stockfish JS filename");
  check(m.wasm === (m.script ?? "").replace(/\.js$/, ".wasm"),
    "Stockfish JS/WASM mismatch");
  for (const file of [m.script, m.wasm]) {
    check(typeof file === "string" && !file.includes("/") && exists("engine/" + file),
      "Stockfish runtime asset missing: " + file);
  }
} catch (error) {
  violations.push("Invalid Stockfish engine manifest: " + (error?.message ?? String(error)));
}
if (production) {
  const url = process.env.VITE_SUPABASE_URL?.trim();
  const key = process.env.VITE_SUPABASE_ANON_KEY?.trim();
  // Only one registered, public first-party OAuth client is allowed to
  // enable owner-scoped Chess cloud mode. A valid-looking UUID alone is NOT
  // evidence of registration; human approval and Account probe stay gated.
  const clientId = process.env.VITE_THIEPN_ACCOUNT_CLIENT_ID?.trim();
  const redirect = process.env.VITE_THIEPN_ACCOUNT_REDIRECT_URI?.trim();
  check(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clientId ?? ""),
    "Chess production requires a registered first-party OAuth client UUID");
  check(redirect === "https://chess.thiepn.dev/auth/callback/",
    "Chess OAuth redirect must match the exact registered HTTPS callback");
  if (clientId && redirect) {
    const clientInBundle = assets.some((entry) =>
      fs.readFileSync(entry, "utf8").includes(clientId));
    check(clientInBundle, "Production artifact omitted its configured Chess OAuth client");
  }
  check(url === expectedUrl, "Release must target THIEPN Account Supabase; check CHESS_SUPABASE_URL");
  check(Boolean(key) && !key?.startsWith("sb_secret_"),
    "Set a public anon/publishable key in CHESS_SUPABASE_PUBLISHABLE_KEY");
  if (key && !key.startsWith("sb_publishable_")) {
    try {
      const payload = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString("utf8"));
      check(payload.role === "anon" && payload.ref === expectedProject,
        "Legacy key must be an anon JWT for THIEPN Account");
    } catch {
      violations.push("Cloud key must be a publishable key or a valid project anon JWT");
    }
  }
  if (url === expectedUrl) {
    const compiled = assets.some((entry) => fs.readFileSync(entry, "utf8").includes(expectedUrl));
    check(compiled, "Deployment artifact was not built with THIEPN Account URL");
  }
}
if (violations.length) {
  for (const v of violations) console.error("RELEASE BLOCKED: " + v);
  process.exitCode = 1;
} else {
  console.log("Release artifact security check passed" +
    (production ? " (THIEPN Account production target)" : " (CI artifact)"));
}
