# P114 — Comparative Strategic Transfer

## Exact stack
- Parent: P113 [draft PR #101](https://github.com/thiepn/chess/pull/101), branch `p113-strategic-master-game-decisions`, SHA `d3b6c9ebb33ed5a3b4ce8368626f4b0c6ae85411`.
- P114: `p114-cross-game-strategic-transfer`. No merge, deployment or migration.

## Product
Within the original Course → Model Games → Complete Game Lab, learners can switch to **P114 · Compare strategic decisions**. This is a lazy-loaded comparative workshop built on the same eight historical PGN records and on the existing `ChessBoard` and Chess.js authority, not a second game engine.

P114 introduces **12 original two-position strategic comparisons** (24 anchored encounters at P113 historical checkpoints) covering pawn-break timing, king safety, bishop and knight routing, exchanges, rook activity, pawn tensions, queen repositioning, counterplay and forcing variations.

Every pair has:
1. Two simultaneous historical boards stopped **before** the recorded move, without revealing SAN in the question view.
2. Explicit source-qualified original compare and defender-resistance prompts, two written responses required before reveal and two progressively useful hints.
3. The actual two three-ply historical continuations and a new authored contrast explanation, plus misconception-specific correction.
4. An independent third written transfer prompt and optional self-rating (understood / needs another attempt) without an automated grade or mastery award.
5. After reveal, direct **Open complete game** handoffs into P113's original historical game/decision workspace, including Chess.js legal branch exploration and source navigation.
6. Owner-scoped, 24-hour session-only writing recovery by **reusing** `masterDraftKey` and `restoreMasterDrafts` from P113. No additional scheduler, database, account store, rating or completion writer.

### Canonical source checks
The asset `public/data/model-games/p114-transfer-cases-v1.json` references exact P113 game and checkpoint IDs, exact decision ply, recorded move, defender reply, and next move. `hydrateTransferCases` strictly compares each record against P113's legally replayed PGN, rejecting stale source IDs, mismatched continuations, duplicate pairs, incomplete original text and missing source games. These are source-authored **instructional interpretations**, not engine-verified unique best moves, certified tactics, objective outcome claims, tablebase results, or externally graded essays.

### Source rights
The factual historical scores derive from the P113 [public PGN collection](https://github.com/mcostalba/chess_db/blob/master/pgn/great_masters.pgn). No third-party annotations or prose are copied. All P114 comparisons, prompts, repairs and transfer questions are original.

### Inherited P113 compilation repair
The existing P113 automatic Quality run failed at TypeScript compilation because `src/model-games/masterGames.test.ts` imports `node:fs` without the Node type declarations in `tsconfig.app.json`. P114 fixes **only the test fixture import** to use the existing `resolveJsonModule` option and bundled fixture JSON. No new dependency or tsconfig modification. Existing automatic Visual/Device workflows also failed at this inherited build step.

### Scope and status
No manual tests, broad audits, CI reruns, deployments or changes to production; focused P114 source validation tests are authored but **NOT_TESTED** until exact-head automatic results are available. The inherited 260 KiB initial and 321 KiB all-app gzip ceilings remain unchanged; no unverified size compliance claim is made. Human/device acceptance is **NOT_TESTED**.

## Files
- New: `public/data/model-games/p114-transfer-cases-v1.json`
- New: `src/model-games/crossGameTransfer.ts`
- New: `src/model-games/crossGameTransfer.test.ts`
- New: `src/components/CrossGameTransferLab.tsx`
- New: `src/styles/p114-cross-game-transfer.css`
- Changed: `src/components/MasterGameLibrary.tsx` (native handoff)
- Changed: `src/model-games/masterGames.test.ts` (inherited TypeScript repair)
- New: `docs/P114_CROSS_GAME_TRANSFER.md`
