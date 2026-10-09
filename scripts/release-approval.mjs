// An explicit approval belongs to one exact immutable production commit.
// Never accept prefixes, branches, tags, empty values or an older release SHA.
export function matchesReleaseApproval(approvedSha, candidateSha) {
  return typeof approvedSha === "string" &&
    typeof candidateSha === "string" &&
    /^[0-9a-f]{40}$/.test(candidateSha) &&
    approvedSha === candidateSha;
}
