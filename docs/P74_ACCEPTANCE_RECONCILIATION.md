# P74 — Independent Acceptance Reconciliation & Exact-Head Promotion Readiness

**RELEASE HOLD: DRAFT, NOT APPROVED, DO NOT MERGE/DEPLOY.**
P74 is stacked above P73 draft PR #60 at exact original head `fe018d95208d7a6c7784e1460b114cbdc97a9526`. There is no approved Chess V1.0 release.

## 1. P73 exact-head gate inspection (October 9, 2026)

| Required workflow | GitHub Actions | Verified conclusion when P74 began |
| --- | --- | --- |
| Quality | [37952537057](https://github.com/thiepn/chess/actions/runs/37952537057) | **QUEUED** — no assertion of success |
| Device UX: Chromium + WebKit | [37952537069](https://github.com/thiepn/chess/actions/runs/37952537069) | **QUEUED** — no assertion of success |
| Offline Release Candidate | [37952537115](https://github.com/thiepn/chess/actions/runs/37952537115) | **QUEUED** — no assertion of success |
| Visual Candidates | [37952537121](https://github.com/thiepn/chess/actions/runs/37952537121) | **SUCCESS** — no human acceptance |
| Strict Visual Regression | [37952537130](https://github.com/thiepn/chess/actions/runs/37952537130) | **FAILURE** — 12 changed golden references, 6 passes; human baseline approval required |

At recheck, exact-P73-head Quality, UX and Offline Candidate remained queued. No failure may be diagnosed from a queued job and a different commit's green result is not reusable.

### Visual artifact independently reopened

The successful P73 artifact ID `11626866209` was downloaded and inspected. The archived `p69c-visual-review/manifest.json` and `p73-image-integrity.json` both identify P73 exact SHA `fe018d95208d7a6c7784e1460b114cbdc97a9526`. All **36 PNG bytes** (18 baseline, 18 candidates) match the 18 reported SHA-256 pairs and viewport dimensions; **12 changed**, **six unchanged**, **zero mismatches**. All **18 review-template decisions PENDING**. Artifact metadata explicitly contains `status:"UNAPPROVED"` and `releaseAuthorization:false`. Hash correctness is not human visual approval.

## 2. P74 implementation and confirmed fix

### Raw-manifest provenance correction

The P73 receipt labelled `manifestSha256` previously hashed a newly serialized JavaScript object rather than the uploaded `manifest.json` bytes. This could produce a different digest when whitespace or key order changed, falsely representing the digest as an artifact-file checksum.

P74 now reads `manifest.json` directly and hashes those **exact file bytes** after confirming its parsed content matches the candidate's manifest object. Existing integrity regressions now create that original file. All earlier image-hash, PNG, dimensions, required scenario, and immutable SHA checks remain strict.

### Fail-closed acceptance reconciliation

`scripts/p74-release-reconcile.mjs` verifies the actual archived screenshot bytes with P73, reconciles every hash with the P71 visual review decision schema, and independently checks P72's 14 mandatory physical-device/OAuth/accessibility/educator acceptance cases. When no human inputs are supplied, reports **18 pending visual decisions** and **14 pending acceptance cases**. When external decisions are supplied, it checks exact source SHA, reviewer/date/notes and case provenance, but it still cannot establish reviewer authority or prove any physical test occurred.

It writes **new, non-overwriting** `p74-release-evidence.json` and `p74-human-acceptance-guide.md`. The artifact explicitly includes `productionReleaseAuthorized:false` and `verdict:"HOLD_HUMAN_AND_PRODUCTION_GATES"` even if every supplied self-reported case is marked PASS. CI must **never** silently promote human decisions or golden images.

Added test suites cover pending defaults, complete-but-untrusted claims, stale SHA, tampered/misordered hashes, rejected human decisions and failed device cases. Node-native suites run explicitly under Quality and Offline packaging and remain excluded from Vitest collection. P67 screenshot generation now issues the P74 report **only after** P73 verifies PNGs on exact immutable PR head, with the untouched golden snapshots and strict tolerance.

## 3. Human-only acceptance checklist (all pending)

- **Visual:** Independently review all 18 baseline/candidate pairs (12 changed); reject any design/contrast/board/interaction defect; approve hashes and resulting baseline code change explicitly, then re-run strict Visual Regression on the next immutable commit. Never change `threshold:0.2` or `maxDiffPixelRatio:0.005` to pass.
- **Account OAuth:** The last authorized read-only THIEPN Account check showed inactive `chess` app, zero registered Chess OAuth clients and zero connected Chess users, RLS enabled with three policies. Authorized operator must register and test an app-scoped public OAuth 2.1 PKCE client using exact `https://chess.thiepn.dev/auth/callback/` before activating the app. This P74 branch does not register, mint, authorize or deploy it.
- **Real user privacy:** Independent real A→B→guest session, cross-tab logout, callback replay, revocation, offline refresh, and two-physical-device CAS conflict tests, with redacted evidence.
- **Physical UX:** Android Chrome, iPhone Safari, iPad Safari, desktop Chrome/Edge, full Stockfish games, restored 10+0 and 15+10 clocks, promotion, deep links, offline/PWA and background recovery.
- **Accessibility:** TalkBack, VoiceOver, NVDA, keyboard-only, focus/board labels, 200% zoom, reduced motion and responsive overflow.
- **Pedagogy:** Independent chess teacher review of 86 lessons with specific scrutiny of 49 retrieval-only (non-independent-transfer) exercises. Scope public learning claims or replace exercises.
- **Controlled production:** Every required **same-head** PR gate must pass; ordered stack merges need explicit approval. Re-verify three required green **main push** checks on the final immutable main SHA, then an authorized operator independently sets `CHESS_RELEASE_APPROVED_SHA` to that SHA. Verify production keys/client, Pages artifacts, real user smoke tests and rollback. No build in this stack changes the release variable or performs a deployment.

## 4. P74 engineering exit criteria (not yet met)

1. P74 final-head Quality, Chrome/WebKit, Offline Candidate and Visual Candidates workflows complete successfully. Queued and prior-head checks do not count.
2. All required screenshot comparisons green **after** independent authorized visual sign-off; until then the failure remains a valid blocker.
3. Registered OAuth and physical acceptance evidence is externally corroborated, with owner/instructor approvals.
4. All production release gates/rollback and exact-main-SHA manual authorization explicitly satisfied.

**Next phase:** P75 — Human Approval Intake, Visual Baseline Requalification & Release Decision. Current status: NOT STARTED. Start with P74 exact-head checks and human approval status; never assume that review artifacts or generated checklists certify live user or hardware acceptance.
