# P78 — Post-Download CI Qualification & Human Acceptance Decision

**Draft only. Status: NOT RELEASED, NOT AUTHORIZED.** P78 is stacked directly on P77 draft PR #64 at `abb5f5fa0549179b382e5f8a065751551a2d0168`. No merge, production deployment, Account OAuth registration/activation, screenshot golden changes or release variables are authorized.

## I. Verified P77 source, exact-head CI, artifacts

The P77 head is `abb5f5fa0549179b382e5f8a065751551a2d0168`; all five exact-head workflows have completed. Inspected their job states and full relevant logs:

| Workflow | Run | Result |
|---|---|---|
| Quality | [37993977581](https://github.com/thiepn/chess/actions/runs/37993977581) | **SUCCESS**, 305 Vitest passes and all P73–P77 Node tests |
| P68 Offline Release Candidate | [37993977584](https://github.com/thiepn/chess/actions/runs/37993977584) | **SUCCESS** in both **package** and **independent recovered-artifact** jobs |
| Device UX | [37993977587](https://github.com/thiepn/chess/actions/runs/37993977587) | **SUCCESS** Chromium and WebKit |
| P67 Visual Candidates | [37993977599](https://github.com/thiepn/chess/actions/runs/37993977599) | **SUCCESS** 18 before/after screenshot pairs, 12 changed |
| Strict Visual Regression | [37993977719](https://github.com/thiepn/chess/actions/runs/37993977719) | **FAIL** 12 visual image comparisons, six passing; independent reviewer baseline approval missing |

The existing visual comparison remains strictly enforced, not a release-qualified green check.

### Independently downloaded and byte-verified P77 artifacts

- Offline archive artifact **`11645723846`**, exact head `abb5f5fa0549179b382e5f8a065751551a2d0168`: downloaded and inspected 102 ZIP entries (99 checked build files plus three evidence files). All 99 `SHA256SUMS.txt` entries exactly match bytes; **zero** missing, altered or additional `dist` files; `dist/.vite/manifest.json` is **present**. ZIP SHA-256 `fc45ed66d5a4b18ab497c5bf8503d4d690a9e64a8e43ec723a9c00fcda5920e2`. The P76 original rehearsal receipt still says `OFFLINE_PREVIEW_ONLY`, `production_deploy=NO`, `rollbackTestedOnProduction:false`, `releaseAuthorized:false`.
- Independent **post-download recovery receipt** artifact **`11647020153`** confirms 99 rehashed build files, matching original pre-upload receipt, hidden manifest present and `releaseAuthorized:false`. The recovered ZIP cannot be treated as an authenticated sync test or a production rollback.
- Visual candidate artifact **`11646376713`**: 18 baseline and 18 candidate PNG byte hashes match the manifest; geometry is 1440×900 desktop or 393×852 phone; P73 actual manifest digest matches P74's immutable receipt. **12 changed, six unchanged**, 18 `PENDING` reviews; 0 actual human accepted/rejected decisions. P74 says `HOLD_HUMAN_AND_PRODUCTION_GATES`; P75 says `HOLD_FOR_INDEPENDENT_HUMAN_ACCEPTANCE`. **14 PENDING** hardware/SSO/accessibility/educator cases; zero real redacted human evidence files.

No new P77 unit, build, offline, candidate-image or automated browser defect is confirmed. The strict visual differences require **authorized independent review**; no automated golden snapshot promotion is allowed.

## II. Actual P78 development — fail-closed cross-artifact reviewer handoff

`scripts/p78-human-decision.mjs` is an independent **offline/visual/human-evidence cross-validator**:

1. Independently rehash **all 36 screenshot PNGs** from the *downloaded* visual artifact at one exact full SHA, and compare the byte-derived manifest digest, all 18 P73 signed-inventory hashes, P74 HOLD receipt, P75 HOLD receipt, immutable reviewer template and baseline *proposal-only* record. Tampered reviewer templates, staged "ACCEPT" claims inside CI-produced packets, stale hashes, overridden baseline permissions and mismatched source commits are rejected.
2. Verify **all downloaded offline build files** at the same exact SHA, including the previously omitted `dist/.vite/manifest.json`, and reconcile the separately downloaded P77 recovery receipt **field by field**. Mismatches in the pre-/post-upload receipt chain are rejected.
3. For any privately supplied human decisions, validate P71 hash-bound visual claims and P72 exact-commit human-device records with actual redacted evidence file byte hashes via P75. These are **claims**, never independently proven human identity/authority. The generated packet excludes raw private material, reviewer personal details and tokens.
4. Evaluate **all five exact-PR-head workflows** (Quality, P68, P67, UX, Visual Regression), as well as **both distinct P68 jobs** (`package` and `Independently verify downloaded guest-only artifact`). Successful generic workflow statuses, old SHAs, missing jobs or unrelated branches do not qualify machine readiness.
5. Emit a conservative immutable-style **P78 reviewer handoff packet** with all 18 image before/after hashes, all **14 P72 cases**, provisional claimed outcomes, exact artifact source hashes, human-review deficits and explicit release blockers. `externalHumanAuthorityCorroborated:false`, `visualBaselineUpdatePermitted:false`, `chessOAuthRegistrationPermitted:false`, `chessAppActivationPermitted:false`, `mergePermitted:false`, `deploymentPermitted:false`, `releaseAuthorized:false`, and `productionRollbackPerformed:false` **always**, even for synthetic full `PASS` reports.

Node-native tests cover realistic constructed visual and offline archives, byte tampering, stale SHAs, forged P73/74/75/recovered receipts, changed reviewer templates, proposed golden authorization, incomplete/failing workflow and offline job matrices, and synthetically full but untrusted physical and visual reports. Quality and P68 run these tests; Vitest excludes the built-in Node test file. P67 paths/branch selectors include P78.

### Operator workflow (private evidence; do not upload sensitive material to GitHub)

Download the **same SHA** Visual Candidates artifact and the **same SHA** Offline Candidate ZIP plus its separate P77 recovered-receipt ZIP. Extract each to a different directory; keep screenshots and raw human evidence in a **private** review workspace. Invoke:

```bash
node scripts/p78-human-decision.mjs \
  ./visual/p69c-visual-review \
  ./downloaded-offline \
  ./P77-RECOVERY.json \
  <exact-P78-head-40-hex> \
  ./P78-HANDOFF.json
```

Optional additional arguments, in order, are `private-visual-decisions.json`, `private-device-cases.json`, `private-evidence-dir` and `ci-runs.json`. CI snapshot JSON uses `{"runs":[...],"offlineJobs":[...],"branchName":"..."}` and must be populated with **verified actual GitHub metadata**; do not fabricate results. The output contains evidence *digests/statuses only*. It refuses overwriting an existing packet. **A passing offline validator does not authorize a baseline, merge or deployment.**

## III. Outstanding independent acceptance / release owners

**Visual:** all **18** screenshot reviews must receive independently verified exact-image-digest acceptance/rejection decisions (12 changed). A reviewer must compare original-resolution captures and real keyboard/touch/focus/zoom. Approval of changed images is a **separate explicit human authorization**; only after it may a new separate golden-baseline commit be considered, followed by strict unchanged Playwright snapshot gate at its new exact source SHA.

**Account/OAuth:** operator must register/activate approved Chess public PKCE client for exact callback `https://chess.thiepn.dev/auth/callback/` through the Account release pipeline, not this repository/PR. Previous read-only state: Chess app inactive, **zero** Chess clients, **zero** connected Chess accounts; Chess state RLS enabled, **three** policies. Account PR #67 remains unmerged/draft. Operator verifies scope, callback, revocation, A→B→guest partitioning, forged/replayed callback prevention and account isolation. No OAuth credentials/tokens or real A/B evidence were supplied here.

**Devices/accessibility:** human must execute real Android Chrome, iPhone Safari, iPad Safari, desktop Chrome/Edge; TalkBack, VoiceOver, NVDA, keyboard, 200% zoom, reduced motion, clock, Stockfish game resume, offline/online transitions, *two physical device* CAS/conflict recovery and A/B sign-out behavior. Automated Chromium/WebKit CI passes do not replace human verification.

**Educator:** independent chess pedagogue must review **86 lessons** and **49 retrieval-only exercises**, report concrete flaws, and sign off only on actually checked content.

**Production release:** independently qualify all final-head tests and accepted baselines, explicitly authorize ordered stack merges, obtain main-push **Quality/Device UX/Visual Regression** on one immutable current main SHA, verify legitimate production rollback and post-deploy health, then an authorized operator alone may set `CHESS_RELEASE_APPROVED_SHA` exactly to that SHA. A guest-only ZIP is not a real rollback. Neither human authority nor production deploy can be inferred from any P78 machine packet.

## IV. Following phase

**P79 — Independent Reviewer Intake & Exact-SHA Release Gate Closure**. **NOT STARTED.** First recheck exact-head P78 tests and artifacts, repair any verified regressions without weakening validation; then use real operator-approved human visual, Account, device/accessibility and educator evidence when supplied, maintaining a release HOLD until every gate and explicit owner approval passes.
