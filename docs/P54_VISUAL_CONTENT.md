# P54 Visual Content Pass

P54 removes the remaining product-development vocabulary from THIEPN Chess and makes the interface speak in direct chess terms.

## Principle

**Say what the player is doing, seeing or deciding. Do not explain the software architecture.**

The intelligence layer may be complex. The UI should not sound complex merely because the implementation is.

## Train

### Before

- From your real-game plan
- From your weaknesses
- Curriculum
- Checkpoint remediation
- Adaptive session
- Placement diagnostic
- Personal mistake repair
- Adaptive retrieval practice
- Coach

### After

- From your games
- Needs practice
- Course
- Checkpoint follow-up
- Today’s session
- Placement check
- Review your mistake
- Recall practice
- Next focus

Training-selection behavior is unchanged.

## Learn

Stage-gate internals remain intact, but visible copy is simplified:

- Certified → Passed
- Evidence pending → More results needed
- Repair needed → Review needed
- Placement cleared → Starting point set
- Stage checkpoint → Stage check
- Placement diagnostic → Placement check

The stage metrics are shown as:

- Understanding
- Recall
- In games

instead of exposing the underlying mastery/retention/transfer model names.

## Play

Removed the self-referential sentence:

> No dashboard between you and the board.

Setup now simply says:

> Choose your color, time, and opponent, then play.

“Training position” becomes “Practice position,” and the level-matched opponent says “Your level” instead of “Recommended.”

## Review

Review now uses concrete actions:

- Analyze game
- Practice again
- Practice position
- Positions to revisit

Removed:

- structured visual review;
- repair queue;
- repaired positions;
- generic AI-brain analysis icons;
- internal review-version labels such as P8 story.

## Progress

Progress keeps the underlying analytics but translates them:

| Internal model | Visible label |
| --- | --- |
| Mastery | Skill level |
| Retention | Recall |
| Transfer | In games |
| Calibration | Estimate match / Level estimate |
| Evidence | Tracked results / Basis |
| Coach readout | Training focus |
| Prescriptions | Presented as concrete training suggestions |
| Interventions | Training methods |
| Real-game transfer | How training shows up |
| Model diagnostics | How progress is estimated |

The advanced detail panel remains available, but it explains the values instead of exposing engineering terminology.

## Openings

Changed:

- Repertoire health → Repertoire score
- Weakest live branch → Most missed line
- recall evidence only → practice only
- training evidence only → practice only
- deviations → off-repertoire moments / off line where appropriate

## Training runners

Puzzle, lesson, assessment, calculation, endgame, opening and saved-study runners now:

- use check/target/action icons instead of brain/sparkle decoration;
- avoid mastery/recognition-evidence wording;
- explain placement/stage checks without “player model” or “adaptive training” language;
- use “better move,” “practice,” “retry” and “apply it” instead of “repair/transfer” jargon.

## Library

Generic brain/gamepad/sparkle icons were replaced with:

- Target for analysis-board entry;
- Search for Stockfish analysis;
- Swords for games;
- Plus for a new workspace;
- Bookmark for a new study.

Saved-position actions say **Practice** rather than **Train** where that is the actual interaction.

## Icon policy

Do not use:

- `BrainCircuit` as a generic AI marker;
- `Gamepad2` for chess games;
- `Sparkles` as generic success/quality decoration.

`Sparkles` is permitted in the Experience settings because it literally represents the optional Celebrations feature.

## Empty-state policy

Empty states are short and factual.

Good:

- No games yet.
- No positions to revisit.
- Nothing is due right now.

Avoid:

- Keep going!
- You’re on a journey!
- Level up your chess!
- Unlock your potential!

## Regression gate

Run:

```bash
npm run content:audit
```

The audit checks 21 UI surface files for:

- removed implementation phrases;
- internal phase/version copy;
- motivational filler;
- generic BrainCircuit/Gamepad2/Sparkles usage;
- preservation of the new Train/Learn/Play/Review/Progress wording.

This audit intentionally targets rendered UI source. Internal variable names, CSS classes and analytics model names are outside P54’s scope.
