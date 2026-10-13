# P110 — Prophylaxis & Positional Defense

**Stack:** P109 draft PR #96 at exactly `a17ad3c6b10e92ad2f1d54964c9a9b563cbb99c5`, based on P108 #95. Separate P109-child branch `p110-prophylaxis-positional-defense`.

## Delivered content

Forty newly written instructional defensive cases arranged into **ten themes, four situations per theme**:

1. Forecasting forcing threats and counterchecks
2. Prevention versus immediate counterattack and protected interpositions
3. Restriction and weak-square protection
4. King shelter, enemy diagonals and pawn hooks
5. Anticipating opposing pawn breaks and chain-base contact
6. Minor-piece restraint and bishop/knight reroutes
7. Flexible coordination of defensive rooks and kings
8. Exchanging attackers and protecting queen escape squares
9. Anticipating rook and queen invasions through open files
10. Changing the second move after unexpected defender resistance

There are **20 White-to-move and 20 Black-to-move** setups, **40 unique FENs**, three complete written questions/model responses/repairs for each position (**120 independent exercises**), a five-ply principal illustration, and two legal five-ply alternative/counterexample lines per position. The alternatives include genuine counterresponses and independent candidate attempts, **not** certifications that a defender's move is best. Context describes the actual king squares, position-specific candidate moves and the role of a legally added pawn. Some original sources contain the same principal and first alternative sequence; for those cases the second, alternative move-order line supplies the contrasting independent legal branch. No distinct-best-move or forced-evaluation assertion follows from legality.

**Originality and provenance:** New original written teaching material and altered board contexts are derived from the repository's own previously authored P103–P106 chess situations and already documented legal main/defender moves. They are not 40 unrelated professional game compositions, official databases or engine-certified positions. Short tempting alternative source lines have been extended to five legal moves for board study; those added moves are **exploratory** and are not engine judgments. Rights remain the repository's own educational material.

## Practical learner flow

- Reuse P109's **original Train study discovery**, now with accessible **Defense & prevention** and **Positional plans** selectors, each with ten topics and four cases. The source catalog still uses the original asynchronous JSON loader with visible source failures, retry and exact-position pinning.
- Enter the existing CalculationRunner. Predict the opponent's threat, enter a candidate and opponent reply, then use P108's board/variation timeline to investigate the primary line and two source-authored resisting or tempting candidates. Explicit local Stockfish is optional and separate from authored lines.
- Write independent explanations via the original P107 source-authorized questions. After comparing the authored answer, identify how the plan must change when the opponent chooses the alternate reply.
- End a P110/P109 case **without writing any outcome** through the owner-guarded instructional exit. Source flag `assessmentStatus: "instructional-only"` blocks numerical grading. The authoritative App completion handler rejects attempts to credit these source positions even if a client supplies an outcome.
- Ordinary scored training **excludes** instructional-only positions in the original `calculationPositionFor` selection. This also fixes the inherited P109 catalog issue: an unscored teaching position cannot leak into regular graded adaptive practice by being selected on a matching skill ID.
- Existing account owner scope, original three-ply scoring for *other* sources, chess.js, P107 drafts, P108 legal deep branches and all P109 historical source IDs remain unchanged.

## Files

- `public/data/calculation/p110-prophylaxis-a-v1.json` — first 20 studies.
- `public/data/calculation/p110-prophylaxis-b-v1.json` — second 20 studies.
- `src/calculation/positions.ts`, `types.ts`, `studyDelivery.ts` — existing catalog registration, intentional unscored separation, native question adapter.
- `src/components/StrategicStudyLibrary.tsx`, `src/App.tsx`, `src/styles/p107-study.css` — defense/strategy selection, source-qualified entry and responsive controls.
- `src/calculation/p110Content.test.ts` — focused chess.js legality, source-unique identities, alternate legal lines, explanations and unscored-authority assertions.
- This document.

## Limitations / verification semantics

Human chess pedagogy review, engine-verified best-move evaluation and physical-device acceptance are not established merely by legal chess.js replay or automation. Do not label short source lines as solved positions, best defense or mastery evidence. No source migration, second game/assessment engine, owner history store, rating changes, main/production deployment or manually launched CI.

## Following phase

**P111 — Opening-to-Middlegame Structures & Plans:** author sourced opening families, the first actionable middlegame decisions, typical pawn structures and the consequences of premature plan changes. Reuse original opening/repertoire lesson and chess-practice authorities, with original rights and source identity preserved.
