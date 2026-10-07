# Chess — Product Roadmap after P36 Visual Reset

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

**Status:** implemented.

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

**Status:** implemented.

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

**Status:** implemented.

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

**Status:** implemented.

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

**Status:** implemented.

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

### P37 — Visual Architecture Lock

**Status:** implemented.

**Purpose:** lock the post-P36 chess-specific visual direction before rebuilding page architecture.

Deliver:

- authoritative `DESIGN_SYSTEM_V2.md`;
- namespaced `--chess-*` tokens that do not repaint the legacy shell prematurely;
- Train as the future default route;
- five primary route-level destinations: Train / Learn / Play / Review / Library;
- Progress and Settings as secondary destinations;
- explicit ban on giant sentence heroes, generic permanent sidebars and modal-only primary workflows;
- page identities for training room, interactive chess book, tournament board, analysis desk, study archive and player-development record;
- board-first sizing, color, typography, shape, motion and accessibility contracts;
- executable architecture invariants in tests.

Acceptance:

- future phases can implement screens without inventing visual rules;
- legacy P0–P36 product logic remains untouched;
- tokens are available to code but legacy variables remain unmapped until migration;
- the design contract explicitly prevents a cosmetic-only reskin of the current dashboard.

### P38 — Real Routing & App Shell

**Status:** implemented.

Replace pseudo-routing and the permanent SaaS sidebar with route-level pages, a compact desktop top bar and mobile bottom navigation. Train becomes the default destination.

Delivered:

- URL-backed History API routing for Train / Learn / Play / Review / Library / Progress / Settings;
- automatic `/` → `/train` canonicalization and unknown-route fallback;
- browser Back / Forward synchronization;
- nested route-family preservation so later phases can own lesson/game/repertoire detail URLs without another shell rewrite;
- GitHub Pages 404 restoration for direct deep links;
- compact graphite desktop top bar replacing the 220px permanent sidebar;
- five-destination mobile bottom navigation;
- Progress demoted to a secondary top-bar action;
- existing route chunks continue to preload on navigation intent;
- dialog focus-inert behavior migrated from the old sidebar to the new top bar/main/mobile shell.

Compatibility boundary:

- top-level product destinations are now genuine pages;
- P36 training/assessment/model-game runners remain compatibility overlays until P40–P41 reconstruct Train and migrate the runtimes into full-page workspaces;
- P38 does not cosmetically redesign the page interiors ahead of their dedicated phases.

### P39 — Board Design System 2.0

Replace Unicode pieces with a proper SVG set, migrate to the locked ivory/graphite board palette, standardize move/check/teaching semantics and preserve P36 keyboard/screen-reader behavior.

### P40 — Train Page Reconstruction

Remove the dashboard-like Train home and replace it with a training rail + dominant board + contextual coaching workspace.

### P41 — Train Runtime Migration

Move lessons, puzzles, calculation, endgames, opening recall, personal mistakes, saved studies and assessments into the route-level Train workspace.

### P42 — Learn Architecture Redesign

Turn Learn into an interactive chess textbook with curriculum navigation, teaching board and lesson content rather than course-dashboard cards.

### P43 — Play Page Redesign

Make Play a genuine chess playing surface with board, clocks, notation and compact pre-game configuration.

### P44 — Review Page Redesign

Build a serious board + notation + critical-moment analysis workstation around the existing self-analysis-first P30 behavior.

### P45 — Library Page Redesign

Build route-level repertoire, model-game, saved-position, endgame, game and study workspaces.

### P46 — Progress Page Reconstruction

Move the analytics-heavy material where it belongs: a chess-specific player-development record rather than the default product surface.

### P47 — Visual Identity & Typography

Introduce the Chess mark, restrained editorial typography and recognizable product identity without reviving marketing-style hero composition.

### P48 — Material & Component Cleanup

Remove legacy card/panel/hero defaults, reduce excessive rounding/shadows and migrate surfaces to rails, lists, separators, notation regions and board-side tools.

### P49 — Motion & Tactile Interaction

Center motion on chess actions: piece movement, capture, castling, promotion, board flip, solution reveal and analysis transitions.

### P50 — Mobile-Native Rebuild

Qualify each primary route as a native mobile composition rather than stacked desktop UI.

### P51 — Tablet & Large-Desktop Composition

Tune board/context composition for landscape tablets, portrait tablets, 1440p+ and ultrawide screens without dashboard stretching.

### P52 — Accessibility Requalification

Re-test keyboard navigation, screen readers, focus, reduced motion, touch targets and color-independent board semantics after the structural migration.

### P53 — Theme & Board Customization

Add a small high-quality set of board/piece options only after the default experience is visually strong.

### P54 — Visual Content Pass

Remove placeholder copy, internal jargon, generic icons, duplicate labels and any remaining SaaS-style motivational language.

### P55 — Cross-Page Workflow Integration

Verify Review → Train, Learn → Train, Library → Train and Play → Review as real routed workflows with preserved context.

### P56 — Performance & Route Optimization

Lazy-load real routes, preload likely destinations, cache piece assets, optimize long lists and preserve the P36 production budgets.

### P57 — Visual Regression Suite

Capture deterministic desktop/mobile states for Train, Learn, Play, Review, Library and Progress to prevent design drift.

### P58 — Real-Device UX Qualification

Use the rebuilt app through real training, play and review sessions on phones, tablets, laptops and desktops.

### P59 — Visual QA Against Locked Design

Score the implementation against the P37 design contract and repair any category below the release target.

### P60 — Defect-Only Release Candidate

Freeze features. Only defects, accessibility, responsive, performance, copy and persistence/routing fixes are allowed before V1.0.

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

Do not build these during the visual migration:

- cross-cycle competition memory;
- longitudinal tournament comparison dashboards;
- additional periodization algorithms;
- more load/fatigue heuristics;
- another planning score;
- social/community systems;
- proprietary multiplayer;
- generic AI chat bolted onto the product.

They may be reconsidered only after P27–P37 prove the core learning experience is strong.
