# P93: Genuine Lichess tactical source and independent mixed recognition

P93 is an isolated source-only child of P92 PR #79, parent commit `f2b65a348eace730b36fc57c90e71334898a5803`.

## Corpus
- Original checked-in baseline retained: 2,000 source records.
- Additional unique Lichess-derived CC0 rows: **9,000**, from `Ali-Raza764/chess_puzzles_api` `puzzles_10000.csv`, exact upstream Git blob `95e4a4d44f5a6611bbe14a6524de9ee9c59008ba`.
- Deduplicate on PuzzleId before any training. 11,000 is the **raw unique source count**, not an assertion that every source row passes quality filters or that every generated skill-shard entry represents a distinct puzzle.
- Existing builder now reads both files; chess.js independently checks legal first-move and tactical continuations, maps motives, filters quality/rating and writes lazy static JSON shards. Existing official full-export refresh workflow is untouched and not executed.
- The production manifest records the input files, scanned/accepted/rejected and deduplicated/shard counts. Missing or old generated corpus forces rebuild; no fake empty or online-generated positions.

## Learner-facing mixed recognition
- A mixed session uses source IDs across different genuine tactical themes, with defensive-resource and quiet-move practice always among the queried skills and other motifs rotated by day.
- Prefers previously unseen puzzles. Familiar puzzles remain eligible through original delayed owner-scoped review; their recorded source identity and history are unchanged.
- The motif/associated opening tags stay hidden before solving; hints and missed-move corrections avoid giving away the motif name. After a solve, the original runner provides a deeper compare-candidate-and-opponent-response explanation, plus original optional Stockfish verification.
- A cross-motif puzzle not tagged with the scheduled skill **does not raise that unrelated skill's mastery or analytics**. Actual per-PuzzleId outcome is recorded through the existing owner-bound history and spacing writer. The original existing score source remains authoritative; no replacement mastery or review engine.
- Both hint levels are now accepted by the original App result guard, while assisted attempts remain distinguishable from unassisted clean results.

## Scope and release
Unmerged, undeployed, source-only. No new credentials, production migrations, screenshot goldens, test threshold or license claims. Original 321 KiB JS/CSS gzip budget, 18 human visual cases and 14 physical/Account/a11y/educator cases are unchanged. A green machine workflow is not human acceptance. Corpus provenance, source quality and unique-solution soundness are distinct; legal chess.js continuations alone do not prove unique best moves.
