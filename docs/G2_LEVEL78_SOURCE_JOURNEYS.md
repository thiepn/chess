# Chess G2 — Practical and Advanced original-source learner journeys

**Parent head:** bac1d0b870e7b9b32e15376b93aa3d381cad3ac0 on the same
`feature/chess-l23-source-depth-and-study-authority` branch.
No new PR, main merge, deployment, data migration or Account write.

## Actual learner functionality
- 23 unchanged curriculum IDs: five Practical + eighteen Advanced.
- 69 position-dependent *teaching questions* (three for each ID) covering
  candidate/plan, strongest defender and revise/repair. These are not 69 graded
  positions and do not purport to identify a unique best move.
- For all 23 stages, the native Learn skill page links to two source-pinned P114
  historical comparison IDs; the existing P113–P117 archive validates both
  underlying complete PGNs, exact checkpoint positions and recorded replies.
  The existing CrossGameTransferLab limits the initial course view to the
  selected theme, with an explicit all-24-pairs option. The original portable
  notes and session-local owner-scoped drafts are reused.
- Advanced course pages select up to six original, source-authored calculations
  and endgame techniques with direct-vs-contextual markings. P109–P112
  instructional-only studies stay ungraded. The CalculationStudyPanel retains
  the original source question and adds three original-skill decision/refutation
  prompts with an explicit authored-line, not unique-best, disclaimer.
- Personal-game practice is derived read-only from owner-scoped
  gameTransferMissions. Missions require legalReviewMistake and a validated
  principal variation, and show verified clean attempts, spaced 24-hour clean
  returns, missed attempts, and due status. Contextual game-mistake examples
  never become direct Advanced or Practical skill mastery.
- The course buttons navigate through the *existing* personalMistake activity,
  game Review route, original CalculationRunner and endgame engine. The original
  game review and delayed return scheduler alone determine their evidence.
- Focus is cleared on Account identity change; no copied personal move log,
  source identity, saving authority, React store or grading engine was added.

## Intentional boundaries
- Historical cross-game counterfactuals are legal source-based instructional
  examples, not engine-certified unique best moves. `mark=understood` is
  ungraded and not delayed retention.
- The original CalculationRunner may score its native, authorized calculation
  material; new lens writing is never scored. Owner-private analysis cannot
  enter the public course authored-position catalog.
- P93 generated corpus and exact-head G1C qualification still require an
  executable checkout; a draft PR or authored tests do not imply PASS.
- No human game improvement, rank growth, external engine WDL tablebases or
  100% subject completeness is inferred from course visibility.

## Focused qualification (only when checkout and dependencies genuinely exist)
`npm run p78:qualification` runs targeted Vitest for stage/source membership,
calculation study delivery, P114 source identities and existing owner-verified
review missions. Separately run `npm run l23:qualification` for all six source
exercises per Level 2–3 skill, and `npm run build` for actual TS/Vite.
The interactive course-to-historical-to-review journey and mobile controls
require genuine Chromium acceptance. No commands were executed through the
GitHub source-only connector.
