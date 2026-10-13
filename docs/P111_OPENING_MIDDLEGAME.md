# P111 — Opening-to-Middlegame Structures & Plans

## Parent and design boundaries
- Stacked on P110 PR #97, exact parent `33c0074ac4754957de08473d0abef4b6a716f93e`.
- Original Chess opening/repertoire source IDs, FENs and all pre-existing training authorities are preserved. No game score, opening mastery, course grade or personal history record is created by these 16 studies.
- Source file records hold an immutable **native `openingTransitionStudy.nodeId` and `repertoireId`**, rather than invented approved positions. The original `openingNodes[nodeId].fen` from chess.js is the single source of position truth. The `@repertoire:<nodeId>` placeholder cannot be used in chess training without successful qualification.
- P111 has **16 separate source-qualified decision studies** drawn from real existing authored opening branches: 3 Italian, 3 Alapin Sicilian, 2 Caro-Kann as White, 2 French as White, 3 Caro-Kann as Black, 3 Queen's Gambit Declined as Black. These are distinct original repertoire positions and represent **six source-defined opening families**, not sixteen externally proven ECO systems.
- Every study includes structure, pawn break, counterplan, prophylactic misconception, exchange choice, an original explanation and three progressively independent written questions/model answers/repairs (**48 original exercises**).
- The principal five-ply line is source-authored. The two alternatives have authored legal prefixes and can be extended by the original chess.js move rules to exactly five plies. **Automatically extended moves are legal exploratory examples, not curated repertoire recommendations, verified best defenses or equivalence evidence.** No Stockfish score is fabricated. Optional P108 local Stockfish remains separately labeled and requested explicitly.
- In the original Opening/Repertoire screen, select one of the six familiar families, view source-specific decision transitions for that exact repertoire, and open a native unscored CalculationRunner study. The original P107 independent writing, P108 board navigation and alternative legal variations, and P109/P110 strategic corrections remain intact. Opening recall and training authority are untouched.
- Source file loading is asynchronous with P107 native failed-source statuses and retry, unchanged owner-scoped account isolation and pinned position IDs. No new persistence or grade writer.
- `src/openings/transitionStudy.test.ts` asserts 16 unique source nodes, genuine native FENs, five legal plies in three branches, question quality and rejection of forged sources.
- No manual CI, merge, deployment, migration, credentials, paid APIs or production changes.

## Changed files
- `public/data/calculation/p111-opening-bridges-a-v1.json`
- `public/data/calculation/p111-opening-bridges-b-v1.json`
- `src/openings/transitionStudy.ts`
- `src/openings/transitionStudy.test.ts`
- `src/calculation/types.ts`, `studyDelivery.ts`, `positions.ts`
- `src/components/OpeningsView.tsx`
- `src/App.tsx`
- `src/styles/p107-study.css`
- `docs/P111_OPENING_MIDDLEGAME.md`

## Next phase
P112 — Endgame Decision Lab & Conversion Chains. Develop legal multi-decision endgames on original source boards, precise trade-versus-convert decisions, drawing defenses and five-ply continuations; integrate with existing EndgameTechniqueRunner, P107 source-qualified explanations and original review authority. No tablebase evidence or forced-win grading unless verified.
