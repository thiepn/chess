import { describe, expect, it } from "vitest";
import { classifyReleaseEvidence, requiredReleaseWorkflows } from "./release-evidence.mjs";

const sha = "0123456789deadbeef";
function run(name: string, conclusion: string | null = "success", overrides = {}) {
  return {
    name,
    head_sha: sha,
    head_branch: "main",
    event: "push",
    run_number: 20,
    status: conclusion === null ? "in_progress" : "completed",
    conclusion,
    ...overrides,
  };
}

describe("P60 release evidence gate", () => {
  it("requires successful Quality, visual regression, and device UX for same main SHA", () => {
    expect(classifyReleaseEvidence(requiredReleaseWorkflows.map((name) => run(name)), sha).verdict).toBe("ready");
  });
  it("does not mistake checks on PRs or another SHA for a green main build", () => {
    const list = requiredReleaseWorkflows.map((name) => run(name, "success", { event: "pull_request" }));
    list.push(run("Quality", "success", { head_sha: "different" }));
    expect(classifyReleaseEvidence(list, sha)).toMatchObject({
      verdict: "pending",
      reasons: requiredReleaseWorkflows,
    });
  });
  it("blocks a failing, skipped, or cancelled workflow", () => {
    for (const conclusion of ["failure", "skipped", "cancelled", "timed_out", "action_required"]) {
      expect(classifyReleaseEvidence([
        run("Quality"), run("Visual Regression", conclusion), run("Device UX Prequalification"),
      ], sha)).toMatchObject({ verdict: "blocked", reasons: ["Visual Regression"] });
    }
  });
  it("waits for missing or running checks and does not accept old successes", () => {
    expect(classifyReleaseEvidence([
      run("Quality"), run("Visual Regression"),
      run("Device UX Prequalification", null),
    ], sha)).toMatchObject({ verdict: "pending", reasons: ["Device UX Prequalification"] });
    expect(classifyReleaseEvidence([
      ...requiredReleaseWorkflows.map((name) => run(name)),
      run("Quality", "failure", { run_number: 21 }),
    ], sha)).toMatchObject({ verdict: "blocked", reasons: ["Quality"] });
  });
});
