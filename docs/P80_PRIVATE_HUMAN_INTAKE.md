# P80 — Independent Review Intake, Visual Approval Decision & Manual Release Hold

**DRAFT ONLY · NOT RELEASE-QUALIFIED · NO MERGE / NO GOLDEN UPDATE / NO AUTH CLIENT REGISTRATION / NO DEPLOYMENT.**

Base P79 draft PR [#66](https://github.com/thiepn/chess/pull/66), parent exact commit `9dbb26585f3d95a952fb212d56a35a5240623863`.

## 1. P79 exact-head automated evidence

All five workflow results and all seven job logs checked. P79 complete at immutable head `9dbb26585f3d95a952fb212d56a35a5240623863`:

| Workflow | Run | Result |
|---|---|---|
| Quality | [37997531435](https://github.com/thiepn/chess/actions/runs/37997531435) | **PASS** — P79 native Node tests 6/6; Vitest 305/305; build/audits |
| Offline Candidate | [37997531415](https://github.com/thiepn/chess/actions/runs/37997531415) | **PASS** — package + independent post-download recovery job |
| Visual Candidates | [37997531372](https://github.com/thiepn/chess/actions/runs/37997531372) | **PASS** — all 18 source-bound pairs, new P79 reviewer queue generated |
| Device UX | [37997531388](https://github.com/thiepn/chess/actions/runs/37997531388) | **PASS** — 80 Chromium + 16 WebKit tests |
| Strict Visual Regression | [37997531387](https://github.com/thiepn/chess/actions/runs/37997531387) | **FAIL** — 12 genuinely changed but unapproved references; 6 pass |

Visual mismatch is still the legitimate release blocker; golden baselines are not to be replaced without independent reviewer permission, and strict Playwright thresholds must not be weakened.

### Independently downloaded and verified P79 artifacts

- **Offline ZIP, artifact 11647716588:** 102 entries, no duplicates, 99 `dist/` files, **99/99 actual archived bytes match `SHA256SUMS.txt`**, no unlisted/missing build files. `dist/.vite/manifest.json` present. ZIP SHA-256 `8954390321f9e3baac980245ac93bd9c1cdf6e9df20eccefed4249190dca2876`. Exact head matches P79, candidate type `OFFLINE_PREVIEW_ONLY`, `production_deploy=NO`.
- **Independent recovered audit, artifact 11647581667:** sole `P77-RECOVERY.json` reports 99 rehashed, unchanged manifest/provenance, `productionRollbackExecuted:false`, `releaseAuthorized:false`.
- **Unapproved visual ZIP, artifact 11647481855:** 69 files, 18 before and 18 candidate PNGs. **36/36 hash-matched** against exact source manifest, no duplicate ZIP paths. New `p79-independent-review-request.json` and `p79-independent-review-queue.md` present, 18 decisions `PENDING`, 12 changed / 6 unchanged, all **14** independent device/OAuth/a11y/educator cases `PENDING`; zero genuine human signoff.

No confirmed P79 unit/build/browser/package-integrity failure requires a production code fix.

## 2. Actual P80 implementation: isolated human claim intake

`scripts/p80-human-claims.mjs` processes *optional* evidence **on an operator's private machine**:

- Recomputes all 36 visual screenshot bytes and validates the unmodified P79 request, inherited source SHA, P73/P74/P75 evidence, and P71 template before examining any optional human claims. Any discrepancy fails closed.
- For optional visual decisions, uses the original P71 validator to require exact baseline and candidate SHA-256, distinct named 18 entries, dated ACCEPT/REJECT/PENDING, and no changed source.
- For optional real-device, accessibility, account, and educator observations, requires the canonical 14-case P72 plan, matching source SHA, real redacted evidence bytes verified through P75 for every claimed PASS or FAIL, and reject stale/forged/extra/symlink evidence files. Private evidence must reside outside the uploadable visual artifact directory.
- A privacy-safe **claims-only** output reports review statuses, exact image hashes, human evidence SHA-256, and missing decisions, **never raw evidence bytes, reviewer names, free-form observations, credential strings, or OAuth tokens**.
- Even when a complete synthetic claim shows 18 ACCEPT and 14 PASS, the generated verdict stays `HOLD_EXTERNAL_HUMAN_AUTHORITY_AND_MAIN_RELEASE_GATES`. All flags `visualGoldenUpdateAuthorized`, `chessOAuthRegistrationAuthorized`, `chessOAuthActivationAuthorized`, `mergeAuthorized`, `productionRollbackExecuted`, `productionDeployAuthorized`, `releaseAuthorized` are **always false**. Independent identity and physical observation are **never** inferred from formatted claims.
- Exclusive output writes refuse replacing any previous report. When private claims are provided, the output directory must be separate from the visual artifact, preventing accidental GitHub Actions uploads.

The `p67-visual-candidates.yml` workflow now runs **only the zero-claim form** after generating the P79 reviewer request; it uploads `p80-automated-hold.json` with all 18/14 decisions still PENDING. CI **never reads private physical or person-specific evidence**.

Native Node `scripts/p80-human-claims.test.mjs` verifies empty HOLD, forged source P79, stale visual hashes/timestamps, false reviewer acceptance and baseline claims, file-byte tampering/symlink/extra evidence, segregated private output, and a format-valid synthetic one-case human PASS that still cannot authorize a release. Quality and Offline Candidate run these tests; Vitest does not double-run Node-native tests.

### How an authorized human operator can use intake without sharing credentials

Download **an exact one-SHA** P80 visual artifact, extract `p69c-visual-review/` and keep private decisions and redacted files **outside** that directory:

```bash
# CI-generated, zero-claim machine HOLD record (already automatic in P67)
node scripts/p80-human-claims.mjs ./p69c-visual-review <EXACT_VISUAL_SOURCE_SHA> ./p69c-visual-review/p80-automated-hold.json

# Operator-only: the new output and input evidence are outside the uploaded artifact.
node scripts/p80-human-claims.mjs ./p69c-visual-review <EXACT_VISUAL_SOURCE_SHA> \
  ./private/p80-human-claims.json \
  ./private/review-decisions.json \
  ./private/device-decisions.json \
  ./private/redacted-evidence
```

**Important:** This is format/integrity checking only. Never upload the private folder to a public PR, never infer that a claim is a real human sign-off, and never reuse a prior-head decision as approval after source/golden changes.

## 3. Human blockers and operator boundaries

- **Visual:** 18 independent image decisions remain absent, including 12 changed screenshot references. Original `index.html` side-by-side preview and P79 review queue are available. Golden changes require separate explicit authorized approval of exact image hashes; then rerun unchanged strict Playwright on that new exact head.
- **THIEPN Account:** Latest read-only query: Chess inactive, zero registered first-party Chess OAuth clients, zero connected Chess accounts; Chess user-state RLS enabled with 3 policies. Account [PR #67](https://github.com/thiepn/account/pull/67) is unmerged draft `551917d44fb42026ca0eabe6dc0a75385feaf3f1`. Actual operator must authorize public PKCE callback `https://chess.thiepn.dev/auth/callback/`, then physical A/B/guest isolation, revocation/replay and two-device revision/conflict evidence. No Account setting changes performed.
- **Physical/a11y:** Android Chrome, iPhone/iPad Safari, Windows Chrome/Edge, offline/PWA/Stockfish 10+0/15+10 clocks, keyboard, 200% zoom, reduced motion, TalkBack/VoiceOver/NVDA and real two-device recovery need actual human observation.
- **Educator:** Independent expert genuinely reviews all 86 lessons and especially 49 retrieval-only exercises.
- **Release:** Exact main push CI, human approval variable `CHESS_RELEASE_APPROVED_SHA`, known-good real production rollback, smoke tests and deployment authority require separate operator execution. A guest-only checksum-verified ZIP is not a production rollback.

**Next phase:** P81 — Evidence Authenticity, Privacy-Safe Human Corroboration & Exact-SHA Gate Requalification. **NOT STARTED.** Recheck P80 exact-head CI and its zero-claim receipts; tighten non-fabricable provenance and ensure manual reviewer artifacts never cross public CI boundaries. Only consider actual human decisions if independently recorded; continue release HOLD unless explicitly authorized.
