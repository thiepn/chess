# P82 — Chessboard Interaction 3.0

**Draft product phase — not a production release.** P82 starts at verified P81 draft PR #68 head `b9166a44ac01c8b2ba941f72ac456fa161f1ec5f`. P81 Quality, Offline+independent Recovery, Visual Candidate, and Device UX passed exactly at that SHA; strict Visual Regression **FAILED** with 13 unapproved differences. The downloaded P81 visual and offline evidence remains pending human approval. This P82 phase does **not** update those goldens or loosen checks.

## What changed for actual players

1. **Touch/pen gesture on any live chessboard:** Drag a legal side-to-move piece to a destination in Play, a lesson, puzzle or study. Pointer capture keeps the gesture live if the finger leaves the originating button. A 10-pixel threshold preserves ordinary tap-to-select. Multi-touch and wrong-side pieces cannot start moves. On release, the destination must be an actual chess square; off-board gestures are cancelled.
2. **Chess-specific move feedback:** While dragging, the source and legal destinations are highlighted, and hovered legal/illegal drops are distinguished. The same legality-aware target set works for native desktop HTML drag. Ending/cancelling a drag resets indicators; invalid moves still use existing chess.js validation and player-feedback semantics. Drag-generated synthetic click must not select the original piece.
3. **Keyboard stability:** Rotating the board preserves the focused chess *coordinate*, rather than jumping keyboard focus to the newly upper-left square. The existing arrow-key, Enter/Space, Escape, screen-reader labeling and preview disabled semantics remain.
4. **Promotion accessibility:** The four actual underpromotion choices (Q/R/B/N) are an explicitly labeled dialog. Keyboard Tab/Shift+Tab stays within the choice/cancel controls; Escape restores focus to the pawn origin, and successful promotion restores focus to the destination. A failed host decision does not manufacture a move.
5. **Shared presentation:** Dynamic square-local drag/hover styles and touch-action affordances work across Play, puzzles, lessons, and studies without adding to the size-constrained global CSS bundle. No new drag animations are used, respecting reduced-motion preferences and unchanged approved screenshot references.

## Test contract

- `src/interaction/board-pointer.test.ts`: ordinary taps vs 10px drag threshold, NaN/Infinity and invalid destination labels.
- `tests/ux/chess.ux.spec.ts`: actual Play setup → untimed game; synthetic touch/pen Pointer Events across a live board, drag-hover legal/capture feedback, legal e2–e4 with correct final chess piece; keyboard piece selection and arrow-key legal move; static Play preview does not accept moves.
- Existing Play recovery, real Stockfish integration, lesson/puzzle behavior, keyboard-navigation, page performance and Account A/B isolation tests must remain green in unchanged Quality and UX workflows.

## Human-only release boundary

Known 13 unapproved P81 strict screenshot differences and potentially new P82 visual changes require independent approval of exact image hashes before any intentional baseline update. Genuine physical Android/iOS accessibility and pointer-device acceptance, Account OAuth registration, A/B and two-device acceptance, educator review, exact-main push checks, independent operator authorization and rollback remain open. Do **not** merge, deploy, activate Chess OAuth, migrate production, invent physical tests or authorize screenshot goldens.

## Next product phase

**P83 — Stockfish Opponent 2.0**, not started: improve opponent strength tuning, avoid needless engine startup, worker recovery, response times and believable game difficulty; qualify actual full games and time controls without breaking review handoff or recovery.
