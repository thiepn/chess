# P89 — Puzzle Learning Quality (source-only stacked draft)

Parent: P88 draft #75 exact `70a6395cc9baee2f850390fe1e8b6a0c7355a621` (P87 #74, P86 #73 kept unchanged).

## Genuine learner-facing changes
1. Expose the native lesson and puzzle start controls at all responsive viewports. This repairs the P88 browser failures: the only action had been nested inside a sidebar deliberately hidden at portrait and compact landscape sizes. Existing accessibility controls and screenshot baselines remain intact.
2. Preserve all 32 previously-authored puzzle motif explanations in `public/data/puzzles/motif-coaching-v1.json`, lazily loaded at training time. No missing instructional text is discarded; a clear general fallback remains when offline assets are unavailable.
3. Puzzle attempts distinguish **clean first try**, **assisted solution**, and **revealed/missed attempt**. A revealed solution records a failure, never success or independent mastery, and returns in six hours. An assisted answer returns in twelve hours. Consecutive clean attempts after due time schedule 1, 3, 7, 14, 30 days; immediate repeats do not manufacture spaced retention.
4. Derive local session quality from hints and actual wrong move count, plus save `lastIndependent`, `cleanStreak`, `nextReviewAt`, `lastWrongMove`. Maintain existing owner-scoped `puzzleHistory` as the sole authority; no second results engine. No ELO or human-game transfer claims.
5. Adaptive target puzzle rating uses the last four actual practice summaries of relevant candidate puzzles, bounded to +/-140 points within the established 650–2200 range. Due status, clean streak and missed attempts affect selection; outdated records retain legacy cooling rules.
6. The entire stored solution is reconstructed in chess.js before showing a playable puzzle, preventing invalid SAN/ply sequences from receiving credit. Recorded opponent replies are displayed with their legal SAN; optional post-solve Stockfish checks verify up to two opponent replies at depth 10, explicitly reporting mismatches and unknown uniqueness.
7. Incorrect legal moves receive alternative-vs-reference feedback tied to the authored theme explanation; the interface does not claim every rejected move is objectively a chess mistake. First hint provides the principle, second reveals the recorded move origin and destination.
8. After a puzzle, the learner can open a **real original saved-game review** when the active skill matches an independently source-validated personal mistake. This is a read-only navigation bridge, not automatic human-game transfer credit.
9. Unit tests cover illegal/corrupt stored lines, independent/assisted/failure custody, spaced intervals, early replay, actual-evidence rating calibration and selection. Browser test checks actual mobile/desktop recording of a revealed missed tactical attempt.

## Inherited P88 qualification
- Quality #38307005291: 336/336 tests, build and audits PASS, but total app gzip **322.3 KiB > 321 KiB budget**. The JS cap is unchanged; P89 externalizes original motif explanations and optimizes learning logic, then must recheck exact head.
- Device UX #38307005258: FAIL on two P88 learner journeys across Chromium/WebKit; the Begin Lesson action was inside a sidebar hidden by existing mobile CSS. Fixed by making lesson and puzzle practice available beside the board at all sizes.
- Strict Visual #38307005252: 13 inherited screenshot mismatches FAIL, 5 PASS. No golden changes and no claimed approval.
- P88/P87 human acceptance remains **18 original visual decisions plus 14 physical, Account, accessibility and educator cases PENDING**.
- P89 check status must be established using final exact-head CI; no PASS derived from superseded runs. Offline candidate workflow skips are not PASS.

## Known boundaries / next
Skill-based puzzle difficulty is a bounded heuristic, not an independent skill rating. Saved puzzle lines reflect original seed/Lichess source, not proof of a unique engine best move. Engine verification is optional and bounded; no uncontrolled paid APIs.
No merge, deployment, OAuth activation, credential access, production migration, real academic/game record access, independent human qualification or new screenshot goldens.

**P90 — Calculation & Endgame Mastery (NOT STARTED):** source-validated multi-ply calculation branches, quiet-move accuracy, practical endings, stronger assessment explanation and due transfer checks using existing calculation/endgame modules.
