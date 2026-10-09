# P76 — Exact-Head Acceptance Closure & Controlled Release Rehearsal

**Disposition: DRAFT / NO MERGE / NO DEPLOYMENT / NO OAUTH REGISTRATION / NO HUMAN APPROVAL.**

P76 stacks on P75 [PR #62](https://github.com/thiepn/chess/pull/62) at exact parent `e804163fc42aea6fd846d6cc6db41207fa6e8f43`. Nothing in this phase authorizes a change to production.

## 1. Verified P74 + P75 CI and runner outcomes

All jobs ran to completion on GitHub-hosted runners. There is no longer a *queued runner* blocker on those heads. Detailed runner administration is not available through the installed GitHub connection; runner assignment is evidenced by the completed job logs.

| Mandatory workflow | P74 at `522c25f…` | P75 at `e804163…` |
| --- | --- | --- |
| Quality | **FAIL** [37953621321](https://github.com/thiepn/chess/actions/runs/37953621321) | **FAIL** [37955845916](https://github.com/thiepn/chess/actions/runs/37955845916) |
| Offline Release Candidate | **FAIL** [37953621450](https://github.com/thiepn/chess/actions/runs/37953621450) | **FAIL** [37955845934](https://github.com/thiepn/chess/actions/runs/37955845934) |
| Device UX (Chromium + WebKit) | **PASS** [37953621100](https://github.com/thiepn/chess/actions/runs/37953621100) | **PASS** [37955845887](https://github.com/thiepn/chess/actions/runs/37955845887) |
| Visual Candidates | **PASS** [37953621501](https://github.com/thiepn/chess/actions/runs/37953621501) | **PASS** [37955845845](https://github.com/thiepn/chess/actions/runs/37955845845) |
| Strict Visual Regression | **FAIL** [37953622044](https://github.com/thiepn/chess/actions/runs/37953622044) | **FAIL** [37955845954](https://github.com/thiepn/chess/actions/runs/37955845954) |

### Confirmed defect A — a regression test fixture omitted disk synchronization

Quality and Offline Candidate on **both exact heads** fail `scripts/p73-verify-visual-artifact.test.mjs` case `P73 enforces real screenshot scenario names, not just count 18`. The test modifies only the **in-memory** manifest. P74's stronger raw-file consistency gate correctly stops that before the substitution guard is reached. Test code incorrectly demands error matching `/substituted/` rather than the prior genuine `Supplied review manifest differs from actual artifact file` error.

**P76 repair:** The substituted-scenario fixture now writes the modified manifest **to the artifact on disk** before asserting the required scenario guard. An additional test verifies that an **in-memory-only mismatch** still fails via the raw-file provenance guard. **Both protections remain intact.** Do not broaden expectations to accept arbitrary failures or skip the test.

The visible stderr from negative review-builder tests is expected: those tests deliberately invoke invalid candidate inputs and still PASS. It is unrelated to the Quality failure.

### Confirmed defect B — historic offline artifact omitted required hidden build manifest

I downloaded and independently checked the **successful P72 offline candidate** (run `37951014930`, artifact `11626695408`): its `SHA256SUMS.txt` lists **99 files**, but the downloaded ZIP has no `dist/.vite/manifest.json` while that file is required by the checksums and production release audit. The other **98 hashes match**. This is a ZIP/package completeness failure despite the earlier workflow's green status, **not a qualified backup or rollback artifact**.

`actions/upload-artifact@v4` excludes dotfiles/hidden directories by default. P76 updates the upload to `include-hidden-files:true` **only after** a shell audit explicitly requires that `dist/.vite/manifest.json` is the **sole hidden file** within `dist`. This rejects any unexpected hidden files (potential secret leakage) while preserving the complete, audited artifact.

### Strict visual delta is a human gate, not a repair to force green

Both P74/P75 visual regressions failed against **12 changed reference screens** while **six passed**. Their successful candidate artifacts were downloaded and independently verified: all **36 PNG bytes** for each head match its exact-head SHA-256 manifest, there are **18 paired screens**, **12 changed**, zero mismatches and **no `review-decisions.json`**. All 18 human decisions remain pending. P74/P75 release receipts explicitly say HOLD. P75 actual redacted human evidence files: **zero**. No golden PNGs or Playwright tolerances were altered.

## 2. P76 exact-head and rollback rehearsal (strictly nondeploying)

`scripts/p76-release-rehearsal.mjs` adds two reusable pure verification workflows:

1. `verifyOfflineCandidatePackage(root,sourceSha)` reads the exact `candidate-evidence/RELEASE-CANDIDATE.txt`, demands `candidate_type=OFFLINE_PREVIEW_ONLY`, `authenticated_sync=NOT_QUALIFIED`, `production_deploy=NO`, and **re-hashes every real dist file** against `SHA256SUMS.txt`. Rejects incorrect source SHA, missing/unlisted/empty/symlinked bytes, unsafe paths, duplicate checksums, manipulated provenance and absence of `index.html`, `404.html` or `.vite/manifest.json`. Emits `P76-OFFLINE-REHEARSAL.json` containing `releaseAuthorized:false` and `rollbackTestedOnProduction:false`.
2. `rehearseReleaseGate(...)` independently classifies all **five PR workflows at the same exact candidate SHA** (Quality, Device UX, strict visual, candidates and offline). Separately checks the existing *three-main-push* evidence classifier, whether this candidate is current main and whether an explicit authorized production SHA matches. **Even if synthetic inputs claim all green**, outputs `productionReleaseAuthorized:false` and `REHEARSAL_ONLY_HOLD`; a historical offline preview is **not** proof of a live rollback.

P76 runs its Node-native negative/positive tests in both exact-head Quality and Offline Candidate jobs without permitting Vitest to collect Node's test runner tests. The Offline Candidate workflow now invokes actual offline content-hash rehearsal after build and checksum generation and **before** artifact upload. Failure prevents even publishing a guest-only preview artifact; it cannot deploy or merge. The P67 candidate workflow continues generating explicitly unapproved visual evidence at P76 head.

### Operator-only rollback drill after actual approvals

1. Obtain the **last authorized production SHA**, its original deployed build artifact and an authenticated/manual operator runbook. Do not treat an unapproved PR ZIP or P72 preview as that rollback package.
2. Verify every checksum on the **previous known-good production archive**, confirm it contains `dist/.vite/manifest.json`, and record the previous canonical domain, Chess Account client and all required nonsecret environment configuration.
3. On an isolated authorized environment, test restore → HTTP/PWA/offline UX → game persistence → real A/B privacy and actual Account revoke/return paths. Record redacted results, operator identity, time and candidate/rollback SHA separately.
4. Do not change live Pages deployment or `CHESS_RELEASE_APPROVED_SHA` merely to rehearse. Only an explicitly authorized incident response would trigger a real rollback, with corresponding release-gate requirements.

## 3. Remaining independent human/Account gates

Read-only THIEPN Account SQL and [Account PR #67](https://github.com/thiepn/account/pull/67) are unchanged: `chess` **inactive**, **0 registered Chess first-party clients**, **0 connected Chess accounts**; `chess_user_state` RLS enabled with **3 policies**. The Account PR is **still draft and unmerged** at `551917d44fb42026ca0eabe6dc0a75385feaf3f1`. No OAuth UUID has been invented, registered or reused.

- Independent Chess OAuth PKCE Authorization Code client registration must follow approved THIEPN Account onboarding at `https://chess.thiepn.dev/auth/callback/`. Only an Account operator may register/activate it.
- Human tester: real account A→B→guest, callback replay, scoped grants, revocation, offline logout, two **physical** device revision conflicts and cross-account isolation. Never put tokens or private recordings in PR artifacts.
- Real Android Chrome, iPhone/iPad Safari, Windows Chrome/Edge, keyboard, TalkBack, VoiceOver, NVDA; Stockfish, promotion, clocks 10+0/15+10, PWA/resume, 200% text and reduced motion.
- Independent chess educator checks 86 lessons, especially 49 retrieval-only cases. Claims of independent transfer must not be invented.
- Independent human must inspect all 18 visual before/after pairs and provide exact hash-bound dated ACCEPT/REJECT decisions. Only after explicit acceptance may golden images be committed on a new reviewable SHA and strict Playwright run again unchanged.

## 4. Release decision remains HOLD

P76 is code-complete as a draft, **not qualified** until its own exact-head CI passes. Release requires full accepted ancestors and human approvals; then the three **main push** checks on the exact merged main SHA must pass. Authorized operator alone can set `CHESS_RELEASE_APPROVED_SHA` to that same main commit. Production health, browser OAuth, rollback and actual game telemetry must be checked separately. No P76 script sets release variables or publishes Pages.

Next phase: **P77 — CI Closure, Artifact Recovery & Human Signoff Collection**, **NOT STARTED**. Begin by rechecking every P76 exact-head job and its offline ZIP, fixing any confirmed defects before soliciting remaining human acceptance.
