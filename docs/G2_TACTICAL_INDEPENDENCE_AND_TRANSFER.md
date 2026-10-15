# THIEPN Chess G2 — Original Tactical Transfer and Opponent-Response Depth

## Immutable development ancestry and boundaries
- Stacked directly on G1C draft PR #118, `g1c-beginner-executable-qualification-repairs`, exact verified parent `4abcb2f62df99fc5d6b068b2a6ee2dc3bcdc4ae2`.
- Separate G2 development branch `g2-original-tactical-independent-transfer`; no changes to main, production, migrations, account credentials or earlier PRs.
- Preserved original 86 skills, all P116 learner lesson identities, P88 historical 49 transfer records, G0–G1C source assets, source rights, original Chess.js legal authority, Account privacy, and original Review/mastery writers.
- Not an engine-best-move, tablebase-verified or historical-game-based set. All G2 positions are original instructional tactical positions and the two listed opponent replies in each case are conditional *legal variations*, not predictions that Black must choose them.

## Real G2 product improvements
- `public/data/learning/g2-tactical-transfer-v1.json`: **18 new authored FEN positions**, exactly **3 per each of six historical P88 tactical skills**: `tactics.skewer`, `tactics.removing-defender`, `tactics.deflection`, `tactics.decoy`, `tactics.overload`, `tactics.clearance`.
- Every case contains a concrete independent task and known legal model answer, detailed original explanation, motif-specific misconception repair, three graduated hints, and **one position-specific, legal but off-task or unsafe move with its own detailed feedback** (18 examples).
- Every case also includes **two distinct black defensive responses** with position-specific descriptions (36 total). These are separately displayed as actual resulting board positions, never fabricated variations or claimed engine outputs.
- `src/learning/g2TacticalTransfer.ts` validates exact source identity, all 6 × 3 slots, distinct board IDs/FENs, concrete legal main moves, legal wrong alternatives, independent legal Black replies and actual king-checking conditions for skewer/clearance. It refuses incomplete or tampered source before an original learner can play/earn credit.
- Original `LessonRunner` lazy-fetches the new authored tactical asset *only for the six designated skills*, after the original P88 transfer. No second lesson route, practice engine, grader, database or private state. For each position, one existing `move` lesson step requires the learner to play the first move independently (native `support:"transfer"`); the two response illustrations use existing unscored `explain` steps and on-board **Chess.js-produced** FENs after Black's real reply. The same native hints, legal move feedback, quality, and delayed Review semantics remain authoritative.
- Original P88 primary positions are unchanged. G2 adds three separate independently scored transfer checks without silently reusing the original model/transfer boards.
- `src/puzzles/theme-map.json` repairs one identified overgeneralization: a generic `deflection` tag is no longer treated as proof of `tactics.overload`. Explicit `overloadedPiece` still tags overload, and the corresponding focused mapping test asserts this invariant.
- `src/learning/g2TacticalTransfer.test.ts` contains focused original Chess.js/Vitest regression cases for 18 new main moves, 36 actual legal black replies, 18 legal wrong alternatives, exact resulting board FENs, old P88 step preservation, unchanged native mastery conditions and fail-closed source tampering.

## Evidence, without invented runtime qualification
- **PASS — connected-GitHub source/ancestry inspection:** exact PR #118 parent, previous source structures, unique new asset with 18 cases and 36 distinct responses. Six P88 primary skills have no preexisting second challenge; P116 source and P88 49 records left byte-for-byte intact.
- **PASS — independently implemented (non-Chess.js) geometry and king-safety checker:** 18/18 new White main UCI moves, 18/18 legal alternative White UCI moves, 36/36 separate legal Black replies, and all 6 skewer/clearance boards deliver the expected check; zero source-move failures. This tool is *not* the original `chess.js` implementation and cannot be treated as runtime PASS.
- **PASS — read-only source overlap comparison:** none of the 18 new FENs matches the 86 original P116 seeds, 37 P116 transfer seeds, or 49 P88 transfers and optional G0 second challenges.
- **NOT_TESTED:** New `g2TacticalTransfer.test.ts`, earlier G0/G1/G1B/G1C tests, actual chess.js source execution, TypeScript, full Vite build, the **unaltered 260 KiB initial / 321 KiB total** gzip thresholds, Chromium desktop/mobile, keyboard/assistive tech, real gameplay completion, scheduled later Review and ownership switching. Container cannot access an authenticated complete repository checkout and npm dependencies; GitHub connector can inspect and commit individual source files but cannot substitute a full checkout.
- No broad CI triggered; no merges, deployments or production writes. Release and performance qualification remain explicitly **HOLD**.

## Next focused qualification and content priorities
1. Acquire exact G2 head executable checkout and dependencies; run targeted Chess.js/Vitest source and original mastery/transfer/Review checks, plus TypeScript, Vite and unchanged gzip budgets.
2. Run genuine desktop/mobile Chromium sessions for all six skills, including wrong legal alternatives, hint use, conditional reply boards, owner/activity interruption and delayed Review. Repair only demonstrated failures before release approval.
3. Only after product correctness, deepen original P116-only tactical skills or introduce more varied opponent resistance through the same native LessonRunner/PuzzleRunner/Review components. Do not create a parallel tactical engine.
