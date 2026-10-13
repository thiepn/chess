# P112 — Endgame Decision Lab & Conversion Chains

## Authored content (implementation-first)
Thirty new, original **instructional-only** endgame decisions in ten thematic chains, three decision stages per theme:
1. Exchange or preserve the rook (original P102 conversion references)
2. Rook behind the passer (P102 rook activity)
3. Wrong-bishop drawing resource (P102 defensive counterexamples)
4. Passer timing and the opposing pawn race (P102 races)
5. Opposition and reserve tempi (P102 precision)
6. Queen checks versus king shelter (P101 queen forcing)
7. Queen support and an outside passer (P101 practical queen endings)
8. Minor piece versus the active king (P102 activity)
9. Queen counterchecks and survival (P102 defense)
10. Both pawns queen: revising the plan (P102 promotion races)

Each chain has **three progressively independent stages**, and each stage provides three original written prediction / calculation / transfer questions with model feedback (**90 exercises**), a source-authored five-ply main line, an independently recorded five-ply defensive reply, and a different three-ply authored start with explicitly **legal-only** continuation to five plies. The three lines are independent legal chess.js branches, not proof of optimal play.

### Source and rights
FENs and move sequences are exact chess-rule-preserving **180-degree color inversions** of this repository's existing original P101/P102 authored examples. Each P112 record names `sourceId`; original assets remain unchanged and retain their source identity. P112 writing/board contexts are newly authored but do not make claims of new game provenance, rights to external studies, Stockfish-approved best defenses or tablebase win/draw correctness.

### Native learning integration and authority
- Load via the existing asynchronous calculation JSON registry and source qualification, validated with original chess.js rules. P112's `hydrateEndgameDecision` converts a shorter third variation only into explicitly exploratory legally playable actions. No unqualified/illegal source is admitted.
- The original Train study library contains a **third Endgame decisions** category alongside P109 positional plans and P110 prevention, grouped by chain and showing stages 1/3 to 3/3.
- The original `EndgameTechniqueRunner` recognition stage adds an optional link to three related P112 lessons; it does **not** call the original endgame score writer when opening a study. Original endgame technique practice, goal checking and score authority remain unchanged.
- P107 writing/model comparison, P108 recoverable 4–8-ply board branches and optional requested local Stockfish, P109 strategic imbalances, P110 prophylaxis, P111 transition lessons and original owner-scoped Account/Persistence all remain intact.
- All P112 sources are tagged `assessmentStatus: "instructional-only"`. They are barred from normal graded adaptive selection, native chess score/history updates and invented mastery claims. No new grader, endgame engine, progress store, migration, private data transfer or session writer.

### Source files
`public/data/calculation/p112-endgame-decisions-{a,b}-v1.json`
`src/endgames/decisionStudy.ts`
`src/endgames/decisionStudy.test.ts`
`src/calculation/types.ts`
`src/calculation/studyDelivery.ts`
`src/calculation/positions.ts`
`src/components/StrategicStudyLibrary.tsx`
`src/components/EndgameTechniqueRunner.tsx`
`src/App.tsx`
`src/styles/p107-study.css`
`docs/P112_ENDGAME_DECISION_LAB.md`

### Verification caveats
The focused source tests assert transformations of the actual P101/P102 records, 30 FEN and source IDs, ten ordered three-stage chains, three legal distinct branches and meaningful original answers. The original repo's **321 KiB** total JS+CSS and **260 KiB** initial gzip budgets are unchanged. Passing source legality establishes neither forced endgame results nor human-device acceptance. No manual CI, merges, deployment, migration, credentials or paid services.

### P113
Strategic Master Games & Critical Decisions: rights-cleared whole-game PGNs where genuinely available; source-attributed critical moments and plan decisions without invented annotations, engine verdicts or provenance.
