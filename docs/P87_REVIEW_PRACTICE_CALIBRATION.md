# P87 — Review Practice Reliability & Learning Calibration

Source parent: P86 draft PR #73 at `639708c967338c02fde21ff186ea86e865d9161b`. Stacked directly on P86 (P85 #72 is the unchanged grandparent). No main changes or deployment.

## Learner-visible work
- Review shows an explanatory per-position recommendation and an explicit next-practice date, with history totals excluding invalid/orphaned records.
- The practice runner gives immediate evidence-specific feedback: independent first-try recall versus supported answer versus missed attempt.
- Correctly resumed tab-local attempts keep the source owner's identity, FEN, best UCI and bounded legal tried-move sequence. Old incompatible or altered drafts do not become successes.
- Forty legal tries is a hard cap. Revealing is a failed attempt. Completing twice cannot issue a second callback.
- Calibration is deliberately simple and explainable, not a statistical performance claim: failure 6 h; helped or previously wrong but solved 12 h; consecutive clean unaided recall 1/3/7/14/30 d (capped). Two consecutive clean recalls set resolved; any supported or missed attempt breaks that streak.

## Source authority & correctness
- The engine-best move is validated against saved gameId, ply, original SAN/UCI and exact FEN.
- Actual attempted UCI moves are independently checked for legality against the original position, promotion suffix, ordering, success at final move, exact wrong-attempt count and hint count.
- Caller-submitted quality is only range-checked; quality is recalculated from the actual move sequence: 100% less 20 percentage points per hint and 12 per earlier wrong move (minimum 20% on eventual success), zero on failure.
- Recording is bounded to 200 attempts and includes source FEN/best move for newer records. Historical inputs are sorted by timestamp; future/foreign, illegal and structurally inconsistent records cannot affect the Review queue.
- App completion rejects unverified source data before mastery/analytics/events, rechecks before persistence and does not let a late old-owner callback complete a new owner's training.

## Confidence boundary
This is a deterministic learning heuristic, not empirically validated spaced-repetition calibration or proof of practical playing strength. A legally verified local event is not proof a human moved unaided; no fabricated certifications.

## Checks and release HOLD
Regression tests: canonical quality, forged success, inconsistent wrong counts, illegal moves, source changes, future history, review scheduling and assisted reset. Existing P86 browser journeys cover actual reload, wrong then correct move, reveal and Review navigation. CI results must be checked at this branch's final exact head.

Do not alter the original 18 human visual decisions or the 13 currently unapproved screenshot diffs. All 14 physical device, first-party Account, screen-reader and educator acceptance cases remain open. No golden changes, OAuth activation, production migration, deployment or merge.

## P88 — Curriculum Transfer Exercise Completion (NOT STARTED)
Complete independent transfer problems for uncovered skills using real authored legal positions, followed by source-grounded hints and delayed checks.
