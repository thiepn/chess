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

## G2C: independently playable native source cases
- Verified source file counts: P94 and P95 alone hold 40+40 authored, legally replayable **three-ply reference sequences**. These historically could not open optional P108 DeepCalculationLab, which admitted 4–8 only. P108 now accepts 3–8 legally replayed plies, retaining original source FEN/ID, session-only drafts and score authority.
- The original board now asks the learner to move for the defender and only reveals the documented defender response on an explicit click. Other legal replies are permitted for exploration and never branded inferior from source presence alone.
- At the end of a source line with only three plies, the comparison threshold adjusts to three without manufacturing a fourth move. The existing local Stockfish suggestion remains explicitly learner-triggered and not an invented guaranteed evaluation.
- Original Levels 4–6 and Advanced position lists can now surface up to 12 source-verified cases per skill, six initially then six behind a user-triggered show-more control. Exact available count depends on the asynchronous loaded source catalog and legitimate source tags; do not equate the 12-slot ceiling with 12 verified available boards for every skill.
- A focused regression test enumerates all 80 P94/P95 cases with legal branch reconstruction and checked SAN/FEN history, plus exact three-ply boundary. Requires real Chess.js and Vitest in a runnable checkout; **NOT_EXECUTED in this connector-only environment**.

- Specific defensive reply feedback is revealed only after the learner makes
  a defender move on the board: a match shows the original position's authored
  `replyReason`, and P95 also shows its source-owned defensive misconception.
  Other legal defenses are described as departures, **not** objectively wrong.
  The focused 80-case regression checks that these source feedback fields exist.

## G2D: original advanced source-depth and verified defender options
- Audited all 39 original P94–P112 calculation JSON files: **684** source positions,
  **558 historical scored**, **126 original instructional-only**. Counts are from
  connected-source inspection, not a run of Chess.js across all 684.
- Original P103 scored studies include five *isolated queen's pawn*, five
  *hanging c/d-pawn*, and five *Carlsbad minority attack* boards. The Advanced
  skill pages now discover these by the source's exact theme. Every contextual
  drill stays **unscored** even if its original calculation problem is historically
  scored; native P103–P106 direct calculation remains scored.
- Source matching now relies on author-assigned category and theme, not a broad
  accidental match on a generic position title. Contextual studies are labelled
  as such; the original source skill IDs and model move remain unchanged.
- P103 and P105 both have verified source records that share a legal candidate
  move but document *multiple distinct opponent replies*. The existing P108
  board now presents those verified defender choices on demand and offers
  an in-place switch to a matching original alternative branch.
- `npm run source:qualification` is the focused executable 39-file/684-position
  Chess.js legality and 51 original Level 4–8 skill coverage test. It is **not
  executed** until a full, exact-head repo checkout with dependencies exists.

## October 2026: exact original source-depth inventory and genuine branch comparison

All 39 original calculation JSON files were inspected at this branch ancestry
(684 total source positions, 558 historical scored, 126 instructional-only).
These are **records**, not additional newly authored chess positions.
Original IDs/FENs, scores, review histories, Account and rights remain owned
by their established systems.

### Direct Advanced source-tag coverage BEFORE contextual discovery

These are counts of raw source-authored `skillIds`; one position may have
multiple skill IDs. **Zero means missing a direct skill tag, not that the
curriculum lesson, native endgame or related source study is absent.**

| Original Advanced skill | Direct source-tagged positions |
|---|---:|
| tactics.combinations | 0 |
| tactics.defensive-resources | 8 |
| calculation.branching | 60 |
| calculation.evaluation | 419 |
| strategy.imbalances | 0 |
| strategy.bishop-vs-knight | 0 |
| strategy.exchanges | 0 |
| strategy.restriction | 0 |
| strategy.coordination | 0 |
| pawns.iqp | 0 |
| pawns.hanging | 0 |
| pawns.minority | 0 |
| strategy.repertoire-middlegames | 0 |
| endgames.rook-checks | 20 |
| endgames.opposite-bishops | 5 |
| endgames.minor-piece | 38 |
| conversion.two-weaknesses | 0 |
| practical.complications | 0 |

Of the 18 Advanced skills, 12 have zero **raw direct** calculation tags;
the source-alignment step also provides some subject-justified tags for
already-unscored P109–P112 studies. This is why related source material
must be identified by its author-assigned **family and theme** and must
not silently become a new graded Advanced skill.

Actual original thematic playable material recovered in the native
Level 4–8 course includes, among others:
- P103: 5 IQP, 5 hanging-pawn, 5 Carlsbad-minority positions; plus pawn
  levers, doubled pawns and wing weaknesses.
- P104: 3 knight-outpost-versus-bishop and 3 knight-blockade cases;
  3 piece-harmony/exchange and 3 prophylaxis-before-expansion examples;
  multiple open-file rook families.
- P105: 45 original king-attack/forcing-resistance cases.
- P106: 48 original defensive-technique cases, including original rook,
  queen and knight exchange plans.
- P109–P112: 126 original *instructional-only* positional, prophylaxis,
  opening and endgame cases. They never become graded through related links.

Across the 684 raw source records, 142 have at least two distinct
documented defender responses after the SAME first move, counted from
original `principalVariation` and `defensiveStudy.variations` UCI
metadata. This static metadata count is **not a Chess.js PASS**.
The native P108 board now lets the learner enter such legal choices,
replay the matching source continuation, and compare up to three exact
two-ply resulting FEN positions side by side after playing independently.
Switching original branches preserves only the common verified move
prefix, without new grades, engine-best claims or durable writing.

### Executable source and acceptance gates (pending)
`npm run source:qualification` checks complete source count, original
legal replay, 51 skill discovery, original source classification,
side-specific counterplay and grading boundaries. `npm run deep:qualification`
focuses multi-ply source continuation, defender branches and history.
`npm run build` triggers the existing original build gates; original
desktop/phone Chromium paths remain pending, not PASSED.

No complete exact-head checkout/preview was available in this environment.
Do not equate authored Vitest tests or GitHub metadata inspection with
actual executable acceptance.
