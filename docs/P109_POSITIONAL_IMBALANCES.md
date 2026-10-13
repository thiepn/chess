# P109 — Positional Imbalances & Plans

**Stack parent:** P108 draft PR #95, `p108-genuine-multi-ply-calculation`, commit `831ff9f9d1ea57a6e267b2a4f6756bf6ab38666c`.

## What is implemented
- **40 source-backed strategic case studies**, ten themes with four distinct positions each, distributed across `p109-imbalances-a-v1.json` and `p109-imbalances-b-v1.json`. Twenty have White to move and twenty Black to move. Position FENs are unique; each has new instructional context incorporating the exact surviving kings, a specific additional pawn, a five-ply source-legal line, and an independently legal resisting alternative.
- The **original teaching language and three independent exercise prompts/answers per case** address imbalances before candidate moves, what White/Black can do against the plan, and how to revise the evaluation after comparison. Topics: material/activity, pawn weaknesses, bishop–knight play, space/breaks, weak squares/color complexes, king shelter/initiative, coordination, favorable trades, open files and passed pawns. Answers never certify a unique best move.
- **Data provenance:** These are newly written training scenarios based on legal transformations of Chess's **own existing original** P103–P105 instructional source boards and continuation moves; they are *not* 40 invented engine-verified chess studies or 40 entirely unrelated master-game positions. Transformed positions introduce a legal additional pawn and alter the practical evaluation, so the original source's descriptive claims are not treated as engine truth. No external commercial content was imported.
- Original calculation asset manifest asynchronously loads the two files and reports missing files through P107's existing recovery mechanism. The Train homepage's **Positional Imbalances & Plans** chooser lets the learner select one of ten themes, then start any of four source-identified studies. This reuses `openManualActivity`, pinned calculation position identity and owner-scoped account boundaries, with no second library or training engine.
- P107's written independent answer + model comparison and P108's legal board-based branch navigation and optional local Stockfish work as before. Optional session-only drafts remain owned and do not migrate to another user.

## Assessment boundary: critical
P109 is **instructional-only**. Its chess.js-legal examples are not Stockfish-certified optimal and therefore **must not generate mastery, grade, review schedule, activity evidence, analytics or a fabricated solved-position result**. The original CalculationRunner hides the numeric three-ply score for these cases and instead shows the authored worked position; a dedicated exit ends the manual practice session with no score write. App's authoritative completion handler also explicitly rejects attempts to submit a P109 study as scored calculation evidence. Normal P94–P108 scored exercises remain unchanged and automatic adaptive selection excludes P109. This is a deliberate authority distinction, not a new scoring system.

## Source changes
- `public/data/calculation/p109-imbalances-a-v1.json`, `p109-imbalances-b-v1.json` — 40 legal-position, authored-curriculum educational records.
- `src/calculation/types.ts`, `studyDelivery.ts`, `positions.ts` — explicit instructional mode, P107 exercise adapter and existing asset manifest.
- `src/components/StrategicStudyLibrary.tsx` — native discoverability and theme selection.
- `src/components/CalculationRunner.tsx`, `src/App.tsx` — source-qualified instruction, unscored exit and account-authority guard.
- `src/styles/p107-study.css` — responsive, keyboard-accessible study choices and text review.
- `src/calculation/p109Content.test.ts` — focused source assertions for 40 FENs, balanced sides, alternate legally replayed five-ply lines, original question/answer bodies, and no mastery grading.

## Limitations and follow-up
A short legal instructional line and source-derived structure cannot prove a best move, unique evaluation or actual learner strength gains; local engine checking is optional and explicitly separate. Manual physical-device accessibility and human-authored chess instructional proofreading are not release-certified. No CI, broad audit, deployment, merge, migration or credential access was initiated by hand.

**P110 — Prophylaxis & Positional Defense:** make anticipatory threat recognition and preventive moves independently playable against noncooperative defense, drawing on the source-backed P109 positional imbalances and existing P108 calculation authority.
