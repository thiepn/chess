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
- Local-first durable state
- Optional Supabase persistence using the shared authenticated user
- Responsive Home and session runtime shell
- Reduced-motion and keyboard-friendly interaction defaults

The curriculum is intentionally a representative seed graph rather than the final 200–300 atomic-skill catalog. P3 provides polished authored lessons; P4 supplies scalable practice behind those concepts; P5 converts real games into evidence and future training; P6 adds a deliberately small opening repertoire; P7 makes Play itself part of the learning system instead of a disconnected chessboard.

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

## Account sync

Point `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` at the same Supabase project used by the thiepn account system, then apply `supabase/migrations/001_chess_learning_state.sql`.

If there is no authenticated Supabase session, the app stays fully usable with local persistence.

Durable account state includes skill mastery and puzzle attempt history. The static puzzle corpus itself is not synced through the account backend.

## Architecture

Static curriculum lives in version control. Personal state lives behind a repository interface and can persist locally or to Supabase. Disposable engine calculations and board runtime state do not belong in account sync.

## Next phase

P8 — Post-Game Storytelling, Move Timeline & Personalized Review Experience.
