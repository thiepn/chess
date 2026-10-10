# Chess P85 — Game Review 2.0 (product-first, synthetic and source-grounded)

Stacked **only** on repaired P84 head `13d41999ebd3569986fe723a458f593de6f08ad8`, PR #71 (draft). P84 original `2ba8b5573a04b998bda2e7dbd0e95fabeb33e97f` passed Quality/Offline/Visual Candidates, but its full browser run failed 15 Chromium + 3 WebKit tests. P84 repair fixed stale opponent search state and the renamed exit assertion without relaxing checks. Repaired P84 exact-head Quality, Offline and independent recovery, Visual Candidates, **125 Chromium + 25 WebKit** now PASS; strict 13 existing screenshots remain unapproved and FAIL.

## Player-visible product behavior

1. **Explore an actual engine line** in saved Game Review, not an animation of invented moves. A source PV is accepted only when its root UCI move matches the recorded best move and each following move is replayable by chess.js at the exact stored FEN. The displayed line stops at the first illegal/stale move. Use Start, Previous, Next and individual SAN step controls to compare positions. No opponent reply is presented as guaranteed.
2. **Mobile and keyboard navigation**: actual reviewed moves in the notation panel support Left/Right/Home/End in addition to the existing pointer/touch control; focus follows the selected exact ply. Step controls are large enough for touch, wrap without horizontal overflow and include current-step semantics.
3. **Understand the score**: centipawn evaluations are explicitly approximate *player-perspective* values, not winning percentages or Elo. Costs are in pawn units. Only legally verified SAN lines are labeled as such; missing/invalid engine evidence is not silently manufactured.
4. **Safe review recalculation**: a saved previously analyzed game exposes an explicit Refresh engine review control with loading state and visible error. Recalculation is in memory and writes through the pre-existing owner-specific onAnalyzed path only if Stockfish finishes successfully. Engine errors leave the prior game, review, training data and notation intact with retry available.
5. **Training handoff**: existing coach reveal, replay and targeted Practice this weakness actions remain tied to source gameId, ply, skill and saved user state. Ordinary moves without engine evaluations are labeled as such rather than given fictional assessments.

## Automated regressions

- `src/review/variation.test.ts`: lawful UCI/SAN/FEN reconstruction, no mutation of stored source, illegal/malformed early stopping, finite limit, underpromotion, and rejection of inconsistent best/PV.
- `tests/ux/chess.ux.spec.ts`: real browser source-backed two-ply engine variation on a saved game with actual board-square FEN; notation keyboard navigation; simulated unavailable engine with preserved previous review and retry; horizontal overflow check.
- Existing P84 legal game, timed clock, checkpoint, Review transfer, 13 strict visual golden references and performance/security/release audits unchanged.
- Exact-head Quality, offline package with independent recovery, P67 visual evidence and Chromium/WebKit simulated browsers must finish successfully to qualify machine gates.

## Nonclaims and release HOLD

No human or physical device review is fabricated. All 18 original visual decisions, 14 real-device/THIEPN Account/a11y/educator cases and 13 changed screenshot goldens remain PENDING/UNAPPROVED. No production Account OAuth registration, owner authentication change, production data migration, baseline approval, release or merge. Strict visual and performance checks are never weakened.

## P86 — Personalized Review-to-Training Loop (NOT STARTED)

Prioritize user-specific practice from verified critical moves, guided tactical reconstruction, progress measured on *actual* attempts, owner-bound learning checkpoints and safe cross-session continuation; carry any P85 CI/human gates explicitly.
