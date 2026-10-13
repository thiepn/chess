# P107 — Study Delivery & Independent Exercises

Parent: P106 draft #93, exact commit `c95a4cedb79b985053397f0854d96db3ba023239`.
Development branch: `p107-study-delivery-independent-exercises`.

## Learner workflow
1. Enter the original CalculationRunner and make the three native scored choices (candidate, defender reply, continuation).
2. When the board attempt ends, complete independent written questions **before** the model calculation review is shown. Current P103–P106 studies have three original questions per position, sourced directly from their existing study payloads; earlier supported defensive studies expose their existing authored question and model.
3. Enter an explanation to unlock the corresponding source-authored answer and misconception correction. Record a self-assessment if useful, move between questions without losing answers, or explicitly continue without completing all questions.
4. Continue to the existing verified three-ply score and worked line. The question self-assessments remain **unscored** and never modify original mastery, assessment, review scheduling, activity outcomes or training history.
5. A session-only, owner-and-position-namespaced written draft survives page refresh within the same browser tab (up to 24 hours), supports reset, and does not enter cloud storage or alter the Chess persistent data schema.

## Original study loading
- A single source manifest continues to supply original external calculation position JSON through the same calculation catalog. It reports ready, pending and failed sources and can retry failed fetches; a failed item is not silently treated as learned content.
- Each loaded source is checked for its count, phase-prefixed IDs, uniqueness, legal scored line and (for later phases) legal defender alternatives.
- Active calculation positions are pinned to the session so a late file load cannot change the board beneath a learner.
- No second game engine, grading engine, learner history writer, account backend or study progress store.

## Limits / explicit boundaries
- The scored engine still evaluates its original **first three plies only**; five-ply references and authored alternatives are *not* newly graded. Actual branch-by-branch deeper calculation is P108.
- Written responses are self-compared with original model responses, not AI-scored or objectively credited.
- Source data must be genuinely available; missing/invalid files are indicated as incomplete and can be retried. An already selected valid training board remains playable.
- Any existing user release blockers (human visual acceptance, real physical devices and exact deployment approval) remain open.
- No merge, deployment, production data change or user-data migration is part of this draft.

## Focused source cases
`src/calculation/studyDelivery.test.ts` asserts that P103 pawn-structure, P104 coordination, P105 king-attack and P106 defense source records expose three answerable original independent questions, and earlier studies recover their original defended-position questions without fabricated models.

## Next
**P108 — Genuine Multi-Ply Calculation.** Extend the original calculation assessment beyond three plies, legally validate non-cooperative alternatives and distinguish verified move evidence from authored explanatory variations without introducing parallel scores.
