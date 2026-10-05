# Chess

A personal, adaptive chess-learning app for the thiepn ecosystem.

## Product contract

Chess is not a general chess portal. It is a personal coach that decides what deserves training time based on curriculum readiness, retention, weaknesses, and real-game evidence.

Core loop:

```
Learn → Practice → Play → Review → Diagnose → Retrain → Retain
```

The default experience should answer one question: **what should I train now?**

## Implemented foundation

- P0 product architecture and five-area information model
- P1 typed curriculum graph, multidimensional mastery, evidence weighting, retention and weakness scoring
- P2 adaptive 10/25/60-minute Training Composer with diversity, novelty and fatigue constraints
- P3 reusable interactive lesson scripting model, chessboard teaching engine, guided moves, hints, overlays, rewind/retry feedback, and curriculum browser
- P4 streaming Lichess puzzle ingestion, curriculum-theme normalization, quality/rating filtering, sharded corpus loading, adaptive puzzle selection, multi-ply practice, and durable puzzle history
- P5 PGN/Lichess game import, client-side Stockfish 19 analysis, critical-moment filtering, curriculum-linked error classification, personal mistake bank, real-game evidence, and spaced mistake repair
- P6 compact concept-first opening repertoire, visual repertoire explorer, spaced branch recall, real-game deviation detection, and adaptive opening review
- P7 full Play system with configurable/adaptive Stockfish opponents, complete legal games, opening/endgame/conversion/defense training scenarios, automatic PGN capture, transfer evidence, and automatic handoff into P5 Review
- P8 post-game storytelling with phase summaries, a complete move timeline, 3–5 high-signal moments, animated actual-vs-better move playback, curriculum links, legacy-review upgrades, and direct Repair/Replay actions
- P9 full Library workspace with free FEN/PGN analysis, on-demand Stockfish, branching move navigation, saved studies, notes/tags/favorites, reference positions/master-game exploration, game-history access, and optional promotion of saved positions into adaptive spaced training
- P10 shared premium interaction system with real board glides/castling motion, check emphasis, motion tokens, optional Web Audio and haptics, milestone-based celebrations, synced experience preferences, improved loading/error resilience, accessibility states, safe-area handling, and mobile/landscape polish
- Local-first durable state
- Optional Supabase persistence using the shared authenticated user
- Responsive Home and session runtime shell
- Reduced-motion and keyboard-friendly interaction defaults

The curriculum is intentionally a representative seed graph rather than the final 200–300 atomic-skill catalog. P3 provides polished authored lessons; P4 supplies scalable practice behind those concepts; P5 converts real games into evidence and future training; P6 adds a deliberately small opening repertoire; P7 makes Play itself part of the learning system; P8 turns engine output into a visual game story instead of an evaluation dump; P9 provides a serious free-study workspace without forcing every exploratory position into the guided learning loop; P10 standardizes how the entire product moves, responds and feels across desktop and mobile.

## Run

```bash
npm install
npm run dev
npm test
npm run build
```

## Lichess puzzle corpus

The app uses Lichess's open puzzle export as an optional large practice source. The ingestion pipeline expects the published CSV schema and normalizes Lichess's puzzle convention automatically: the source FEN is before the opponent move, so the builder applies the first UCI move and stores the remaining solution from the learner's turn.

A small built-in seed corpus keeps development and offline fallback functional without a large download.

Generate the production corpus from a decompressed CSV:

```bash
npm run puzzles:build -- lichess_db_puzzle.csv
```

Or stream decompression without creating the full CSV:

```bash
zstdcat lichess_db_puzzle.csv.zst | npm run puzzles:build -- -
```

Useful options:

```bash
--out public/data/puzzles
--max-per-skill 5000
--min-popularity 75
--min-plays 50
--min-rating 600
--max-rating 2400
--max-rd 140
--include-very-long
```

The builder:

1. streams the source instead of loading millions of rows into memory;
2. validates FEN and every UCI move with chess.js;
3. maps Lichess themes to canonical curriculum skills;
4. detects knight-specific forks from the solving piece;
5. filters low-confidence, unpopular, and excessively noisy positions;
6. preserves rating diversity with rating buckets;
7. emits one compact JSON shard per skill plus a manifest.

At runtime the browser downloads only the shard needed for the current skill. Puzzle selection scores rating fit, popularity, play count, exact curriculum match, and personal attempt history. Puzzles attempted recently are heavily penalized; older failed puzzles can return after spacing.

Lichess puzzle exports are CC0. Source provenance and license metadata are preserved in the generated manifest.

## Personal game analysis

Review accepts pasted PGN, uploaded `.pgn` files, or a public Lichess game URL/ID. The app analyzes only the selected player's moves.

Stockfish 19 lite single-threaded is installed as a browser worker during `npm install`. Its JS/WASM files, GPL-3.0 license text, exact package version, and corresponding-source link are emitted into `public/engine`.

Game analysis is deliberately selective:

- engine differences below the learning threshold are ignored;
- low-value inaccuracies in already-lost positions are suppressed;
- at most eight high-impact moments are promoted per game;
- positions are classified against curriculum skills such as piece safety, exchange judgment, candidate moves, opening principles, defense, opposition, and conversion;
- the bank stores the position *before* the error, so future review tests retrieval instead of showing the old move;
- successful repairs are spaced at increasing intervals and feed the normal mastery engine.

Imported game summaries and the personal mistake bank are account state. The engine itself stays client-side.

## Opening repertoire

The default repertoire is intentionally narrow:

- White: 1.e4, Italian versus ...e5, Alapin versus the Sicilian, central setups versus the Caro-Kann and French
- Black versus 1.e4: Caro-Kann
- Black versus 1.d4: Queen's Gambit Declined setup

Each branch stores purpose, plans, common mistakes, key squares and a preferred move. Training happens from positions rather than notation lists.

Opening recall is spaced independently per position. Real games are matched against the repertoire after analysis. If the opponent leaves the curated tree, the app stops judging the branch. If the learner leaves a chosen repertoire move, that exact position is marked due and can override the normal review date.

The repertoire explorer is owned data and works offline. The app does not expose a Lichess access token in client code. A future authenticated server-side explorer adapter can add live Lichess statistics without making the learning flow dependent on the external service.

## Play system

Play supports complete games from the initial position and targeted training games from curated positions.

Opponent profiles are deliberately described as training pressure rather than exact Elo ratings:

- Gentle: Stockfish Skill Level 0, shallow search
- Developing: more reliable punishment of obvious errors
- Club: default practical resistance
- Strong: deeper and more accurate
- Adaptive: selected from the current multidimensional player model

Training scenarios currently include:

- Italian repertoire entry
- Caro-Kann rehearsal as Black
- conversion with an extra rook
- defending a worse rook ending
- king-and-pawn opposition

A completed game immediately produces PGN, enters account game history, updates scenario transfer evidence, detects opening deviations, and is then analyzed through the P5 Stockfish critical-moment pipeline. If automatic analysis fails, the raw game remains safely stored in Review.

## Post-game story

Every analyzed game now stores a compact durable review story rather than the raw per-move engine dump.

The story contains:

- opening, middlegame and endgame phase summaries;
- a verdict for the overall game;
- the highest-priority curriculum skill from that game;
- 3–5 moments worth remembering;
- actual move versus better move;
- evaluation before/after and centipawn cost;
- a short teaching explanation;
- a compact engine continuation;
- links back to the personal mistake bank.

The visual Review workspace keeps the entire move timeline navigable while reserving detailed explanation for the selected moments. Switching between Position, Your move and Better move animates the relevant board transition and teaching arrow.

Older P5/P7 analyzed games can be upgraded in place by selecting them from Review; the app reruns analysis and generates the P8 story.

From a critical moment:

- **Repair now** opens the focused retrieval exercise from P5.
- **Replay position** starts a real P7 Stockfish game from that exact position.

Replay games preserve their custom starting FEN, are excluded from ordinary opening-deviation tracking, and flow back into the normal Review pipeline after completion.

## Library and analysis workspace

Library is the free-study side of the product.

The Analysis Board supports:

- legal free play from the initial position or any valid FEN;
- pasted PGN/game loading;
- undo/redo-style move navigation and branching by rewinding then choosing another move;
- board flipping;
- on-demand client-side Stockfish evaluation;
- best-move and principal-variation display in readable notation;
- study titles, notes, tags and study type;
- saving and updating studies;
- favorites and search;
- opening any game already stored by Play or Review;
- a small built-in reference collection, including the Morphy Opera Game and targeted opening/endgame/conversion positions.

Saved studies remain exploratory by default. They enter the adaptive training system only when **Save + train** is used after engine analysis. That stores a concrete target move and curriculum skill, then spaces future recall exactly like other personal review material.

If a saved study is branched to a different position, position-dependent engine analysis and training targets are cleared automatically rather than being carried onto the new FEN.

Library study state lives inside the same account JSON state as mastery, games, repertoire and mistakes, so no additional database table or migration is required.

## Premium interaction system

P10 provides one shared interaction contract across Learn, Play, Review and Library.

The board now uses real square-to-square piece travel rather than only destination pop animations. Castling animates the rook as well as the king, check gets its own visual pulse, legal targets enter smoothly, and rejected moves use restrained feedback.

Interaction preferences are account state:

- **Sound** — optional generated Web Audio cues for moves, captures, checks, success and game results. No audio asset bundle is required.
- **Haptics** — subtle vibration patterns on supported devices.
- **Celebrations** — optional particle flourishes reserved for mastery thresholds, repaired personal material, scenario goals and game wins.
- **Motion** — System, Full or Reduced. Reduced motion can be explicitly selected even when the operating system does not request it, while Full can deliberately override system reduction.

Celebrations are deliberately sparse. Ordinary correct moves receive tactile/audio confirmation, not confetti. Larger visual responses are reserved for meaningful mastery thresholds and real achievements.

Mobile polish includes safe-area-aware navigation, larger touch targets, an accessible settings surface, bottom-sheet training behavior, portrait/landscape tuning, reduced hover artifacts on touch devices, and improved study/game controls.

Startup now uses a branded loading state instead of briefly rendering demo state. Supabase/auth/network failures fall back to local state so account-sync trouble does not trap the application on startup.

Accessibility additions include current-page and pressed-state semantics, live game-state announcements, explicit reduced-motion control, and consistent keyboard focus behavior.

## Account sync

Point `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` at the same Supabase project used by the thiepn account system, then apply `supabase/migrations/001_chess_learning_state.sql`.

If there is no authenticated Supabase session, the app stays fully usable with local persistence.

Durable account state includes skill mastery, puzzle attempt history, games, game stories, repertoire progress, personal mistakes, and saved Library studies. The static puzzle/reference corpora themselves are not synced through the account backend.

## Architecture

Static curriculum lives in version control. Personal state lives behind a repository interface and can persist locally or to Supabase. Disposable engine calculations and board runtime state do not belong in account sync.

## Next phase

P11 — Full Curriculum Expansion, Beginner-to-Intermediate Course Completeness & Content QA.
