# P63 — Learning & Coaching Quality Qualification

Status: **code implementation candidate; release acceptance outstanding**.
Branch: `p63-learning-coaching-quality` (stacked after P62 and P61).

## Corrections made

1. **Exact answer identity.** Canonical UCI equality includes the promotion letter; `a7a8n` is not equivalent to `a7a8q`. This now governs lesson, puzzle, calculation and coached review scoring. The board offers explicit accessible Queen/Rook/Bishop/Knight choices instead of silently forcing a queen.
2. **Evidence validity.** A final exercise using the model FEN is retrieval, *not demonstrated transfer*. Lessons with independent transfer positions retain their higher-weight `transfer` evidence. Repeated-board exercises use `retrieval` and the mastery aggregator permits completion based on at least three independent checks without claiming transfer.
3. **Retrieval integrity.** Concept recognition and later recall no longer present exactly the same options twice.
4. **Claim calibration.** The Lichess puzzle solution is a *curated graded reference*, not proof that every alternative legal move is bad. The Review panel's heuristic extra candidates are described as legal candidates, not engine-verified forcing moves. When a new line matters, compare it with Stockfish rather than claiming uniqueness.
5. **Automated educational contract.** The P63 test suite verifies legal guided moves, promotion matching, core checkmate/castling/promotion demonstrations, legal bundled puzzle lines, valid authored calculation lines, and endgame catalog structure.

## Content audit inventory

- **86 authored skill lessons**.
- **37 distinct authored transfer exercises**; **49 same-position independent retrieval exercises**, not genuine transfer demonstrations.
- **4 retained authored calculation positions** plus personal-game extraction; candidate PV legality is programmatically audited. The former advanced-combination example was quarantined because 1.Re8+ Qxe8 2.Bxh7+? Kxh7 loses major material; the affected skill can select the retained forcing-line exercise, which is framed as a drawing resource, not a winning attack.
- Endgame positions are programmatically checked for valid FEN, answer keys and defensive survival contracts.
- Existing puzzle CI audits the shard manifest and replays each stored solution move. A stored line is still not proof of engine-optimality at all search depths.

## Release acceptance gaps

The mechanical audits are strong but are NOT equivalent to human chess instructional review. Before calling P63 complete:
- Author genuinely independent, concept-valid transfer positions for the remaining 49 skills or explicitly designate the course as retrieval-focused.
- Have an experienced chess teacher review substantive claims, especially the five curated calculation lines and critical beginner rule demonstrations.
- Cross-check selected tactical themes and alternative moves with a deeper engine search, including underpromotion and endgame drawing resources.
- Run actual learner journeys (novice, intermediate, advanced), observe whether hints teach rather than merely reveal coordinates, and record misconception-specific feedback quality.
- Verify promotion selector usability with pointer, touch, keyboard and screen readers.
- Complete stacked P61 account acceptance and P62 failed Device UX cases.

## Test/release constraints

Do not merge P63 to main, publish V1.0, or claim 9/10 teaching until Quality, Visual Regression and Device UX pass on the same PR commit and the remaining instructional/content gates are documented. A test that moves are legal does **not** certify they are the best moves or that lesson explanations are pedagogically sound.
