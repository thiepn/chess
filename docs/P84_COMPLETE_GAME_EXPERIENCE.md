# P84 — Complete Game Experience (Chess V1.0, product-first)

## Source and status

Stacked draft from P83 PR #70; inherited P83 UCI, worker restart, legal move and timed-game improvements. P83 exact original head `f8a118e7a2832c4166c1d2a6fdf9f6da65fb1e3e` failed TypeScript because `StockfishBrowserEngine.name` was accidentally removed. Restored engine identity in P83 commit `cebb0cea608af5427187390113fee2dc6d5923c3`; the replacement build succeeded, but P83 Quality and Offline exposed a strict **321 KiB total JS+CSS gzip performance budget overrun** (321.0–321.1 KiB). Keep budget unchanged and block acceptance until qualified. Original screenshot golden revisions remain unapproved.

## Real player workflow

- The default game topbar action is now **Save & exit** while playing. It atomically saves the current legal move sequence and remaining clocks to the **current storage owner** before returning to Play. A failed browser storage write leaves the player in the current game with an alert; it does not falsely report saved progress.
- **Resume saved game** returns to the same color, opponent, time control and move history. An explicitly suspended checkpoint freezes the clocks while away and resets only the wall-time reference on resume. Running sessions without intentional save continue using actual elapsed time during backgrounding/reload; the user cannot make a late move after the clock reaches zero.
- **Discard game** is a separate deliberate action with confirmation; even saved games with zero moves are protected against an accidental new game start. Exit after game completion keeps the previous Review behavior.
- Show concrete end reasons (checkmate, stalemate, fifty-move rule, threefold repetition, material, time or resignation) instead of an unexplained generic outcome. The existing move sheet, PGN and saved-game Review handoff remain authoritative.
- Existing legal chess.js automatic draw adjudication remains in place. No simulated AI consent to a user draw offer is claimed.

## Tests and qualification

- Game recovery Vitest: explicit suspension, clock isolation, ongoing elapsed time, forged pause flags, incompatible terminal/paused states.
- Browser Playwright: timed game with deterministic synthetic UCI Worker, two-ply move sheet, deliberate saved pause, simulated one-hour absence, resumed clock integrity, intentional discard confirmation.
- Exact-head Quality, Offline + independent artifact recovery, Visual Candidates and device Chromium/WebKit must pass; strict Visual Regression is expected to fail pending independent approval of unchanged reference goldens.
- Manual review: real Stockfish assets, physical Android Chrome/Samsung Internet, iOS/WebKit and screen reader/a11y checks remain OPEN.

## Hard boundaries

No merge, deployment, production OAuth activation, account migrations, private cross-user game data access, synthetic human/device claims, screenshot golden updates or threshold weakening. P80 strict human release HOLD is not bypassed.

## P85 — Game Review 2.0

**NOT STARTED.** Product-first next steps: readable per-move engine explanations, game turning points, compact best-move variations, practical training handoff, retryable failure states, and accessible mobile review of actual legally saved games. It must not fabricate Stockfish evaluations.
