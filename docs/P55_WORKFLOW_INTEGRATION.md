# P55 — Cross-Page Workflow Integration

Chess should connect learning activities directly, not stop on isolated completion screens.

| Journey | Behavior |
| --- | --- |
| Learn → Train → Learn | Practice opens the selected skill and returns to its initiating lesson |
| Review → Train → Review | Practice opens the selected mistake/skill and returns to its game |
| Library → Train → Library | Recall opens the selected study and returns to its workspace |
| Play → Review | Complete a game and open its exact saved review, even when engine analysis fails |
| Review → Play → Review | Exit a replay to its exact originating game review, including after refresh |
| Progress → Play → Progress | Exit a prescribed scenario to Progress |
| Train → Review | After an engine training game, open its saved Review and leave the training runtime |

## Safety and state

The Play snapshot stores an optional initiating route for external scenarios. Replay return routing only accepts Review and Progress. A malformed, absent or stale route falls back to Play. The completed-game Review action replaces the active game URL, so browser Back does not re-create a supposedly finished game. The game is persisted before Stockfish analysis is attempted; when deeper analysis fails, Review retains a reanalysis entry point.

The Train runtime's existing `trainingReturnPath` mechanism remains in place for lesson, mistake and Library study handoffs.

## Qualification

Run `npm test`, `npm run build`, and all CI audits. The following manual checks remain for P58: full AI game and direct review; unsuccessful analysis and manual retry; mistake replay with refresh and return; Progress-origin scenario and return; Learn/Review/Library practice and return; browser Back/Forward; mobile and keyboard navigation. This phase does not claim manual device qualification.
