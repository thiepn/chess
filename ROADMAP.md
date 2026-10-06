# Chess — Revised Product Roadmap after P25

## North star

Chess is a **learning-first personal coach**, not a general chess portal and not a training-planning dashboard.

The default experience should make the user meaningfully better with almost no study decisions:

```
Open app → know what matters → train it → understand why → transfer it to games
```

The product should optimize for:

1. learning quality;
2. retention;
3. real-game transfer;
4. explanation quality;
5. willingness to keep using the app;
6. speed from launch to useful practice.

It should not optimize for feature count, planning complexity, dashboards, streak pressure, or generic gamification.

## Audit after P25

### What is already strong

The adaptive backbone is unusually complete:

- typed curriculum and prerequisite graph;
- multidimensional mastery;
- spaced review;
- personal mistake bank;
- Lichess game import;
- local Stockfish analysis;
- opening recall and deviations;
- adaptive session composition;
- real-game transfer evidence;
- diagnosis → prescription → outcome loop;
- local-first persistence and account sync;
- interaction/motion/accessibility foundation.

This infrastructure should now be treated as **supporting machinery**, not the main product surface.

### Where the product is currently too shallow

#### 1. Lessons are too thin

All 68 curriculum skills currently use a two-step lesson template:

1. one explanation;
2. one required board move.

That is adequate for proving the lesson engine but not for mastery.

A strong lesson needs multiple examples, contrasting cases, misconception checks, guided practice, independent retrieval and transfer.

#### 2. Production puzzle practice is effectively absent

The deployed puzzle manifest currently contains zero generated production puzzles and falls back to six seed positions.

The ingestion pipeline is good, but the actual learner does not yet receive the large, varied practice corpus the architecture was designed for.

#### 3. Several training modes are only labels

Calculation, guided demo, endgame drill, conversion challenge, defense challenge and ordinary concept training ultimately fall back to the same generic LessonRunner unless they happen to route to a puzzle, game, opening, mistake or saved-study runner.

These need purpose-built interactions.

#### 4. Review explains too little

Game Review identifies useful moments and can replay them, but much of the teaching explanation is still heuristic/template-based.

The learner should be able to answer:

- What was I trying to do?
- What did I miss?
- Why does the better move work?
- What candidate should I have considered?
- What pattern should I recognize next time?
- Can I solve a related position now?

#### 5. Home hierarchy is backwards

P21–P25 now occupy a large amount of Home before the actual "Today's training" session.

This violates the original product contract: **what should I train now?**

Planning should mostly be invisible. Home should expose a decision, not a planning system.

#### 6. Practice breadth is still small

Current owned practice content includes:

- a narrow three-repertoire opening tree;
- five training-game scenarios;
- five reference studies;
- one master game reference;
- beginner-to-intermediate curriculum only.

The product has more intelligence than practice material.

## Decision on P21–P25

Do **not** delete them.

### Keep as quiet infrastructure

- **P21 weekly allocation** — useful in the background.
- **P22 adherence recalibration** — useful when enough history exists.
- **P23 load management** — keep conservative and optional.
- **P24 competition cycle** — useful for tournament periods, not default usage.
- **P25 event retrospective** — useful after real events, not a daily Home feature.

### UX rule

P21–P25 must not dominate Home.

Their controls and detailed diagnostics belong in:

- Progress;
- Goals / Plan;
- Competition mode;
- Advanced settings.

Home should show at most a compact explanation such as:

> 25 min · repair + calculation · based on two recent games

The user should not need to understand P21–P25 to train effectively.

## Revised roadmap

### P26 — Core Learning Experience Reset

**Status:** implemented.

**Purpose:** restore the product hierarchy before adding more capability.

Deliver:

- redesign Home around one primary **Train now** action;
- move detailed P21–P25 controls off the main path;
- keep only compact goal/progress context;
- make today's session visible above secondary analytics;
- remove internal phase labels such as “P21/P22” from user-facing UI;
- simplify navigation around Learn / Train / Play / Review / Library / Progress;
- audit every first-run and return-user path;
- ensure one tap from Home starts useful training.

Acceptance:

- a returning user can launch the recommended session without reading planning controls;
- Home explains *why* the session was chosen in one short line;
- competition planning is invisible unless explicitly enabled.

### P27 — Production Puzzle Corpus & Tactical Practice 2.0

**Status:** implemented.

**Purpose:** turn the puzzle architecture into a real training system.

Deliver:

- build and deploy a curated Lichess puzzle corpus rather than a zero-record manifest;
- guarantee meaningful puzzle coverage for all honestly puzzle-compatible skills;
- rating-balanced and motif-balanced selection;
- themed and mixed queues;
- personal-game puzzle priority;
- robust repeat avoidance and spaced returns;
- post-solve explanation: motif, tactical point, why alternatives fail;
- optional engine verification after the solve;
- corpus health/coverage audit in CI.

Do not add puzzle streak pressure or Puzzle-Rush-style gamification as the default.

Acceptance:

- no ordinary supported skill depends on the six seed puzzles in production;
- repeated sessions surface genuinely different positions;
- puzzle practice is deep enough to serve as a primary daily training mode.

### P28 — Lesson Engine 2.0 & Curriculum Depth

**Status:** implemented.

**Purpose:** make lessons teach rather than merely introduce.

Replace the universal two-step template with lesson scripts that can contain:

1. concept model;
2. guided example;
3. contrasting/non-example;
4. misconception check;
5. supported board exercise;
6. independent retrieval;
7. transfer position;
8. concise takeaway.

Deliver:

- multiple authored positions per important skill;
- escalating hints rather than immediately revealing origin/destination;
- alternative accepted moves where the concept allows them;
- explanations for wrong moves;
- lesson-level mastery evidence separated from mere completion;
- strong content QA for legality, uniqueness and instructional purpose.

Prioritize fundamentals, tactical vision, calculation and essential endgames before expanding breadth.

### P29 — Dedicated Calculation Trainer

**Status:** implemented.

**Purpose:** make calculation a real skill rather than a lesson label.

Deliver:

- candidate-move entry before calculation;
- visualization mode with optional hidden board / future-position reconstruction;
- multi-move line calculation;
- forcing-line and quiet-move exercises;
- compare expected opponent reply with actual best defense;
- scoring for line depth, correctness and candidate quality;
- calculation positions from the user’s own games;
- retry later from the original position.

This becomes a first-class runner, not LessonRunner fallback.

### P30 — Game Review 2.0: Understand, Retry, Transfer

**Status:** implemented.

**Purpose:** turn engine review into coaching.

Preferred flow:

1. learner marks what they were thinking / identifies critical moment;
2. retry the position before seeing the answer;
3. show better candidates;
4. explain the tactical/positional reason;
5. reveal a short engine line only as evidence;
6. immediately test the same idea in a related position;
7. schedule only the lesson worth retaining.

Deliver:

- self-analysis-first mode;
- Retry / Hint / Best / Show continuation;
- richer position-specific explanation;
- move-time context when PGN clock data exists;
- opening-repertoire deviation explanation;
- distinguish tactical miss, calculation failure, strategic plan error, time-management error and execution error more reliably;
- one-click related practice.

### P31 — Endgame & Technique Trainer

**Status:** implemented.

**Purpose:** build repeatable practical endgame competence.

Deliver dedicated runners for:

- basic mates;
- king-and-pawn endings;
- pawn races;
- Lucena / Philidor;
- rook activity;
- conversion;
- defense.

Use play-out positions against resistance, not one-move lesson completions.

Track:

- theoretical recognition;
- execution;
- repeated conversion;
- defensive hold rate;
- delayed retention.

### P32 — Personal Repertoire 2.0

**Purpose:** make openings useful without turning the app into memorization software.

Deliver:

- deeper but still compact personal repertoire;
- plans, structures and typical tactics attached to positions;
- deviations from the user’s own games;
- spaced key-move recall;
- optional full-line rehearsal;
- “why this move?” concept checks;
- repertoire health view based on actual games;
- practice from the exact branch the user forgot.

Avoid giant theory trees.

### P33 — Model Games & Strategic Pattern Learning

**Purpose:** teach strategy from complete games rather than isolated prose.

Deliver:

- curated annotated model-game library;
- games mapped to curriculum concepts;
- Guess the Move checkpoints;
- pause-before-reveal questions;
- plans and turning points;
- recurring structures from the user’s repertoire;
- save a model position directly into training.

Start with a compact, high-quality collection rather than hundreds of unannotated games.

### P34 — Adaptive Coach Simplification

**Purpose:** use the existing intelligence better instead of adding more intelligence.

Deliver:

- consolidate P13–P25 outputs into a small number of actionable coach decisions;
- reduce duplicate scores and dashboards;
- explicitly track whether recommended activities improve real-game behavior;
- improve cold-start behavior;
- confidence-aware “I don’t know yet” states;
- explain recommendations in plain chess language rather than model terminology.

No new planning layer should be introduced here.

### P35 — Advanced Curriculum Expansion

**Purpose:** grow beyond the current beginner-to-intermediate ceiling only after the existing course is deep.

Candidate areas:

- tactical combinations and defensive tactics;
- deeper calculation;
- positional imbalances;
- pawn structures;
- prophylaxis and restriction;
- exchanges and transformations;
- piece coordination;
- practical rook endings;
- opposite-colored bishops;
- minor-piece endings;
- advanced conversion/defense;
- repertoire-specific middlegames.

Expansion must reuse the richer P28–P33 teaching modes.

### P36 — Premium UX, Mobile & Delight Pass

**Purpose:** reach the inviting quality bar that motivated the product.

Deliver:

- board-first responsive layouts;
- faster route to training;
- polished transitions and microinteractions;
- compact celebratory feedback for meaningful learning milestones;
- better visual hierarchy;
- touch ergonomics;
- mobile/landscape refinement;
- keyboard and screen-reader acceptance;
- loading/performance budgets;
- consistent visual language across lesson, puzzle, game review and analysis.

The target is inviting and polished like Chess.com, while remaining calmer and more learning-focused rather than over-gamified.

### P37 — Real-Use Qualification & Defect-Only Hardening

**Purpose:** stop adding features and use the app as a learner.

Run repeated real workflows:

- open → Train now;
- Learn → Practice;
- play human game → import/sync → review → retry → retrain;
- opening deviation → recall;
- mistake → spaced return;
- endgame drill → later retention;
- week of ordinary use on desktop and mobile.

Fix friction, weak explanations, bad recommendations, repetitive content and interaction defects.

Do not add another analytics subsystem during this phase.

## Product-priority order from now on

When deciding between features, prefer:

```
better exercise
> better explanation
> better transfer to real games
> more useful content
> simpler UX
> better personalization
> more analytics
> more planning
```

Planning is now deliberately last.

## Explicitly cancelled / deferred

Do not build these next:

- cross-cycle competition memory;
- longitudinal tournament comparison dashboards;
- additional periodization algorithms;
- more load/fatigue heuristics;
- another planning score;
- social/community systems;
- proprietary multiplayer;
- generic AI chat bolted onto the product.

They may be reconsidered only after P27–P37 prove the core learning experience is strong.
