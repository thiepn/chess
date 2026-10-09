# P71 — Human Acceptance Evidence & Controlled Release

**STATE: DRAFT / HUMAN APPROVALS PENDING / NO PRODUCTION RELEASE.** This document is an execution checklist and evidence inventory, **not** sign-off. P71 stacks on P70 [#57](https://github.com/thiepn/chess/pull/57), which stacks on P69C [#56](https://github.com/thiepn/chess/pull/56) and P61–P69B. `main` remains P60 at `f2650a63d83bd0280a257c609731c9e07bc838ae`.

## Preflight evidence from P70 (NOT P71's own checks)

- P70 source: `0529e3538a36f27733f73da8f307f62db7e9a128`.
- [Quality run 37933839081](https://github.com/thiepn/chess/actions/runs/37933839081): PASS.
- [Chromium + WebKit Device UX run 37933839118](https://github.com/thiepn/chess/actions/runs/37933839118): PASS (emulation, not real devices).
- [Visual Candidates run 37933839064](https://github.com/thiepn/chess/actions/runs/37933839064): PASS. Its immutable SHA-256 artifact has **18 image pairs, 12 changed**, all `UNAPPROVED`.
- [Strict Visual Regression run 37933839073](https://github.com/thiepn/chess/actions/runs/37933839073): FAIL because unapproved P64 visuals intentionally differ from old P59 approved baselines. **Never lower the diff threshold or automatically replace screenshots.**
- [Pages workflow](https://github.com/thiepn/chess/actions/workflows/deploy-pages.yml): no P70 deployment; the production gate is not satisfied.

## P71 engineering and evidence changes

1. `scripts/p71-acceptance.mjs` validates the v2 image manifest, exact immutable SHA, all 18 unique reference pairs, SHA-256 fingerprints and valid screenshot dimensions; emits `review-template.json` (**every decision PENDING**) and `review-checklist.md` without modifying any goldens.
2. A separate manual `check` command enforces that every decision binds to both exact before/after image hashes, with explicit ACCEPT/REJECT, reviewer identity, dated timestamp and explanatory note. It fails if any image remains pending/rejected or if any image/hash/commit differs. A machine-validated record **does not establish that a human actually viewed images**, nor replace independent approval or authorize release.
3. `scripts/p71-acceptance.test.mjs` tests pending-by-default, all-image review, rejection, stale SHA, wrong hash, duplicate/missing reference, invalid date/identity, malformed manifest, and absence of automatically generated human decision files. It runs in Quality.
4. P71 extends the non-deploying P67 candidate job: checkout exact immutable source, capture all 18 pairs, create the HTML comparison + undecided human worksheet, upload a review artifact. It **never writes** `review-decisions.json` or approved snapshot references.
5. P71 enables P68's **guest-only** offline candidate workflow for the P71 draft. That workflow verifies the exact candidate git commit before locked dependency install, build, unit tests, performance/security audits, and SHA-256 artifact upload. This is not an authenticated Account test, signed release, or deployment.

## Procedure A — Independent visual acceptance (operator/reviewer)

1. From final P71 SHA download its successful **P67 Visual Candidates** workflow artifact. Verify `manifest.json.commit` equals the exact P71 head; confirm 18 matching image pairs and the listed hashes.
2. Open `p69c-visual-review/index.html`. Inspect 18 desktop/phone pairs at normal size. In particular evaluate the P64 changes to pieces, square cues, typography, the Train queue, Learn readability, Play touch targets, Review hierarchy, Progress honest empty-history state and phone navigation.
3. Separately exercise keyboard focus, promotion, small/large screen overflow, orientation changes and 200% text zoom. Static screenshots cannot verify functionality.
4. Copy `review-template.json` to a new `review-decisions.json` and explicitly fill **all 18** decisions and each reviewer/UTC date/reason. Affected images may be ACCEPT or REJECT; do not count a still-pending image as approved. The independent reviewer must approve the *actual* exact candidate rendered images.
5. From an isolated checkout with the same manifest, run:

   `node scripts/p71-acceptance.mjs check p69c-visual-review/manifest.json p69c-visual-review/review-decisions.json`

   It must fail on missing/rejected/stale decision evidence. **Passing verifies structure and hashes only; a trusted human still checks the reviewer's authority and evidence.**
6. If images are rejected, fix the underlying UI, recapture on a **new SHA**, and repeat the complete review. If accepted, commit only the new individually approved image references on a new reviewed commit (binary images), leaving Playwright's `threshold: 0.2` and `maxDiffPixelRatio: 0.005` unchanged. The review must be re-bound to the final changed SHA. Run strict Visual Regression on that final commit.

## Procedure B — Human Account OAuth and data safety (BLOCKED)

P69C backend readback recorded `account_apps.slug=chess` as **inactive**, with **zero first-party Chess OAuth clients**. Three owner-RLS policies and connection/grant checks are installed. This is infrastructure, **not successful browser login**.

**Operator-only prerequisites** (follow `thiepn/account/docs/FIRST_PARTY_CLIENT_ONBOARDING.md`, inspect Account PR #67):
- Review `auth.oauth_clients` and `account_first_party_oauth_clients` to avoid duplicates. Register exactly one native public Chess OAuth 2.1 Authorization Code + PKCE S256 client; do **not** use automatic DCR or another app's UUID.
- Bind canonical origin `https://chess.thiepn.dev/` and callback `https://chess.thiepn.dev/auth/callback/` to the actual issued UUID by reviewed Account migration. Keep Chess inactive until consent, callback, access-grant and connection acceptance is recorded.
- Test live account A/B, logged-out guest, one-use callback/state, app-only JWT, no cross-app token reuse, sign-out while saving, grant revoke/disconnect (old JWT rejection), offline/reconnect, and stale-tab behavior.
- On two real independent devices test same-account changes, revision conflicts, both conflict resolutions, recovery export, A→B→guest isolation and no cross-account data exposure.

Record tester, user identities using **non-sensitive labels only** (no tokens), exact app/build SHA, environment, screen recording or redacted trace, expected/actual, device/browser, timestamp, and operator sign-off. **No mock browser test satisfies these gates.**

## Procedure C — Human device / accessibility / pedagogy (BLOCKED)

Required hands-on matrix (mark PENDING unless executed):
- Android Chrome including 360 px-class and home-screen launch, portrait/landscape, keyboard overlay, Train→Play→Review, promotion, real Stockfish engine restart, 10+0 and 15+10 background clocks, and offline transition.
- Physical iPhone Safari and iPad Safari, including address-bar changes, split view, repeated reload, touch targets, engine worker lifetime and deep links.
- Desktop Chrome/Edge: mouse+keyboard, actual complete game, engine review/replay, restore after reload, PWA/offline behavior, text zoom to 200%, OS text scaling.
- TalkBack, VoiceOver and NVDA assistive technology; screen-reader reading order, roving board navigation, focus, labels, live updates and reduced motion.
- Independent instructor checks for rule demonstrations, promotion correctness, engine-optimality caveats, critical review explanations, and the 49 of 86 retrieval-only lesson exercises. Author distinct transfer positions or release with appropriately scoped learning claims.

Use a dated per-device acceptance record. Include OS/browser version, test device, exact candidate SHA, reproduction steps, defects, screenshots/video hashes, tester and explicit PASS/FAIL. A CI browser emulator result is labeled **AUTOMATED ONLY**.

## Procedure D — Controlled production promotion (NOT AUTHORIZED)

- Keep all PRs #46–#58 in their proper stacked order; never merge a child before its accepted ancestors. Refresh any stale branch if ancestry changes; never force-push over another developer's work.
- All automated checks on a candidate SHA: **Quality, Device UX Chromium+WebKit, strict Visual Regression, offline artifact integrity**, plus human sign-offs from A/B/C.
- Merge only after complete acceptance and authorized human approval. On the exact resulting `main` commit re-run **all three main push gates**. No PR-only workflow success may substitute.
- Only then an authorized operator records `CHESS_RELEASE_APPROVED_SHA` as that full *current* main SHA and confirms `CHESS_SUPABASE_URL`, `CHESS_SUPABASE_PUBLISHABLE_KEY`, and the real `CHESS_OAUTH_CLIENT_ID`. No service-role keys or fake client IDs.
- Audit immutable static artifact, maintain rollback SHA/artifact, inspect actual Pages URL, test live authentication and games, and record release authorization separately. Deployment and tags stay blocked without every gate.

## Evidence inventory at P71 creation

| Gate | Evidence | Verdict |
| --- | --- | --- |
| Source and P70 tests | P70 exact SHA and CI above | PASS for P70 only |
| P71 exact-head Quality / UX / visual candidates / offline artifact | To be recorded after P71 PR CI | PENDING |
| Strict P64-approved Visual Regression | Human approval plus new committed baselines required | **BLOCKED** |
| Live first-party Account OAuth registration and A/B device matrix | Interactive operator and independent tester | **NOT TESTED** |
| Physical Android, iPhone/iPad, screen readers, actual engine clocks | Hands-on observations | **NOT TESTED** |
| Educational audit, 49 retrieval-only lessons | Independent chess instructor | **NOT APPROVED** |
| Exact-main-SHA release approval, rollback and production smoke test | Operator | **NOT AUTHORIZED** |

Next planned phase: **P72 — Visual Decision Reconciliation & Real-Device Acceptance Closure**, if P71's machine qualification is green. Do not call P71 release-complete if human gates remain.
