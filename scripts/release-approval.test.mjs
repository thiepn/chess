import assert from "node:assert/strict";
import test from "node:test";
import { matchesReleaseApproval } from "./release-approval.mjs";
import { classifyReleaseEvidence } from "./release-evidence.mjs";

const sha = "a".repeat(40);
const successful = (name) => ({
  name, head_branch: "main", event: "push", head_sha: sha,
  run_number: 100, status: "completed", conclusion: "success",
});

test("only a complete exact SHA can authorize a release", () => {
  assert.equal(matchesReleaseApproval(sha, sha), true);
  assert.equal(matchesReleaseApproval("", sha), false);
  assert.equal(matchesReleaseApproval(sha.slice(0, 9), sha), false);
  assert.equal(matchesReleaseApproval("b".repeat(40), sha), false);
  assert.equal(matchesReleaseApproval(sha, "main"), false);
  assert.equal(matchesReleaseApproval(sha, ""), false);
});

test("automated release qualification requires all three same-SHA main push checks", () => {
  const names = ["Quality", "Visual Regression", "Device UX Prequalification"];
  const runs = names.map(successful);
  assert.equal(classifyReleaseEvidence(runs, sha).verdict, "ready");
  assert.equal(classifyReleaseEvidence(runs.slice(0, 2), sha).verdict, "pending");
  assert.equal(classifyReleaseEvidence([
    ...runs.slice(0, 2),
    { ...runs[2], head_branch: "p67-release-candidate-acceptance" },
  ], sha).verdict, "pending");
  assert.equal(classifyReleaseEvidence([
    ...runs.slice(0, 2),
    { ...runs[2], event: "pull_request" },
  ], sha).verdict, "pending");
  assert.equal(classifyReleaseEvidence([
    ...runs.slice(0, 2),
    { ...runs[2], conclusion: "failure" },
  ], sha).verdict, "blocked");
  assert.equal(classifyReleaseEvidence([
    ...runs.slice(0, 2),
    { ...runs[2], head_sha: "b".repeat(40) },
  ], sha).verdict, "pending");
});

test("a superseded manual approval cannot authorize a newer commit", () => {
  const older = "0".repeat(40);
  const newer = "1".repeat(40);
  assert.equal(matchesReleaseApproval(older, newer), false);
  assert.equal(matchesReleaseApproval(newer, newer), true);
});
