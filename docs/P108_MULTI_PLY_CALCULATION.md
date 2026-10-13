# P108 — Genuine Multi-Ply Calculation

Parent: P107 stacked draft PR #94, exact commit `7cf7c479ed9014bbcb1c6338a00830e89a4cf178`.

## Learner-facing functionality
- An additional interactive multi-ply lab appears **after the original three-move attempt, before P107's written study and worked-solution disclosure**, only when there is a legal 4–8-ply source branch.
- Choose between the actual authored principal line and legal authored defensive variations. Source labels are disclosed but future moves remain hidden until explicitly revealed; the learner plays both sides of the board or intentionally invokes the documented defender move.
- Move any legal piece for either side, including quiet moves, checks, captures and promotions. Chess.js validates every move; newly diverging lines are classified as *legal but not certified*. Exact source-match messages never assert chess optimality.
- Optional local Stockfish analysis is available **only when requested**, using the existing running browser engine at bounded depth. The engine suggestion can be played directly and is tagged separately from an authored defender reply and a learner-entered move. An absent engine does not prevent further board play.
- Review each move's board position in a keyboard-friendly timeline, travel backward and forward, choose a different authored branch, replay from an earlier ply (discarding the downstream line), and clear the scratchpad. Endgames stop at the actual chess.js game-over state; the learning session allows at most eight moves.
- Session-scoped navigation is recoverable within 24h on the same browser tab, keyed by original owner and exact position, with complete legality revalidation of every restored move. There is no remote draft writer, new historical attempt record, or second progress authority.
- Authored comparison is unlocked after at least four legal moves; the learner may explicitly skip the optional deeper exercise. The earlier P107 written independent explanations and existing native scored calculation review continue unchanged.

## Grounding and honesty
- Only chess.js-legal source branches of length four through eight are offered. The original authored catalog has numerous five-ply studies; longer learner explorations are marked as independent or local-engine-suggested, never invented source lines.
- The original scored first three plies and owner-scoped history remain the **only authoritative calculation performance evidence**. P108's local match counter measures comparison with authored examples **only**, never mastery, unique best move, won position or engine-certified depth.
- Preserve Account boundaries, original games, lesson systems and rights; retain the unchanged 321 KiB gzip cap. No migrations, merge, deployment, credentials or paid services.

## Focused checks in source
`src/calculation/deepCalculation.test.ts` covers exact authored variants, FEN/SAN replay, legal departures, unusable moves, three-ply-only exclusions and blank recovery. Do not infer physical-device signoff or human educational outcome from automated tests.

## Next
P109 — Positional Imbalances & Plans: substantive original instructional cases in long-term planning, weaknesses, favorable exchanges, positional advantages and non-cooperative counterplans, using the original exercise, independent recall and practice authorities.
