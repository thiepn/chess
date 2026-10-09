# P72 — Visual Decision Reconciliation & Real-Device Acceptance Closure

**Status: implementation in draft; release blocked.** This branch stacks on P71 PR #58 at `f4386cd0ae2c208c3f890c0b88f562fea1197acf`. No one has approved revised screenshots, Chess OAuth, physical-device acceptance or V1.0 deployment.

## Evidence ledger: exact P71 head, verified before P72

| Gate | Evidence | Outcome |
| --- | --- | --- |
| Quality | [run 37945316276](https://github.com/thiepn/chess/actions/runs/37945316276) | Queued during P72 investigation; do not infer success |
| Chromium/WebKit Device UX | [run 37945316374](https://github.com/thiepn/chess/actions/runs/37945316374) | PASS, **emulated only** |
| Visual candidates | [run 37945316496](https://github.com/thiepn/chess/actions/runs/37945316496) | PASS; generated review template (18 pending decisions) |
| Visual Regression | [run 37945316392](https://github.com/thiepn/chess/actions/runs/37945316392) | FAIL: 12 unapproved differences against previously approved goldens |
| Offline Release Candidate | [run 37945316581](https://github.com/thiepn/chess/actions/runs/37945316581) | FAIL: `npm test` collected Node-native `scripts/p71-acceptance.test.mjs`, `No test suite found`, despite 305 Vitest tests passing |

The P71 candidate artifact (ID `11624308693`) has independently verified SHA-256 digests and PNG dimensions for all **36 images** (18 original, 18 candidate), and is bound to exactly `f4386cd0ae2c208c3f890c0b88f562fea1197acf`. The archive's manifest explicitly says `UNAPPROVED`; verification is **not** an assessment of image quality.

## P72 confirmed automated fix

- Exclude Node-native `scripts/p71-acceptance.test.mjs`, `scripts/p72-device-acceptance.test.mjs` and `scripts/p72-visual-reconcile.test.mjs` from **Vitest discovery**, retaining their independent `node --test` executions in **Quality and Offline Release Candidate**. Do not remove or skip tests; this directly fixes the P71 offline job's false Vitest collection failure.
- P72 offline packaging remains **guest-only**, carries the exact PR-head SHA and checks out that commit, runs locked dependencies, all release-gate/visual/human-schema tests, main `npm test`, production build, performance/security audits, and produces SHA-256 checksums. It neither uploads to Pages nor grants any release approval.
- Strict Playwright image comparisons remain `threshold: 0.2` and `maxDiffPixelRatio: 0.005`, unchanged. Goldens remain untouched pending documented independent human inspection.

## P72 visual decision inventory (P71 evidence only)

The previous candidate's **12 changed** screenshots are:

1. `learn-desktop-linux.png`
2. `learn-lesson-phone-linux.png`
3. `learn-phone-linux.png`
4. `library-workspace-phone-linux.png`
5. `play-phone-linux.png`
6. `progress-desktop-linux.png`
7. `progress-phone-linux.png`
8. `review-analysis-phone-linux.png`
9. `review-desktop-linux.png`
10. `review-phone-linux.png`
11. `train-desktop-linux.png`
12. `train-phone-linux.png`

The other six references are byte-identical. All 18 need reviewer decisions; a match is not approval. `scripts/p72-visual-reconcile.mjs` generates `p72-decision-inventory.md` from **each new exact-head** manifest, optionally validating an explicitly supplied human decision record. Its output always states **NOT APPROVED** and cannot promote golden images.

**Human-only instructions:** download the current candidate artifact; inspect `index.html` and the two PNG sets, record independent ACCEPT/REJECT decisions *with exact before/after hashes* using the P71 worksheet, and test actual focus/contrast/overflow/200% text independently. Reject any unreviewed or visually deficient candidate. If a reviewed image needs code changes, regenerate on a new SHA and repeat review. Only after human acceptance may an authorized reviewer commit chosen golden PNGs. Re-run strict screenshots and full CI on that new immutable SHA. Review cannot be prepopulated by CI.

## P72 operator device/account/instruction checklist

Run `node scripts/p72-device-acceptance.mjs prepare <full-git-sha> p72-device-review.json` in a local reviewer workspace. The command refuses overwrites and creates **14 PENDING cases**. For each executed case, record PASS/FAIL, physical model, actual OS/browser, identity/role of tester, exact tested commit, UTC timestamp, concrete steps, observations and SHA-256 of **redacted** video/log/screenshot evidence. Do not put JWTs, OAuth codes or personal data in the evidence.

Required areas: two Android Chrome journeys, iPhone Safari, iPad Safari, desktop Chrome/Edge game restore, TalkBack, VoiceOver, NVDA, real Account A→B→guest and revoke/PKCE, two simultaneous physical-device revision conflicts, independent educator audit of 49 retrieval-only exercises, and independent visual approval.

Check using `node scripts/p72-device-acceptance.mjs check p72-device-review.json`; it fails if any entry is pending or failed. **Machine completeness is only schema validation:** forged descriptions/hash strings cannot replace observation or human authority and do not authorize release. See `docs/P71_HUMAN_ACCEPTANCE_AND_RELEASE.md` for acceptance procedure.

### First-party OAuth remains operator-gated

2026-10-09 read-only THIEPN Account SQL check: `chess` app **inactive**, **0 registered Chess clients**, **0 connected Chess accounts**, and `chess_user_state` RLS **enabled** with 3 policies. The Account registration draft is [thiepn/account #67](https://github.com/thiepn/account/pull/67). Register a unique public OAuth client for canonical `https://chess.thiepn.dev/auth/callback/` only through the Account operator procedure; do **not** issue credentials, activate the product, or run an unsafe automatic registration from this phase. Real A/B and physical multi-device probes cannot be claimed without actual registration/authorization.

## Release criteria and disposition

- Every automated P72 final-head Quality, browser UX, candidate integrity and **offline package** job must pass; strict Visual Regression may *only* pass after independently approved reference updates.
- Human review and operator acceptance remain gates, not documentation conveniences. Do not merge draft #46–#59 stack, deploy Pages, change `CHESS_RELEASE_APPROVED_SHA` or tag V1.0 without explicitly recorded approvals.
- Main-branch SHA, release artifact/rollback SHA and three main-push CI checks must match before operator sets the exact approved release SHA and publishes. PR success alone is insufficient.

Next phase: **P73 — Visual Baseline Approval & Account/Device Release Readiness**, status NOT STARTED. Begin with P72 exact-head CI and fix failures before further release steps.
