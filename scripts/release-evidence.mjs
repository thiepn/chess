// Pure P60 release evidence classifier. A deployment never trusts PR checks or
// results for a different SHA, event, or branch.
export const requiredReleaseWorkflows = Object.freeze([
  "Quality",
  "Visual Regression",
  "Device UX Prequalification",
]);

export function classifyReleaseEvidence(runs, sha) {
  const matching = runs
    .filter((run) =>
      run.head_sha === sha &&
      run.head_branch === "main" &&
      run.event === "push")
    .sort((a, b) => (b.run_number ?? 0) - (a.run_number ?? 0));

  const statuses = Object.fromEntries(requiredReleaseWorkflows.map((name) => {
    const run = matching.find((item) => item.name === name);
    return [name, run
      ? { status: run.status, conclusion: run.conclusion, url: run.html_url }
      : { status: "missing", conclusion: null }];
  }));

  const blocked = Object.entries(statuses).filter(([, status]) =>
    status.status === "completed" && status.conclusion !== "success");
  if (blocked.length) {
    return { verdict: "blocked", statuses, reasons: blocked.map(([name]) => name) };
  }
  const pending = Object.entries(statuses).filter(([, status]) =>
    status.status !== "completed" || status.conclusion !== "success");
  if (pending.length) {
    return { verdict: "pending", statuses, reasons: pending.map(([name]) => name) };
  }
  return { verdict: "ready", statuses, reasons: [] };
}
