# P77 — CI Closure, Artifact Recovery & Human Signoff Collection

**Disposition: DRAFT, AUTOMATED PARENT CI PARTIALLY GREEN, MANUAL RELEASE BLOCKED.** Branch `p77-artifact-recovery-human-readiness` is stacked on P76 PR #63 at exact source `c7e9a1e2b138bbc67a10587115b62a4750739d0a`. Never automatically merge, activate Chess first-party OAuth, rewrite visual goldens, alter comparison thresholds or deploy.

## P76 exact-head CI — independently inspected

| Workflow | Immutable run | Job results |
| --- | --- | --- |
| Quality | [37981113527](https://github.com/thiepn/chess/actions/runs/37981113527) | **PASS** — Node P73 fix, P74/P75/P76 suites, Vitest, build, audits |
| Device UX Prequalification | [37981113629](https://github.com/thiepn/chess/actions/runs/37981113629) | **PASS** — Chromium 80 tests, WebKit 16 tests |
| P68 Offline Candidate | [37981113533](https://github.com/thiepn/chess/actions/runs/37981113533) | **PASS** — 99 build files, P76 pre-upload SHA verification |
| P67 Visual Candidates | [37981113534](https://github.com/thiepn/chess/actions/runs/37981113534) | **PASS** — all 18 pairs produced, 12 different, unapproved |
| Strict Visual Regression | [37981113540](https://github.com/thiepn/chess/actions/runs/37981113540) | **FAIL** — 12 changed but not independently approved screenshot goldens; six passed |

Both P76 Quality and Offline logs confirm the fixed P73 scenario-substitution test now passes without relaxing the separate on-disk provenance test. No further confirmed code, offline, build or browser failure was found on P76.

## P76 offline ZIP — *actual downloaded bytes*, not merely source CI log

Downloaded GitHub artifact `11640099216` (`chess-p68-offline-candidate-37981113533`), opened its ZIP, and independently recomputed every SHA256SUMS digest:

- **102 ZIP entries**, no duplicate entries. **99 build files all present and SHA-256-matching**, no extra/unlisted dist files.
- `dist/.vite/manifest.json` **present** and listed, fixing P72's historic missing-hidden-manifest artifact issue.
- `candidate-evidence/RELEASE-CANDIDATE.txt` declares exact source `c7e9a1e2b138bbc67a10587115b62a4750739d0a`, `OFFLINE_PREVIEW_ONLY`, `NOT_QUALIFIED` authenticated sync, `production_deploy=NO`.
- `candidate-evidence/P76-OFFLINE-REHEARSAL.json` records 99 verified files, `rollbackTestedOnProduction:false`, `readyToDeploy:false`, `releaseAuthorized:false`.
- ZIP SHA-256: `c5b59f301dbb57b3cc112287e49e77003c0e966c0b96b053769f520eead467b4` (also agrees with uploaded artifact's GitHub Actions log).

**Result: guest-only candidate integrity qualified at P76 exact head. NOT evidence of production rollback, authenticated sync or deployment readiness.**

### P77 implementation: independent post-upload CI recovery

`scripts/p77-recovery-verifier.mjs` imports the P76 immutable checksum validator and then verifies **downloaded** byte-for-byte artifact contents plus the *original immutable P76 pre-upload receipt*, the expected 3 exact provenance files, sole `dist/.vite` hidden directory, absence of extra/symlinked material, and exact source SHA. Emits a separate read-only receipt `thiepn-chess-p77-downloaded-artifact-v1` with `productionRollbackExecuted:false`, `humanVisualApproval:false`, `releaseAuthorized:false`.

`.github/workflows/p68-offline-candidate.yml` now has an **independent `recovery` job** that begins only after `package` succeeds, downloads that *same run's* uploaded artifact using `actions/download-artifact@v4`, re-hashes recovered contents, and uploads an audit-only P77 receipt. Either job failing blocks the full workflow. It does not publish Pages, mutate production, create a tag, merge PRs or claim a real rollback. The verifier has dedicated Node tests for tampering, altered metadata, missing hidden files, symlinks, unexpected files and false approvals; Quality and Offline Candidate both invoke them. Old P76 green runs do not qualify the P77 head.

## Visual evidence & human decision reconciliation at exact P76 SHA

Downloaded visual artifact `11640978148` (`p67-unapproved-visual-candidates-37981113534`). Actual 18 baseline PNGs and 18 candidate PNGs all independently match manifest hashes and dimensions (**36/36 valid, zero mismatches**). P73 manifest digest matches actual `manifest.json` bytes. P74 and P75 JSON receipts agree: **12 changed, 6 unchanged, visual decisions 0 ACCEPT / 0 REJECT / 18 PENDING**, acceptance **0 PASS / 0 FAIL / 14 PENDING**; actual human file hashes validated: **0**. P75's baseline proposal is explicitly `proposalOnly:true`, `baselineFilesModified:false`, `independentlyAuthorized:false`.

Changed baselines (all **UNAPPROVED**):
`learn-desktop`, `learn-lesson-phone`, `learn-phone`, `library-workspace-phone`, `play-phone`, `progress-desktop`, `progress-phone`, `review-analysis-phone`, `review-desktop`, `review-phone`, `train-desktop`, `train-phone` (each `-linux.png`).

Human independent reviewer must examine all 18 before/after screens *and* real keyboard/touch/zoom behavior, author exact image SHA-bound ACCEPT/REJECT decisions and corroborate reviewer authority. Only then may approved images be proposed as golden changes in a **separate explicitly approved reviewable commit**, after which Playwright must run at the same strict threshold `0.2`, `maxDiffPixelRatio:0.005` on that exact changed head. Until then the 12 failing visual regressions are legitimate, not to be suppressed or ignored.

## OAuth and physical acceptance (all PENDING)

Latest read-only THIEPN Account query: `account_apps[chess].active=false`; Chess registered first-party clients **0**, connected accounts **0**; `chess_user_state` RLS enabled with **three** policies. Account [PR #67](https://github.com/thiepn/account/pull/67) remains draft, unmerged, SHA `551917d44fb42026ca0eabe6dc0a75385feaf3f1`. Neither account activation nor first-party OAuth registration can be automated within this PR.

Independent authorized operator must register a **public PKCE** Chess client for exact `https://chess.thiepn.dev/auth/callback/` on an approved Account release. Real test operators must run A→B→guest isolation, callback replay/revocation and two independent physical-device concurrent save conflict and recovery, with redacted evidence files bound to actual device acceptance report and tested Chess SHA. Never copy credentials, tokens, OAuth codes or user private data into GitHub artifacts.

Human acceptance must separately cover physical Android Chrome, iPhone/iPad Safari, desktop Chrome/Edge, Stockfish game clocks 10+0 / 15+10, offline/PWA recovery, 200% zoom, keyboard focus, TalkBack, VoiceOver and NVDA; independent chess educator review of 86 lessons, especially 49 retrieval-only exercises. Automated Chromium/WebKit mobile passes are useful evidence but do **not** substitute for any of these human approvals.

## Controlled release and rollback requirements

1. Inspect all **P77 exact-head CI jobs**, including both Offline package and new independent recovery job. Do not carry forward a prior-head PASS.
2. Obtain actual independent visual approval and explicitly authorize baseline update before any golden changes; rerun strict visual CI afterward on the resulting exact head.
3. Obtain operator-only OAuth registration and authenticated A/B privacy, physical device/accessibility and educator sign-offs. Cross-check evidence hashes, actual reviewer authority and source commit; do not trust self-asserted PASS alone.
4. Explicitly authorize ordered stacked merges. All **three main-push** release checks must pass on **one immutable current main SHA**. Authorized operator alone sets `CHESS_RELEASE_APPROVED_SHA` to that exact commit, and release gate must recheck it.
5. Rehearse rollback against a **known-good actual production artifact** in an isolated authorized environment, verify hashes and health, test A/B privacy, and record human operator signoffs. A guest-only preview ZIP is not a tested rollback.
6. Only then evaluate deployment and post-release real-user/physical device acceptance. Nothing in P77 carries out these steps.

**Next phase: P78 — Post-Download CI Qualification & Human Acceptance Decision.** Status: NOT STARTED. Check exact P77 head including recovered artifact, fix any confirmed failures, and advance human approvals only where independently recorded.
