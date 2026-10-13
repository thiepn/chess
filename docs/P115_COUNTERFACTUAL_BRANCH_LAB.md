# Chess P115 — Independent Counterfactual Branch Rehearsal

## Verified stacked parent
P114 draft PR #102, branch `p114-cross-game-strategic-transfer`, exact SHA `47b1ea81e0d06ec8f7a6b4cb533a61ddf3cc47b3`. A separate stacked draft child branch is `p115-independent-counterfactual-branch-rehearsal`. Nothing merged or deployed.

## Working learner functionality
The existing native Course → Model Games → P113 complete master games → P114 comparative strategic decisions workflow now has a **P115 Rehearse legal candidates** mode for all 12 paired studies (24 source-qualified historical positions). The learner, not an automated opponent, must make moves for both colors, explore up to six plies per board, undo, clear and revise. The interactive board uses the original `ChessBoard` and `chess.js` move authority. Exact board facts (checks, captures, promotion, game-over state and side to move) are shown separately from interpretive judgments.

Each board offers an original, contextual challenge to choose an alternative move and test an inconvenient real legal defender response. The pair concludes with an original transfer prompt and misconception-specific repair. The historical three-ply continuation is only available **after** the learner reveals the P114 source comparison and is **never written over** their independently played variation. Links lead back to the original full-game decision.

### Original authored material
- New externally loaded `public/data/model-games/p115-counterfactual-v1.json`: 12 independently authored source-anchored cases, 24 position-specific candidate challenges and 12 comparative revision prompts, with explicit defender protocols and proof limitations.
- `hydrateCounterfactuals` confirms each original P114 pair ID, P113 game ID, historical checkpoint ID and ply before displaying it. Failed-source cases are withheld rather than matched by approximate theme.
- `replayCounterfactual` and `advanceCounterfactual` replay strictly legal SAN with the existing Chess.js engine; malformed saved lines are flagged, not invented or silently continued.

### Existing state and constraints
- Reuses `MasterDraft`, `masterDraftKey`, `restoreMasterDrafts` and P114 owner-gated session recovery. New optional branch and written reflection fields are contained in the **same existing versioned owner-scoped session record**, not another state store.
- No new Elo, mastery, Account, review or grader authority, no simulated opponent and no Stockfish evaluation claims.
- P114 board comparison and written exercises remain accessible; P115 is an independent alternative interaction within the same mounted workspace.
- Original PGNs remain factual third-party game scores, original app-authored comparisons and prompts only.

## Inherited qualification state
P114 exact-head Quality automatic workflow passed 437/437 tests and production compilation. The unchanged total JS+CSS performance budget failed at **331.6/321 KiB gzip**, although initial app passed at **232.9/260 KiB**. P114 visual regression failed its approved screenshot baseline check (14 comparisons); this did not establish P115 mobile acceptance. P115 does not relax either budget. New source tests are provided but not run manually. Exact-head workflow results are required before claiming passing metrics or a merge-ready state.

No manual tests, CI dispatch, heavy browser acceptance, migration, merge, deployment, credentials or paid services.
