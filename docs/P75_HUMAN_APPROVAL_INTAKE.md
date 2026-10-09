# P75 — Human Approval Intake, Visual Baseline Requalification & Release Decision

**Status: draft / HUMAN ACCEPTANCE NOT OBTAINED / RELEASE HOLD.** P75 stacks on P74 draft PR #61 at exact parent `522c25fba23e358d81b39fad3e48bda3f6685dcb`. Never merge, deploy or activate Chess OAuth from these acceptance utilities.

## Source and CI evidence — checked 2026-10-09

The five *P74* workflows at exact head `522c25fba23e358d81b39fad3e48bda3f6685dcb` are still **QUEUED** at the P75 starting and mid-implementation rechecks. There are no executable job logs and no P74 workflow artifacts. **Do not report P74 as passing, failing, or release-qualified.** The jobs are:
- Quality [37953621321](https://github.com/thiepn/chess/actions/runs/37953621321)
- Chromium/WebKit Device UX [37953621100](https://github.com/thiepn/chess/actions/runs/37953621100)
- P68 Offline Release Candidate [37953621450](https://github.com/thiepn/chess/actions/runs/37953621450)
- P67 Visual Candidates [37953621501](https://github.com/thiepn/chess/actions/runs/37953621501)
- Strict Visual Regression [37953622044](https://github.com/thiepn/chess/actions/runs/37953622044)

For independently available prior-head evidence, P73 [Visual Candidates 37952537121](https://github.com/thiepn/chess/actions/runs/37952537121) succeeded and [strict Visual Regression 37952537130](https://github.com/thiepn/chess/actions/runs/37952537130) failed **12** cases matching 12 changed P64 screenshots. The P73 artifact `11626866209` was downloaded and independently reopened: 18 before/after pairs, all 36 PNGs with expected SHA-256 and dimensions, **zero hash mismatches**; every review decision is still PENDING. **This does not qualify the P74/P75 commit**. P73 cannot substitute for a queued newer job.

## P75 implementation: verify actual human-evidence files, not only claimed hashes

`scripts/p75-human-approval-intake.mjs` adds a deliberately **read-only, fail-closed human approval intake** on top of the P71–P74 evidence schemas. It reuses the exact-head image byte verifier and the P74 acceptance receipt, then:

1. Verifies all 18 before/after visual images from the exact commit and creates a per-image *baseline proposal* retaining the old and candidate SHA-256 hashes and human decision state. `proposalOnly:true`, `baselineFilesModified:false`, `independentlyAuthorized:false`, `commitPermission:false`, `deploymentPermission:false`. **Never writes approved snapshot files, alters thresholds or replaces golden references**.
2. Requires the full P72 list of **14 human acceptance cases**. For any case claimed as PASS or FAIL, requires a corresponding actual local **redacted** `<case-id>.evidence` file and rehashes its bytes using SHA-256. Refuses missing, empty, symlink, excessive-sized (over 128 MiB), tampered or nonmatching files. The file can contain redacted PDF/video/log/screenshot material; use this extension to avoid assuming the evidence MIME type.
3. The P71 visual review validator binds every decision to the exact before/after screenshot SHA-256. The P72 device validator binds each case to the exact candidate git SHA and requires a human tester, real environment, timestamp, concrete steps and observations. A synthetic record or an unrelated commit cannot qualify.
4. Reports `HOLD_FOR_INDEPENDENT_HUMAN_ACCEPTANCE`, `actualReviewerAuthorityEstablished:false`, `approvedGoldenSnapshots:false`, `readyToCommitGoldenBaselines:false`, `readyToMerge:false`, `readyToDeploy:false`, `releaseAuthorized:false` **unconditionally**. This tool checks consistency and existence, **not authenticity of human observation or approval**.
5. Emits separate non-overwriting `p75-intake-evidence.json`, `p75-baseline-proposal.json`, and `p75-human-review-guide.md` in the *offline candidate's review artifact directory*. New Node-native regression tests validate actual bytes, stale/missing/rejected evidence, altered images, and nonapproval even for complete human-looking inputs. Quality, the guest-only Offline Candidate and P67 Visual Candidates are wired to this exact-head check.

### Human intake procedure (never run automatically with real credentials)

1. Complete the **operator-only** Chess OAuth client registration separately, using Account PR [#67](https://github.com/thiepn/account/pull/67) and the reviewed first-party onboarding procedure. On the last read-only connected THIEPN Account inspection the Chess app was **inactive**, registered Chess OAuth client count **0**, connected Chess accounts **0**, Chess state RLS enabled and **3** policies. Never auto-create client identities or activate Chess.
2. Download the **final P75 SHA** successful Visual Candidates artifact. Read its `p73-image-integrity.json` and `p74-release-evidence.json`; confirm the exact candidate SHA, nonapproved status and all image file hashes. Independently open the complete side-by-side comparison HTML and test the actual UI. Use P71's `review-template.json` to record all 18 reviewer decisions. All unreviewed/rejected screenshots block baseline update.
3. Generate `node scripts/p72-device-acceptance.mjs prepare <exact-P75-SHA> p75-human-devices.json` **in a private local workspace**. Execute real Android Chrome, iPhone/iPad Safari, desktop Chromium, TalkBack, VoiceOver, NVDA, real Stockfish games/timers, A→B→guest and revoked-session plus two-device revision conflicts, 200% zoom/reduced motion and independent chess educator review. Record honest PASS/FAIL, device/OS/browser, signed dates and detailed redacted observation evidence.
4. Save each redacted evidence payload privately under `review-evidence/<case-id>.evidence` and set the corresponding `evidenceSha256` to the actual local file SHA-256. **Never commit tokens, OAuth codes, unredacted user data, contact details or raw private account recordings into a public PR or CI artifact.**
5. From the matching code checkout run:

   `node scripts/p75-human-approval-intake.mjs p69c-visual-review <exact-P75-SHA> private/visual-decisions.json private/p75-human-devices.json private/review-evidence`

   The validator refuses stale image pairs, tampered evidence files and invalid human reports. It **does not** validate a reviewer has actual authority, and its success is not release approval. A trusted person must view/redact/check each submission and independently record accept/reject with linked PR evidence.
6. Only after a qualified independent human explicitly authorizes the reviewed P64 visual changes may approved goldens be committed in a **new reviewable commit**. Every new source SHA requires recapturing screenshots and rerunning strict `threshold: 0.2`, `maxDiffPixelRatio: 0.005` screenshot checks. No CI workflow automatically modifies goldens.
7. The production release remains blocked until real OAuth/device/accessibility/educator gates have independent sign-off, all exact final SHA PR checks pass, stacked PRs are explicitly approved and merged in order, all main-push gates pass at one SHA, and an authorized operator sets `CHESS_RELEASE_APPROVED_SHA` only to that main SHA after rollback verification.

## Human acceptance table — all pending

| Gate | Mandatory external evidence | Status |
| --- | --- | --- |
| P64 visuals | All 18 independent image decisions + functional board/zoom/focus review | PENDING |
| Chess OAuth | Manual public PKCE registration, real A/B→guest and revoke/callback replay checks | BLOCKED |
| Cross-device sync | Two independent hardware devices with concurrent revision conflicts and recovery | PENDING |
| Real hardware | Android Chrome, iPhone/iPad Safari, desktop, Stockfish, 10+0 / 15+10 clocks | PENDING |
| Accessibility | TalkBack, VoiceOver, NVDA, 200% zoom, focus and reduced motion | PENDING |
| Pedagogy | Independent chess instructor validates 86 lessons and 49 retrieval-only exercises | PENDING |
| Release authority | Authorized main SHA approval and tested rollback; strict visual gate passes | BLOCKED |

**Next phase:** P76 — Exact-Head Acceptance Closure & Controlled Release Rehearsal. **NOT STARTED**. Inspect actual P75 CI before attempting further release work; resolve any confirmed failures rather than inventing human sign-offs.
