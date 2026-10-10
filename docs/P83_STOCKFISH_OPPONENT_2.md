# P83 — Stockfish Opponent 2.0 (Product-First Chess V1.0)

**Stacked draft, not a live release.** Base P82 PR #69 at exact `c5b13dd77ba95752cf52027864e1d49acc885998`; P82 five exact-head workflow runs fully inspected: Quality and offline recovery PASS, 308 tests, 110 Chromium and 22 WebKit passes, visual candidates PASS, strict screenshot check FAIL **13 changed images**, all human decisions pending.

## Player-visible changes

1. **Honest opponent readiness** — GameArena now only calls an opponent ready once UCI `uciok` **and** `readyok` have both arrived. A newly constructed worker is not a ready engine. Timed clocks do not run during initial local Stockfish startup/reconnection.
2. **Predictable response pacing, real chess legality** — Each existing profile retains its tested Skill Level/depth; opponent moves additionally have a UCI `movetime` budget: Gentle ~300ms, Developing ~500ms, Club ~850ms, Strong ~1400ms, Adaptive selects among these based on mastery. With 10+0 and 15+10 the budget adjusts downward to the **opponent's actual remaining clock**; this limits avoidable clock loss. These are *search ceilings, not guaranteed wall response times, human styles or ratings*. UI explains this and avoids fictitious Elo precision.
3. **Crash and timeout recovery** — UCI worker errors/timeout reject the exact pending request, **terminate** the unusable worker and never permit stale `bestmove` to poison a new search. GameArena attempts one clean engine-worker restart, retaining chess position, legal PGN and running clock state. A second failure stops cleanly with a real Retry opponent action. Missing assets remain a visible manual-retry error, not a fabricated success.
4. **Safe game completion** — On real checkmate, timeout or resignation, the pending engine is immediately cancelled; a late move cannot modify the finished position. A non-terminal `bestmove (none)` is treated as recoverable engine failure rather than silently freezing the game. Finished PGN and stored-game Review handoff remain controlled by prior state and source ownership.
5. **Restarts preserve isolation** — New chess opponent workers remain browser-only. No requests are made to THIEPN Account, Cloudflare production or Supabase. Existing account A/B and guest-only privacy guards stay intact.

## Actual acceptance evidence

- `src/engine/stockfish.test.ts`: delayed UCI readiness handshake; finite bounded skill/depth/movetime; legal `bestmove` handling; crash, cancellation, timeout and missing-asset failures. Real wrapper, synthetic Worker.
- `src/play/opponentSearch.test.ts`: calibrated time caps at every profile and real 10+0/15+10 low-clock boundaries, nonfinite handling.
- `tests/ux/chess.ux.spec.ts`: synthetic browser Worker driving **real PlayView / GameArena / ChessBoard** through a complete timed checkmate and persisted PGN → Review navigation, plus a transient worker crash after the user's timed move, automatic worker restart and move/clock preservation. Browser-backed but explicitly not physical hardware or independent real-engine strength validation.
- Existing 308+ unit tests, all browser routes, offline packaging, strict visuals and P80 release HOLD unchanged.

## Human acceptance and P84

The preexisting unapproved **13 screenshot differences**, 18 visual decisions, 14 device/Account/a11y/educator cases, first-party Chess OAuth, independent real physical-device playback, human game/strength review, exact-main production rollback and explicit operator release signoff remain outstanding. No screenshot golden/tolerance update, migration, merge, deploy or authorization is performed.

**P84 — Complete Game Experience. Status: NOT STARTED.** Next: intuitive 10+0 and 15+10 clocks, draw/resign and terminal-state handling, saved unfinished game recovery, visibility/backgrounding and reliable Review navigation across complete games. Continue real product implementation, not release-evidence-only work.
