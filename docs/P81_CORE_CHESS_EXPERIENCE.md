# P81 — Core Chess Experience

**Product phase, not a release-evidence phase.** Stacked on P80 draft PR #67 exact head `30ad943661a8fad297da14e2dddcee1fc519fb1e`. This phase preserves the established chess curriculum, local-first game recovery, Stockfish, Account isolation, snapshot goldens and human-operated release controls.

## Before and after

### First-time Review was a dead end
Before: a new player with zero imported/completed games saw an empty Games list and a PGN import form, but no direct invitation to play a game or train.

After: **Learn from your own moves** offers direct **Play a game** and **Start training** actions. A saved but unanalyzed game instead offers **Review saved game** and **Play another game**. Both routes use existing app navigation, no fake demo records or account state.

### Saved-game engine failure was invisible
Before: a selected saved game with no structured review ran `reanalyzeStoredGame` and set `error` on failure, but rendered its error only on the Review index—**not** on the selected game's upgrade screen. A player had no explanation why Analyze did nothing.

After: the saved-game screen exposes the actual failure in a live `role=alert`, promises only what is true (the original imported game remains saved), and leaves **Analyze game** available to retry. Reload does not discard the game or a recovery document.

### A finished review lacked a clear next step
Before: the Review workstation exposed many specialist actions inside moment dialogs but no reliable, prominent choice when someone had finished understanding the game.

After: the workstation's existing insight column ends with **Your next move**. When the reviewed story contains a valid prioritized skill, **Practice this weakness** opens the real focused training runner, which preserves its exact Review return route. Otherwise **Continue training** opens the main Train route. **Play another game** opens the real Play setup. These actions do not invent mistake records or promise improvement from unsupported data.

## Product evidence

- Chromium/WebKit actual-browser interaction tests in `tests/ux/chess.ux.spec.ts`: isolated fresh-user Review → Play/Train; analyzed review → recommended skill or Train → Play; saved un-analyzed game with a deliberately failed Stockfish asset request → visible error, retry and preserved reload state.
- Existing unit suite and browser journeys continue to protect legality, clocks, move history, offline recovery, course navigation and Account isolation.
- No visual baseline was automatically changed. New review UI may require explicit human approval of screenshot diffs; unchanged Playwright comparison thresholds remain enforced.

## Completion / release boundary

P81's product source changes are ready for exact-head CI, not evidence of external human visual approval. The known 12 unapproved P64 screenshots remain an outstanding release blocker until separately reviewed. No THIEPN Account production data, client registry, authorization or deployment is touched.

**Next phase P82 — Chessboard Interaction 3.0:** Improve piece selection, drag/touch feedback, legal/capture/last-move states, promotion, keyboard/focus, mobile orientation, and their end-to-end cross-device interaction tests; preserve existing accessible chess semantics.
