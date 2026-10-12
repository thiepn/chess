# P91 — Strategic Game-to-Training Transfer & Verified Readiness

## Stacking and original authority
Separate draft from P90 #77 exact source head `7a114650a6ed37291bb453877cb2c6f4aca721c2`; P89 #76, P88 #75, P87 #74, P86 #73, main and deployed app preserved. Never replace the authoritative game importer, analysis, `recordReviewAttempt` writer, user repository or mastery engines.

## Implemented product features
- `review/gameTransfer.ts` derives real game-derived study missions from the current owner's existing saved games, analyzed mistakes, source FEN, original player move and legally replayed engine PV. Checks duplicate IDs, matching game/ply, stored move identity, legal chess move sequences, and stale/future attempt evidence. Foreign/unqualified input yields no mission.
- Relevant strategy, calculation, tactics and endgame mission lanes; the learner receives a question and can jump to a real pre-existing source-bound personal-mistake exercise, original saved-game review or relevant course skill. The engine's reference choice stays **hidden before the attempt** to protect independent performance.
- An evidence-calibrated Review dashboard counts unique qualified positions/games, clean unaided successes, assisted solutions, misses, due tasks and positions with at least two clean attempts **24 hours apart**. Repeated clicks in a sitting are not certified as delayed recall. Does **not** assert player rating, puzzle engine superiority, qualification, game skill mastery or human approval.
- Post-attempt strategic misconception guidance and the legally replayed opponent response are shown inside the existing `PersonalMistakeRunner`. Original per-owner tab continuity and write validation remain untouched.
- Demonstrated P90 browser regression: the original hardest-first ordering selected an older rook drill rather than the new lower-difficulty P90 position, invalidating the exact test's expected title. New unattempted endgames use a beginner-first order, with existing due, difficulty, verified performance and retained source identity otherwise preserved.
- Complete original teaching prose for all **18** already-authored endgame positions is moved to `public/data/endgames/guidance-v1.json`. The original options, every explanation, cues and result notes are unchanged. `EndgameTechniqueRunner` loads and qualifies the asset before allowing an attempt; if unavailable, refuses credit with a retry UI, never renders empty guidance. This is a bundle/packaging optimization, NOT a content deletion.
- Synthetic source and delayed evidence tests; browser tests for real game review mission and source-authored technique availability.

## P90 exact-head baseline
- Quality `38314987482`: **346/346 Vitest PASS, build/audits PASS, budget FAIL** (325.7 KiB gzip / unchanged 321 KiB cap).
- Device `38314987207`: WebKit **FAIL** 1/34 (the P90 endgame title/selection expectation); P88 and P89 previously failing WebKit journeys PASS. Chromium remained in progress at first inspection; do not infer PASS.
- Strict Visual `38314987575`: **FAIL**, screenshots still need independent human decisions; original 18 visual and 14 real device/Account/a11y/educator cases PENDING.
- P91 requires its own exact-head Quality/Chromium/WebKit/Visual results. No tests, thresholds, screenshots or signoffs weakened.

## Release and future scope
Do not deploy, merge, migrate, activate OAuth, change credentials, personal records or screenshot goldens. If total bundle remains >321 KiB, keep **FAIL**. Never claim P91 qualifies released app without independent original visual and human/device acceptance.

**P92 — Personal Chess Coaching & Source-Verified Study Plans (NOT STARTED):** honest goal-linked missions and longer-horizon training from reviewed games, improving supervised insight, bounded practice progression and reliable cross-device continuity without duplicating the existing training planner.
