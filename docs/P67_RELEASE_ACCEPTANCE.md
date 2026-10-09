# P67 — Release Candidate & Acceptance Record

**Disposition: HOLD.** This PR prepares the candidate but does not authorize merge, tag or deployment.

## Scope and candidate chain

- P61 #46 — THIEPN Account state partitioning, revisions, guest recovery and RLS
- P62 #47 — game recovery, clocks and Stockfish lifecycle
- P63 #48 — promotion-safe grading, lesson evidence and chess-coaching audit
- P64 #49 — visual refinement and redesigned chart empty state
- P65 #50 — cross-account active-game remount, keyboard promotion focus, WebKit recovery regressions
- P66 #51 — lockfile, `npm ci`, deployment checks, no public source maps, RLS optimization
- **P67 #52 — integration repair, split device jobs, reviewed visual candidate capture, manual release gate**

P67 is stacked over P66. The production branch remains at P60 until these PRs are deliberately integrated and all release gates are satisfied.

## Engineering changes

1. **Performance:** Removed redundant SVG-piece outline/drop-shadow styling and unused chart override. Retained the existing **42 KiB per-CSS-file**, **260 KiB initial app**, **260 KiB per-JS**, and **321 KiB aggregate JS+CSS** gzip caps. No threshold increase.
2. **Device CI:** WebKit iPhone tests now run alone on an Ubuntu runner, while five Chromium device profiles run on another. This isolates browser-memory effects **without skipping tests or reducing assertions**.
3. **Visual review:** `P67 Visual Candidates` generates current Playwright screenshots for all pinned desktop/mobile routes, writes filenames+SHA256 hashes, and uploads them as **unapproved review candidates**. Golden references and strict diff thresholds are never rewritten by this workflow.
4. **Deployment authorization:** Pages now requires GitHub repository variable `CHESS_RELEASE_APPROVED_SHA` equal to the **exact, current, verified `main` commit**, in addition to the existing successful Quality, Device UX, Visual Regression checks and THIEPN Account production URL/key check. Empty/mismatched approval means **no deploy**. After a new release, clear the approval variable to avoid reusing authorization.

## Required acceptance matrix

| Gate | Evidence | Release status |
| --- | --- | --- |
| Quality / compile / unit tests / performance | GitHub Quality on same SHA | Pending P67 latest CI result |
| Chromium devices | Independent Device UX job, five projects | Pending |
| Mobile WebKit | Independent Device UX job, full reload/recovery tests | Pending |
| Visual regression | 12 desktop/phone reviewed screenshots, approved baselines, strict rerun | **Blocked until human visual approval** |
| THIEPN Account permissions | RLS, three owner policies, authenticated RPC, no anonymous save | Schema verified |
| Live Chess SSO | Two real accounts (A/B), guest conversion, concurrent device edits, conflict archives, cross-browser session | **Not verified** |
| Full game | Real Stockfish moves, 10+0 and 15+10 background/refresh, timeout, PGN/review/idempotence | **Not fully verified** |
| Training quality | 49 lessons need independently authored transfer tasks or explicit retrieval-only labeling, educator chess audit | **Not complete** |
| Accessibility | Physical Android/iOS/tablet, TalkBack/VoiceOver, 200% text, focus escape/promotion | **Not verified** |
| Deployment security | Same-SHA CI, publishable key/THIEPN Account URL, no secret/source map, explicit approval SHA | Mechanism implemented; values not confirmed |
| Rollback | Known-good P60 SHA, rollback job/procedure and smoke test | Procedure must be rehearsed before release |

## Human visual acceptance instructions

Download the `p67-unapproved-visual-candidates-<run_id>` artifact from the **P67 Visual Candidates** workflow. Compare each to the existing 12 P59 snapshots. Review hierarchy, board contrast, labels, selection state, touch target area, text clipping, chart truth, color-vision contrast and mobile overflow. Record accepted/rejected images with reason. Only after review, commit the accepted binary snapshots using a pinned Playwright environment; do **not** relax `toHaveScreenshot` thresholds to force a pass.

## Auth and account acceptance instructions

With the app using the THIEPN Account project (not merely an empty `.env`), use real account A and account B in separate sessions. Confirm the current identity is resolved before old state renders; a game cannot follow account A to B even on an identical `/play/game/...` route. Save on two devices, intentionally create a revision conflict, choose both resolution paths on different attempts and verify the other revision is archived. Test network interruption, retry and legacy-data quarantine.

## Candidate freeze and deployment sequence

1. Resolve every blocker in the table; repeat all tests on the **same head SHA**, not results from earlier commits.
2. Obtain human approvals for the visual, physical-device and instructional gates; capture artifacts and review decisions in the final release record.
3. Merge the stacked PRs in dependency order only after checks and acceptance.
4. Verify the exact `main` SHA and new three-check **push** evidence.
5. Verify GitHub repository variables `CHESS_SUPABASE_URL`, `CHESS_SUPABASE_PUBLISHABLE_KEY`, and `CHESS_RELEASE_APPROVED_SHA` (the latter set to the exact approved `main` SHA).
6. Publish, smoke-test login/game recovery/review and inspect JS and worker errors; retain P60 as the known-good rollback reference.
7. If smoke fails, block new traffic and perform an authorized rollback to the last verified Pages artifact. Reapprove the exact rollback SHA rather than bypassing safeguards.

**Current action:** Do not merge, tag or publish. A green Quality check alone cannot satisfy release acceptance.
