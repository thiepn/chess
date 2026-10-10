# P86 — Personalized Review-to-Training Loop

Stacked on P85 draft #72 head 285d56b295c201e7f711d94fe5d753221dd73159. Source-only; no deploy or merge.

## Player functionality

- Review prioritizes **source-verified** saved game mistakes by true due dates, severity and actual failed attempts, excluding orphaned, edited and illegal move records.
- Practice next priority uses the existing accessible ChessBoard and manual training runtime. Play a real legal move in the saved position. Record actual incorrect moves and hint use without false success.
- An explicit reveal action submits a **failed** attempt, not a completed lesson. After solving/revealing, reconstruct verified legal Stockfish principal variation moves step-by-step without inventing replies.
- Bounded, owner-associated per-attempt records in Chess UserState contain source game ID, ply, attempted moves, success, quality, hint use, wrong attempts and timestamp; progress derives from actual completion.
- Owner-tagged training runtime snapshot and session draft require the same owner, mistake ID, original FEN and best move before recovery. Session draft is not claimed to be cloud-synced before submission. A failure does not extend the review interval.
- Existing coach, practice, training skill history and Account scoped persistence continue to be used.

## Qualification

Adversarial source-verification and spoofed success unit tests; real Chromium/WebKit browser review-to-practice path with wrong move, reload, correct move, real tactical variation, bounded attempt record and return to Review; separate assisted reveal as failure. Existing 321 KiB total JS/CSS gzip budget, visual baselines and security gates remain strict.

## Explicit release HOLD

18 human visual decisions, 14 physical/Account/a11y/educator acceptance cases and 13 original strict screenshot mismatches remain OPEN. Synthetic browser tests are not real Android, iOS, TalkBack or VoiceOver attestations. No merge, public release, migration, production OAuth change or deployment.

## P87 — Review Practice Reliability & Learning Calibration (NOT STARTED)

Independently review per-attempt quality scoring, adaptive due-date calibration, owner-switch/session revocation and real-device evidence preparation while retaining release HOLD.
