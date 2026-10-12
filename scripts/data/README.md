# P93 CC0 tactical puzzle source

The original `lichess-production-baseline.csv` contains **2,000** original records from the two previously documented public Lichess mirrors. **No original row or ID was modified.**

`lichess-p93-expansion.csv` contains **9,000 additional records with unique PuzzleId**, extracted from the preexisting mirror [Ali-Raza764/chess_puzzles_api](https://github.com/Ali-Raza764/chess_puzzles_api), `puzzles_10000.csv` **Git blob `95e4a4d44f5a6611bbe14a6524de9ee9c59008ba`**. The mirror's 10,000 rows overlap the original 2,000 source by 1,000 IDs; all 1,000 overlaps were discarded. Supplementary derived blob SHA: `ed86a139861fcce7fe17609e81945c8af9d6613a`. Source rows are Lichess-derived CC0 and retain their original FEN, UCI line, rating, popularity, themes, and game URL. The mirror is **not** certified as the official October 2026 snapshot or a complete official export.

The production builder consumes both inputs, rejects duplicates and unqualified moves, bounds per-skill ratings and popularity, validates every source continuation through chess.js, and emits lazy-loaded JSON shards. The exact **11,000** figure refers to unique *raw rows*, not all qualified puzzles or distinct runtime skill-shard assignments. The final generated `manifest.json` records actual scanned, accepted, rejected and unique/shard counts.

Do not add synthetic chess puzzles or claim an engine-certified unique best move from legal move validation. The unchanged optional official Lichess full-export workflow remains separate, costly, and not activated by this PR.

**Original baseline provenance:** `kagisearch/llm-chess-puzzles` 1,000 and `Ali-Raza764/chess_puzzles_api` 1,000. **Full upstream CC0 source:** https://database.lichess.org/#puzzles
