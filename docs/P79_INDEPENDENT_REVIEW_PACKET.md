# P79 — Independent Reviewer Intake & Exact-SHA Release Gate Closure

**Disposition: DRAFT · HUMAN APPROVAL MISSING · DEPLOYMENT HOLD.**
P79 is stacked on [P78 PR #65](https://github.com/thiepn/chess/pull/65) at its exact source SHA `0d8144e85f037a56a0a95fdd37312d963f4f2d17`. Nothing here merges, authorizes a release, registers or activates a first-party Chess OAuth client, changes existing screenshot goldens, or performs a real production rollback.

## 1. Exact P78 source and CI qualification

Every P78 job and its full available failure-relevant logs were inspected:

| Source workflow | Immutable run | Conclusion |
|---|---|---|
| Quality | [37994743790](https://github.com/thiepn/chess/actions/runs/37994743790) | **SUCCESS** — 305 Vitest passes plus all six P78 tests, build/performance/security |
| P68 Offline Release Candidate | [37994743812](https://github.com/thiepn/chess/actions/runs/37994743812) | **SUCCESS** — `package` and independent `recovery` jobs both passed |
| Device UX | [37994743852](https://github.com/thiepn/chess/actions/runs/37994743852) | **SUCCESS** — both Chromium and iOS WebKit browser suites |
| P67 Visual Candidates | [37994743799](https://github.com/thiepn/chess/actions/runs/37994743799) | **SUCCESS** — exact-head unapproved screenshot evidence |
| Strict Visual Regression | [37994747582](https://github.com/thiepn/chess/actions/runs/37994747582) | **FAILURE** — 12 changed and **not independently approved** screenshots, six passed |

**No confirmed build, compilation, device-browser or artifact integrity defect remains at P78 head.** The 12 strictly enforced visual differences are real; automated baseline replacement, threshold relaxation or fabricated human signoff are prohibited. The P78 parent is not release qualified.

Downloaded and independently inspected the P78 GitHub Actions artifacts:
- [Offline candidate artifact ID 11646751995](https://github.com/thiepn/chess/actions/runs/37994743812): **102 ZIP entries** (99 build files, three provenance records), all **99** SHA-256 checksums match actual archived bytes including `dist/.vite/manifest.json`; no extra or missing build file. ZIP SHA-256 `76a510cdb28eab519961854bd52f1e8237110dbf8e6f135def89b56bf69b9b2c`. `OFFLINE_PREVIEW_ONLY`, no actual authenticated-synchronization or production rollback proof.
- Independent recovery artifact 11646462651: receipt reports all 99 re-hashed files at exact P78 SHA, `releaseAuthorized:false`, `productionRollbackExecuted:false`.
- [Visual artifact ID 11646602276](https://github.com/thiepn/chess/actions/runs/37994743799): all 18 baseline/candidate pairs, **36/36 real PNG SHA-256 digests** and dimensions validated against manifest. **12 different, six unchanged.** Original machine-owned P74/P75 receipts are HOLD, **18 PENDING** visual decisions, **14 PENDING** human/device/OAuth/a11y/educator acceptance cases and **zero genuine human evidence files**.

The changed images awaiting independent review are `learn-desktop-linux.png`, `learn-lesson-phone-linux.png`, `learn-phone-linux.png`, `library-workspace-phone-linux.png`, `play-phone-linux.png`, `progress-desktop-linux.png`, `progress-phone-linux.png`, `review-analysis-phone-linux.png`, `review-desktop-linux.png`, `review-phone-linux.png`, `train-desktop-linux.png`, and `train-phone-linux.png`. The six unchanged pairs also need real reviewer decisions.

## 2. P79 engineering changes

`scripts/p79-independent-review.mjs` creates a reproducible, human-usable reviewer **request**, not an approval, directly from actual image bytes and the independent P73, P74 and P75 exact-commit source receipts:

- Recomputes hashes of **all 36 screenshot files**, requires exact P73 integrity JSON equivalence, and checks immutable P74 and P75 HOLD records, all 18 `PENDING` original decisions, no evidence or approval flags.
- Checks that the original P71 visual decision template is unmodified and every entry of the P75 baseline proposal still matches SHA-256 image hashes, `proposalOnly:true`, and `reviewerClaim:PENDING`. Rejects forged `ACCEPT`, golden permissions, stale HEAD or substituted images.
- Writes `p79-independent-review-request.json` with 18 pairs and 14 mandatory human cases, exact SHA-256 hashes and relative before/after image paths; writes `p79-independent-review-queue.md` with direct relative **clickable baseline/candidate links** for all 18 pairs and 14 operator acceptance objectives; and writes `p79-device-template.json` using the existing canonical P72 human schema. Every verdict is PENDING, all release/merge/OAuth/golden/rollback permissions are false, and an existing reviewer decision file is **never overwritten**.
- All three artifacts are created only with exclusive `wx` writes and explicitly labeled HOLD. The viewer already provided in the visual ZIP remains unchanged.
- A separate **six-test** native Node suite covers success inventory, changed/missing/symlink PNG bytes, stale source SHA, P73/74/75 forged records, preapproved decisions/false golden claims, all 14 mandatory P72 cases and non-overwrite preservation of human decisions.
- Exact-head Quality and P68 Offline Candidate invoke the new tests (Vitest excludes this Node suite); the P67 visual-candidates job generates the actual review packet after P75 evidence intake and includes it in its existing **unapproved** candidate artifact. This avoids inventing an approval based on CI.

Command once private/downloaded visual artifact is extracted:

```bash
node scripts/p79-independent-review.mjs ./p69c-visual-review <EXACT_ARTIFACT_SOURCE_SHA>
```

Do **not** run with a different head SHA than the visual artifact, edit the original generated template to insert fake approvals, or upload sensitive human review evidence into public PR artifacts.

## 3. Real independent human acceptance remains necessary

**Visual reviewer:** Independent real person opens `index.html` or compares both images for all 18 rows, inspects keyboard/touch/screen-reader and real device behavior, records hash-bound dated ACCEPT/REJECT in a **private copy** of `review-template.json`. Unchanged images require decisions too. A structural PASS does **not** prove the reviewer genuinely inspected them or has authority. Only a separately explicitly authorized golden change after review may produce an updated baseline, then run strict Playwright without weakened tolerances.

**First-party Account:** Latest known read-only Chess app state: inactive, zero OAuth clients, zero linked users; account state RLS enabled with three policies. Account [PR #67](https://github.com/thiepn/account/pull/67) remains unmerged/draft. Real operator must authorize OAuth public PKCE Chess registration using exact `https://chess.thiepn.dev/auth/callback/`. After independent operator consent, demonstrate real account A→B→guest separation, callback replay, revocation, two-device simultaneous revision conflicts and recovery; preserve redacted SHA-256 evidence privately. Chess repo must not register/activate itself or expose credentials.

**Physical devices and accessibility:** Real Android Chrome, iPhone/iPad Safari, desktop Chrome/Edge, offline/PWA resume, Stockfish, clocks 10+0 and 15+10, keyboard and 200% zoom/reduced motion, TalkBack/VoiceOver/NVDA, account A/B and two-device CAS. CI Chromium/WebKit emulator successes cannot replace actual device or assistive-technology signoff.

**Pedagogy:** Independent chess instructor must genuinely assess the 86-lesson curriculum including 49 retrieval-only exercises and record concrete correctness/transfer findings before marking the educator case PASS.

**Release/rollback:** Current exact-main push checks and explicit `CHESS_RELEASE_APPROVED_SHA` remain unqualified. Restore/rollback must be separately rehearsed with an actual known-good **production** artifact in authorized isolated infrastructure. A verified guest-only ZIP is not such evidence. All merges and deployment require separate explicit human authorization.

## 4. Following phase

**P80 — Independent Review Intake, Visual Approval Decision & Manual Release Hold**. **Not started**. Recheck P79 exact-head CI and all generated artifacts, fix confirmed defects without weakening snapshot or security gates, process *only real independently submitted* visual decisions and A/B physical/evaluator evidence, maintain release HOLD until all gates and explicit operator approvals are actually present.
