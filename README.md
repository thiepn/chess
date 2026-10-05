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
- Local-first durable state
- Optional Supabase persistence using the shared authenticated user
- Responsive Home and session runtime shell
- Reduced-motion and keyboard-friendly interaction defaults

The curriculum is intentionally a representative seed graph rather than the final 200–300 atomic-skill catalog. P3 provides polished authored lessons; P4 supplies scalable practice behind those concepts.

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

## Account sync

Point `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` at the same Supabase project used by the thiepn account system, then apply `supabase/migrations/001_chess_learning_state.sql`.

If there is no authenticated Supabase session, the app stays fully usable with local persistence.

Durable account state includes skill mastery and puzzle attempt history. The static puzzle corpus itself is not synced through the account backend.

## Architecture

Static curriculum lives in version control. Personal state lives behind a repository interface and can persist locally or to Supabase. Disposable engine calculations and board runtime state do not belong in account sync.

## Next phase

P5 — Game Import, Stockfish Analysis, Critical-Moment Detection & Personal Mistake Bank.
