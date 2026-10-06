# Puzzle production baseline

This directory contains a compact, checked-in baseline used to build the browser puzzle shards for ordinary local development, CI and GitHub Pages.

## Source

`lichess-production-baseline.csv` contains 2,000 unique rows from the public-domain Lichess puzzle database.

The rows were normalized from two public mirrors/samples of the Lichess CSV schema:

- `kagisearch/llm-chess-puzzles` — 1,000-position sample;
- `Ali-Raza764/chess_puzzles_api` — 1,000-position sample.

Duplicate `PuzzleId` values are removed. The puzzle records themselves originate from Lichess and are released under CC0.

This baseline is intentionally small enough to keep repository/build cost low while giving the shipped app real puzzle variety. It is not the long-term ceiling.

## Full refresh

Use the dedicated **Refresh Puzzle Corpus** workflow to rebuild `public/data/puzzles` from the current official export at:

`https://database.lichess.org/lichess_db_puzzle.csv.zst`

The production builder validates legality, applies the opponent's first move, filters noisy records, maps themes to curriculum skills, preserves rating diversity, and writes bounded per-skill shards.
