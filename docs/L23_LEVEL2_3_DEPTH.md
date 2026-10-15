# L23 — Original Levels 2–3 deep practice and historic study discovery

## Parent and ownership
- Direct parent: draft PR #118 G1C exact `4abcb2f62df99fc5d6b068b2a6ee2dc3bcdc4ae2`; its G1B parent is `bc9b503bdc2406b9d5de1fd15cc60fb075ff4f16`.
- No main merge, production deployment, migration, independent grading engine, Account writer, credential or historical source-ID change.

## Implemented learner functionality
- All eight Stage 2 and eleven Stage 3 skills receive six additional case-based interactions in the ORIGINAL LessonRunner, appended after the existing P88/built-in transfer: four source-relative independent retrievals and two new unfamiliar-board transfers per skill, **114 positions per complete eligible course pass**.
- Stage 2 uses ten curated original repertoire node candidates per skill and selects six distinct original parent-board contexts, replays each move and compares the resulting exact original node FEN. Source-specific prose derives from the original node's distinct purpose, next plan and known misconception, with per-skill authored goals, misconception distinctions and hints. Source moves are curricular examples, not unique-best claims; opponents in the original repertoire form distinct opening structures.
- Stage 3 chooses six distinct genuine Lichess CC0 source puzzles per skill, at distributed rating targets. It legally replays the source trigger, learner tactic, concrete defender reply and optional next move using Chess.js. The learner sees only the post-trigger board, not the answer; success feedback reveals actual SAN continuation and resistance. Only skill-mapped Lichess records are eligible. Missing manifest/fallback seed data, invalid lines, repeated positions or incomplete catalog **fail closed before mastery**.
- All existing lesson steps and their identities are preserved. The two additional last-stage transfer checks must be FIRST-TRY/UNHINTED for native `summarizeLessonMastery` to report independent mastery. The existing `applyEvidence`, Review scheduler and Account-scoped writer are unchanged; this does **not** certify delayed retention or human-game transfer.
- Legal but non-source choices receive explicitly non-engine-unique misconception guidance; the app does not mislabel such legal moves as always objectively losing.

## Historical P103–P106 correction
- Actual P103–P106 records were created as historically scored source cases, with `assessmentStatus` undefined. G0 discovery code incorrectly required all families to be unscored; its tests incorrectly expected those records to be unscored.
- `sourceStudyKind` now separately admits only the original authored scored P103–P106 family and retains the existing unscored gate for P109–P112. `alignSourceStudySkills` leaves *all scored positions unchanged* (identities, answer lines, skill IDs and grading); existing unscored subject-specific links continue unchanged.
- The native study chooser labels the original scored family correctly and launches the same existing CalculationRunner and original score authority, while P109–P112 keep unscored completion.
- Historical learner progress, no score migration, no regrading. Existing model answer lines should still receive human chess-teacher review.

## Evidence and blockers
- Source-tree and exact parent read-only checks are available. Added focused Vitest suites for all eight Stage 2 sets, fail-closed Stage 3 cases, historical scored/unscored separation and mastery-independent transfer; **tests are authored, NOT_EXECUTED** without exact runnable checkout.
- The whole 11,000-row Lichess source is filtered and generated during the existing `puzzles:ensure` build step. The source-built manifest and actual six usable records for every tactical skill MUST pass exact-head runtime before release. No invented puzzle source counts.
- Chromium desktop/mobile, real Chess.js/Vitest, TypeScript/Vite, 260/321 KiB gzip budgets, delayed review and physical-device acceptance are NOT_TESTED. G1C release HOLD remains.
