# P73 — Visual Baseline Approval & Account/Device Release Readiness

**Disposition: DRAFT, RELEASE BLOCKED.** Stacked on P72 PR #59 at exact parent `e6bd7d6f2675220d03aa6e00e93e7b42fdbfaa66`. This phase does not approve snapshots, register OAuth clients, merge PRs, activate Chess, update production variables or deploy.

## P72 exact-head verification (inspected before P73)

| Exact-head job | Run | Observed status |
| --- | --- | --- |
| Quality | [37951015247](https://github.com/thiepn/chess/actions/runs/37951015247) | QUEUED at initial inspection; no pass may be inferred |
| Chromium + WebKit Device UX | [37951015098](https://github.com/thiepn/chess/actions/runs/37951015098) | IN PROGRESS at last pre-P73 check |
| Offline Release Candidate | [37951014930](https://github.com/thiepn/chess/actions/runs/37951014930) | **PASS**: P72 separated Vitest and Node native test suites correctly; immutable guest-only artifact ID `11626695408` |
| Visual candidates | [37951015393](https://github.com/thiepn/chess/actions/runs/37951015393) | **PASS**: artifact ID `11625324824`, all decisions UNAPPROVED |
| Strict Visual Regression | [37951015253](https://github.com/thiepn/chess/actions/runs/37951015253) | IN PROGRESS at last pre-P73 check; old approved P59 references must NOT be replaced without human sign-off |

The P72 visual artifact was downloaded and **all 36 actual PNG byte hashes and geometry were independently verified** against its exact-head manifest: 18 pairs, **12 changed**, **0 mismatches**, **0 missing/extra images**. No reviewer decision was present; comparing image hashes does not qualify their visual design. P71 screenshot deltas and P72 screenshots have the same 12 changed names. All such changes remain **unapproved**.

## P73 implementation: image payload integrity

- `scripts/p73-verify-visual-artifact.mjs`: **re-hashes the actual screenshot PNG files** from the preserved baseline/candidate directories. Rejects stale/mismatched commit SHA, unexpected path/names, omitted/extra files, symlinks/nonfiles, invalid PNG signature/IHDR, wrong viewport geometry, byte length/hash mismatch, and changed flags inconsistent with hashes.
- Enforces the full nine-route × two-viewport inventory at 1440×900 desktop and 393×852 phone; any additions require an explicit reviewed inventory change rather than silently accepting a substituted page.
- Emits `p73-image-integrity.json` as **UNAPPROVED** with hashes and `releaseAuthorization:false`; refuses overwriting existing integrity reports. No accepted baseline PNGs are committed.
- Runs regression tests via **Node's own test runner** in Quality and Offline CI, excluding those tests from Vitest's collection without skipping any assertions.
- Candidate workflow checks actual file integrity **before** preparing the 18 human visual decisions and releasing a downloadable artifact. All checks bind to `github.event.pull_request.head.sha`.

## Remaining independent human gates (all PENDING)

### Visual acceptance

1. Download the **final P73 PR SHA** successful Visual Candidates artifact, read `p73-image-integrity.json`, and cross-check its commit with PR head. Open its `p69c-visual-review/index.html`.
2. Inspect all 18 old/new views (12 changed, six unchanged) at native desktop/mobile resolution; include focus ring visibility, play board proportions, touch promotion and clipping, learn/training layout readability, review/progress history honesty and mobile navigation.
3. Record unique, human-authored verdicts with reviewer, UTC date, justification, and both SHA-256 hashes using `review-template.json` copied to `review-decisions.json`; never accept PENDING, invalid, rejected or unmatched evidence.
4. Actual UX/keyboard, high zoom, small viewport and reduced-motion checks must supplement static comparisons. If a candidate fails, **fix source and recapture on a new SHA**; regenerate all evidence.
5. Only an **independent, authorized reviewer** can approve baseline replacement. Commit accepted PNGs to a newly reviewed commit; rerun the unchanged Playwright `threshold:0.2` and `maxDiffPixelRatio:0.005` gate. New commit means requalify exact-head release evidence.

### OAuth and real user data

The latest read-only THIEPN Account Supabase inspection on October 9 showed: Chess app **inactive**, **0 registered Chess first-party OAuth clients**, **0 connected Chess accounts**, `chess_user_state` RLS **enabled with three policies**. These verify readiness restrictions, not a working OAuth login.

- An authorized operator (Account PR [#67](https://github.com/thiepn/account/pull/67)) must manually register exactly one public Chess OAuth Authorization Code + PKCE client for `https://chess.thiepn.dev/auth/callback/` and verify exact origin/callback. No automatic dynamic registration, other-app ID reuse, client secrets in browsers, or premature activation.
- Independently exercise identity A → B → guest with **real** accounts, same-browser and cross-tab logout, authorization callback replay protection, access-grant revoke/disconnect, offline/token-expired recovery, app-only JWT and RLS.
- Test simultaneous revision conflicts on two distinct **physical** devices, both resolution choices, pending write retry, stale account tab, encrypted/archived recovery and export without cross-user data exposure. Redact tokens from traces.

### Physical devices, accessibility and pedagogy

- Physical Android Chrome, iPhone Safari, iPad Safari and desktop Chrome/Edge. Run actual 10+0 and 15+10 full games, Stockfish analysis, page refresh/background clocks and offline/PWA restore.
- NVDA, VoiceOver and TalkBack with board navigation, promotions, focus, semantic labels and live announcements. Also 200% zoom, landscape/split view and reduced motion.
- A chess educator must inspect 86 lessons, especially the **49 retrieval-only exercises**, validate rule/engine claims, and either replace with distinct transfer positions or explicitly scope effectiveness claims.
- Start the `scripts/p72-device-acceptance.mjs` worksheet with the **actual P73 SHA**. Its 14 cases default to **PENDING**, require recorded steps and external evidence fingerprints. A syntactically passing worksheet is not proof that a reviewer genuinely executed the cases.

## Final release safeguards

Keep P61–P73 PRs as draft until all automated gates and human authorizations pass. No merge/deploy while strict Visual Regression or any human gate remains incomplete. After explicitly approved ordered merges, three required **main push** checks must pass on the same immutable main SHA; only an authorized operator sets `CHESS_RELEASE_APPROVED_SHA` to that exact SHA after verifying the registered public OAuth client and audited artifact. Record independently tested rollback and production smoke tests.

**Next phase: P74 — Independent Acceptance Reconciliation & Exact-Head Promotion Readiness.**
P74 begins by inspecting every exact P73 head job and artifact; it must not treat queued, cancelled, skipped or old-P72 checks as successful.
