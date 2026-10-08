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

**Status:** implemented.

Replace Unicode pieces with a proper SVG set, migrate to the locked ivory/graphite board palette, standardize move/check/teaching semantics and preserve P36 keyboard/screen-reader behavior.

Delivered:

- custom deterministic SVG Staunton-inspired piece family for king, queen, rook, bishop, knight and pawn;
- identical geometry across platforms instead of operating-system Unicode chess glyphs;
- warm ivory / graphite board palette from the P37 token contract;
- restrained integrated coordinates;
- blue selection and last-move semantics;
- green correct, gold teaching/hint and red danger/check semantics;
- legal-move dot and capture-ring targets;
- red perimeter check cue instead of flooding the king square;
- distinct move, capture, promotion, castling and orientation-flip motion;
- reduced-motion suppression for all new animation;
- retained roving keyboard navigation, square announcements, legal-target counts and check announcements;
- regression coverage ensuring SVG pieces replace Unicode glyph output.

### P40 — Train Page Reconstruction

**Status:** implemented.

Remove the dashboard-like Train home and replace it with a training rail + dominant board + contextual coaching workspace.

Delivered:

- removed the giant Recommended-now hero and motivational headline pattern;
- removed the Train-page KPI/card stack, plan strip, course metric card and standalone coach card;
- converted the adaptive session into a narrow, directly selectable training queue;
- retained Quick / Standard / Deep session duration as compact controls rather than dashboard tabs;
- added a large P39 board preview as the visual center of the page;
- preview selection follows the actual adaptive queue and can launch the exact queued activity;
- moved activity title, explanation and primary action into a restrained board-adjacent coaching rail;
- retained course stage, focus and goal as compact contextual facts rather than headline metrics;
- made placement diagnostic an optional subordinate action;
- added responsive composition: three-zone desktop, two-zone compact desktop, horizontal queue + board-first mobile;
- preserved P36 training runners as compatibility overlays until P41.

### P41 — Train Runtime Migration

**Status:** implemented.

Move lessons, puzzles, calculation, endgames, opening recall, personal mistakes, saved studies and assessments into the route-level Train workspace.

Delivered:

- `/train/session/:id` is now the real host for training activity runtimes;
- removed the legacy full-screen `training-overlay` / modal host from App;
- migrated LessonRunner, PuzzleRunner, CalculationRunner, EndgameTechniqueRunner, OpeningTrainer, PersonalMistakeRunner and SavedStudyTrainer into the route-level workspace;
- migrated placement and stage-checkpoint AssessmentRunner into the same page architecture;
- migrated ModelGameRunner out of its modal host as well;
- adaptive-session completion advances to the next queued activity by changing the session URL;
- focused/manual training returns to the page that launched it (Learn, Review, Library, Progress or Train);
- cancellation/escape exits through route navigation rather than dialog teardown;
- training runtime state is session-scoped and refresh-restorable;
- direct adaptive session URLs can recover the matching activity from the current composed session;
- mobile primary navigation hides during an active training workspace while the real page remains browser-history aware;
- retained existing learning, Stockfish, scoring, persistence and accessibility logic rather than rewriting mature runners.

### P42 — Learn Architecture Redesign

**Status:** implemented.

Turn Learn into an interactive chess textbook with curriculum navigation, teaching board and lesson content rather than course-dashboard cards.

Delivered:

- removed the giant Learn hero, course KPI overview, placement card, repertoire card, model-game card and rounded skill-card grid from the curriculum root;
- rebuilt `/learn` as a syllabus with a persistent chapter rail and compact stage progression;
- stage content is now presented as a structured list of chess concepts rather than promotional cards;
- stage checkpoint, mastery, retention and transfer evidence remain available as subordinate learning context;
- placement is reduced to an optional inline diagnostic action;
- concepts open on real `/learn/:domain/:lessonId` pages;
- concept pages render the lesson script as an interactive textbook: step outline, embedded P39 board, editorial explanation and guided navigation;
- Begin lesson / Practice hands off into the P41 routed training runtime instead of opening a Learn modal;
- `/learn/openings` and `/learn/model-games` are real subpages rather than local `learnMode` state;
- removed giant hero treatment from repertoire and model-game subpages;
- added explicit Learn route parsing/building with regression tests;
- mobile uses horizontally scrollable chapter/lesson rails with board-first lesson pages.

### P43 — Play Page Redesign

**Status:** implemented.

Make Play a genuine chess playing surface with board, clocks, notation and compact pre-game configuration.

Delivered:

- removed the Play hero, large normal-game promo card, AI profile card grid and scenario-card grid;
- rebuilt `/play` as a compact setup desk with board preview, color, time control and opponent controls;
- normal games support Untimed, 10+0 and 15+10 training clocks;
- targeted scenarios remain untimed by default so the training objective stays primary;
- scenarios are presented as a dense selectable position list rather than promotional cards;
- active games use real `/play/game/:id` URLs with stable standard/scenario session keys;
- standard and built-in scenario routes can reconstruct their setup from the URL;
- dynamically generated Review replay positions persist a session-scoped snapshot and fail safely when that snapshot is unavailable;
- active games use the P39 board with player strips, live clocks, move notation, objective context and result transfer;
- mobile bottom navigation hides during an active game so the board becomes the temporary primary surface;
- Review-origin replay positions and prescription scenarios return cleanly to Play without modal state;
- retained Stockfish opponent logic, PGN creation, Review ingestion, scenario scoring and experience feedback.

### P44 — Review Page Redesign

**Status:** implemented.

Build a serious board + notation + critical-moment analysis workstation around the existing self-analysis-first P30 behavior.

Delivered:

- `/review` is now a game-analysis index rather than a hero/dashboard;
- game history is a compact review rail with direct routed entry into analyzed games;
- PGN/Lichess import is a focused analysis desk rather than a promotional card;
- unresolved mistakes are presented as a repair queue rather than a card grid;
- analyzed games open on real `/review/:gameId` URLs;
- unstructured stored games can be upgraded in-place to the visual review;
- detailed review now uses one persistent workstation: board, notation, critical-moment teaching and evaluation trace;
- removed the story hero, phase-card grid, separate move-timeline section and separate story-card strip;
- game phases are compact navigation, not headline content;
- move notation and critical moments remain synchronized with the board;
- selected moments still preserve self-analysis-before-reveal, replay, repair, retention and transfer logic;
- added compact clickable critical-moment evaluation trace;
- mobile uses board-first review, then bounded notation, then teaching context;
- Review route parsing/building is covered by regression tests.

### P45 — Library Page Redesign

**Status:** implemented.

Build route-level repertoire, model-game, saved-position, endgame, game and study workspaces.

Delivered:

- removed the Library hero, metric strip, local workspace/saved/reference/game tabs and card-grid navigation;
- rebuilt `/library` as a chess study archive with collection rail, recent studies, study-system links, recent games and contextual recall queue;
- added real collection pages at `/library/studies`, `/library/positions`, `/library/endgames` and `/library/games`;
- added `/library/workspace` as the canonical new-analysis-board route;
- saved studies open on real `/library/studies/:id` workspace pages;
- reference positions and reference games open on real `/library/references/:id` workspace pages;
- played/imported games open on real `/library/games/:id` study workspaces;
- deep-linked resources hydrate directly into the existing analysis-board engine, notation, notes, tags and save/train logic;
- endgame and position collections combine personal material with the curated reference shelf without duplicating data;
- Repertoire and Model Games are first-class Library destinations but retain their canonical P42 routes (`/learn/openings` and `/learn/model-games`) instead of creating competing duplicate workspaces;
- saving a new analysis promotes `/library/workspace` into the saved study's routed page;
- recall-due studies can launch directly into the P41 training runtime;
- mobile uses a horizontal archive rail and board-first resource workspace;
- Library-specific redesign CSS is lazy-loaded with the Library route.

### P46 — Progress Page Reconstruction

**Status:** implemented.

Move the analytics-heavy material where it belongs: a chess-specific player-development record rather than the default product surface.

Delivered:

- removed the giant Progress hero and equal-weight KPI/dashboard panel stack;
- practical strength is now the primary player record, with rating, confidence, human-game sample and consistency;
- the 8-week mastery / retention / transfer trajectory is the dominant quantitative visualization;
- mastery, retention, transfer and calibration remain visible as a compact development strip rather than standalone cards;
- curriculum certification is presented as a stage-velocity record;
- improving and weak-transfer skills are compact actionable rows with direct Train actions;
- coach prescriptions are integrated beside development evidence rather than living in a separate dashboard section;
- human-game transfer has a dedicated chess-specific section with baseline quality, phase performance, opening cohorts, playing-condition cohorts and recurring mistake families;
- training plan, load management, recovery and competition controls are preserved inside an expandable planning section;
- event retrospective editing remains available inside the competition cycle rather than occupying the primary analytics surface;
- calibration, intervention outcomes, coach effectiveness and longitudinal history are preserved inside an expandable evidence/model-diagnostics section;
- Progress-specific redesign CSS is lazy-loaded with the Progress route;
- mobile collapses the record into practical strength → trajectory → stage/skills → real games, with horizontal stage navigation and no giant analytics cards.

### P47 — Mobile / Tablet Native Layouts

**Status:** implemented.

Qualify the rebuilt application as deliberate phone and tablet compositions rather than stacked desktop UI.

Delivered:

- enabled `viewport-fit=cover` and safe-area-aware top/bottom chrome for installed/mobile use;
- added coarse-pointer minimum-target rules across primary interactive surfaces;
- added a distinct portrait-tablet mode for Train, Learn, Play, Review, Library and Progress;
- added landscape-tablet tuning that preserves board + context side-by-side where that is the natural chess interaction;
- rebuilt low-height phone landscape for active Train, Play, Review and Library workspaces so board + context share the viewport instead of forcing vertical scroll;
- active training and games can suppress global chrome in constrained landscape while preserving route-local exit controls;
- Train uses horizontal session queues on touch devices, bounded boards and safe-area-aware sticky actions;
- Learn uses touch-scrollable chapter/lesson rails, board-first portrait lessons and split board/reading landscape lessons;
- Play uses a portrait board-first setup flow, touch-sized controls and tournament-style landscape active games;
- Review uses board-first portrait analysis with bounded notation and a three-pane landscape workstation where space permits;
- Library uses sticky/horizontal archive navigation, portrait board-first analysis and split landscape analysis controls;
- Progress uses a tablet-native player record layout, horizontal stage record and touch-safe expandable planning/evidence sections;
- route-specific P47 CSS remains lazy-loaded for Learn, Play, Review, Library and Progress; only the default Train/shell native rules are part of the initial app chunk;
- device targets and acceptance expectations are recorded in `docs/P47_DEVICE_MATRIX.md`.

### P48 — Material & Component Cleanup

**Status:** implemented.

Remove legacy card/panel/hero defaults, reduce excessive rounding/shadows and migrate surfaces to rails, lists, separators, notation regions and board-side tools.

Delivered:

- removed dead pre-redesign curriculum, review, analytics and planning CSS blocks from the initial stylesheet;
- deleted roughly 66 KB of raw legacy CSS instead of stacking new overrides indefinitely;
- established a final flat material layer in `src/styles/p48-material.css`;
- primary actions are now flat functional blue with no glow/elevation treatment;
- secondary controls use graphite/transparent surfaces and thin separators;
- instructional hints use compact semantic edge markers rather than rounded cards;
- active analysis/review status messages use flat rails with semantic borders;
- Game, Assessment, Endgame, Model Game and Opening side tools use board-side separator regions instead of floating panels;
- Game opponent/result context is flattened into notation/workspace sections;
- Lichess connection UI is a restrained connected-service region rather than a gradient card;
- active Model Game collection entries are flattened into archive-style rows;
- legitimate popovers/dialogs remain raised surfaces, but use restrained graphite material and the P37 radius tokens;
- mobile board-side regions switch from vertical separators to horizontal separators;
- added `npm run design:audit` and made it part of the Quality workflow;
- the material audit blocks gradients / oversized radii in rebuilt route CSS and prevents deprecated hero/card surface classes from returning to active TSX;
- recorded the P48 contract in `docs/P48_MATERIAL_CONTRACT.md`.

### P49 — Motion & Tactile Interaction

**Status:** implemented.

Center motion on chess actions: piece movement, capture, castling, promotion, board flip, solution reveal and analysis transitions.

Delivered:

- added reduced-motion-safe route transitions using the browser View Transition API with a synchronous fallback;
- extended board state with explicit move-origin and move-destination impact classes;
- added distinct move, capture, promotion and castling arrival motion;
- added separate capture / promotion / castling destination impact treatments;
- kept check, legal-target and rejected-move feedback visually distinct;
- added dedicated tactile feedback events for castling, promotion and answer/hint reveal;
- added sound and haptic signatures for those events without making sound mandatory;
- lesson hints and coached best-move reveal now emit subtle reveal feedback;
- solution, explanation, analysis-result and review-comparison regions use short semantic reveal motion;
- Review notation, phase selection and Library move-line selection use compact settle transitions;
- Progress trajectory, phase bars and weekly allocation animate measured change rather than decorative containers;
- touch devices receive compact press feedback in addition to optional haptics;
- optional celebration particles are restyled as restrained chess-colored sparks rather than generic rainbow confetti;
- reduced-motion disables route, board-impact, reveal, chart and tactile animation while keeping state changes immediate;
- added `npm run motion:audit` and made it part of the Quality workflow;
- documented the motion contract in `docs/P49_MOTION_CONTRACT.md`.

### P50 — Mobile Native Defect Pass

**Status:** implemented.

P47 absorbed the planned mobile-native rebuild. P50 is the defect-only follow-up after material and motion work.

Delivered:

- centralized phone topbar height, bottom-nav safe height, native gutter and safe horizontal inset tokens;
- removed route-specific 50px/52px safe-area offset duplication;
- fixed phone sticky/full-bleed bars that used hard-coded -12px margins while the actual narrow-phone gutter could be 10px;
- Play sticky start actions now align to asymmetric left/right safe-area gutters;
- Review and Library sticky workspace headers now align to the same safe gutters;
- general mobile topbar and app content now respect left/right display-cutout safe areas as well as top/bottom insets;
- restored the Review story-preview control to the 44px touch minimum;
- made compact Learn open/practice actions explicitly use the touch minimum;
- constrained-landscape Learn, Review and Library workspaces suppress bottom navigation so board/context content is not covered by fixed navigation;
- constrained-landscape Learn, Review, Library and active Train/Play workspaces respect horizontal notch safe areas;
- added a dedicated <=720px Review landscape fallback using board-left + notation/insight-right instead of the overflowing three-column workstation;
- preserved P47 desktop/tablet composition outside the defect breakpoints;
- added `npm run mobile:audit` and made it part of the Quality workflow;
- recorded the defect inventory and verification limits in `docs/P50_MOBILE_QUALIFICATION.md`.

Physical-device/browser inspection is still a release-qualification activity; P50 does not claim physical-device testing where no device/browser automation was available.

### P51 — Large-Desktop Composition

**Status:** implemented.

P47 absorbed the tablet portion. Tune 1440p+, ultrawide and unusually tall desktop compositions without dashboard stretching.

Delivered:

- added explicit large-desktop composition rules beginning at 1536px;
- added separate ultrawide composition rules at 1920px+;
- introduced bounded large-screen tokens for workspace width, analysis width, rail width, context width, reading measure and board caps;
- Train uses additional width for a stable session rail, larger board lane and coach context instead of larger gaps;
- tall Train runtimes can grow the board up to 48rem while remaining viewport-bounded;
- Learn keeps chapter prose bounded and uses large width primarily for the curriculum rail + board + reading composition;
- Play setup and active games gain a wider board lane and stable 360–380px setup/context pane;
- Review analysis uses a bounded large board, fixed notation lane and stable teaching-insight pane;
- Library analysis uses a bounded board lane plus a stable analysis/editor column while archive pages retain readable collection widths;
- Progress expands quantitative space while keeping explanatory prose bounded;
- 1920px+ rules center fixed-quality chess workspaces rather than stretching columns across the entire monitor;
- P51 route CSS remains code-split with the corresponding Learn/Play/Review/Library/Progress routes; only Train loads with the default app;
- added `npm run desktop:audit` and made it part of the Quality workflow;
- added all P51 CSS files to the P48 material audit;
- documented the large-screen policy in `docs/P51_LARGE_DESKTOP.md`.

### P52 — Accessibility Requalification

**Status:** implemented.

Re-test keyboard navigation, screen readers, focus, reduced motion, touch targets and color-independent board semantics after the structural migration.

Delivered:

- added a keyboard-visible skip link to the main content landmark;
- route changes now update the document title and restore programmatic focus to the main landmark without forcing scroll;
- the interaction-settings popover now exposes dialog ownership via `aria-controls`, `aria-haspopup="dialog"` and `aria-labelledby`, and moves focus into its controls when opened;
- coached Review modal now traps Tab, closes on Escape and restores focus to the invoking control;
- board instructions are explicitly associated with the chess grid;
- board live announcements now expose selection, legal-target count, check, last-move origin/destination, capture, promotion, castling and instructional arrows;
- board square accessible names now include legal capture/move target, check, last-move and semantic highlight information rather than relying on color;
- board grid exposes row/column counts while preserving roving-tabindex keyboard navigation;
- lesson, puzzle, opening, endgame, calculation and assessment feedback/results now use status/alert semantics where appropriate;
- Endgame recognition and Review/Play selection controls expose pressed/current state programmatically;
- Assessment and Review analysis progress expose progressbar semantics and numeric values;
- Library favorites expose pressed state and workspace notation exposes the current move via `aria-current="step"`;
- Game clocks expose timer labels without live-region countdown spam;
- Lichess username input now has an accessible name and sync/error feedback is announced;
- added final focus-ring protection for links and controls, including components whose legacy CSS still resets native outlines;
- added `prefers-contrast: more` and Windows forced-colors handling for focus, board selection, legal targets and critical markers;
- P52 retains the existing reduced-motion, 44px touch-target and safe-area contracts from P47–P50;
- added `npm run a11y:audit` and made it part of the Quality workflow;
- documented the qualification scope in `docs/P52_ACCESSIBILITY.md`.

Automated/static requalification does not claim manual NVDA, JAWS, VoiceOver, TalkBack or switch-control testing where those assistive-technology environments were not available.

### P53 — Theme & Board Customization

**Status:** implemented.

Add a small high-quality set of board/piece options only after the default experience is visually strong.

Delivered:

- added three curated dark app finishes: Graphite, Obsidian and Warm graphite;
- added three board palettes: Tournament, Walnut and Slate;
- added three piece treatments: Classic, Club and Minimal;
- kept blue/correct/error/concept semantic colors non-customizable so training/review meaning remains stable;
- added persistent `appTheme`, `boardTheme` and `pieceStyle` fields to the existing experience settings;
- normalized pre-P53 and invalid persisted settings back to safe defaults;
- applied theme state through root data attributes so every route and board receives the same customization;
- applied piece style to both full chessboards and the Play player marker;
- expanded the Experience dialog with accessible pressed-state selectors, visual swatches and an appearance-only reset;
- app finishes also map legacy neutral surface variables so older secondary components do not visually detach from the selected finish;
- customization CSS loads before the P52 accessibility layer so focus/forced-colors rules remain authoritative;
- added `npm run theme:audit` and dedicated Vitest coverage for option sets, backward-compatible normalization and invalid saved values;
- added P53 CSS to the material audit;
- documented the customization contract in `docs/P53_CUSTOMIZATION.md`.

### P54 — Visual Content Pass

**Status:** implemented.

Remove placeholder copy, internal jargon, generic icons, duplicate labels and any remaining SaaS-style motivational language.

Delivered:

- removed self-referential product language such as “dashboard” from Play;
- translated Train source labels from implementation terms into player-facing reasons such as From your games, Needs practice, Course and Checkpoint follow-up;
- replaced adaptive/diagnostic/repair phrasing in Train with session, placement check, revisit and practice language;
- simplified Learn checkpoint and placement copy while keeping the underlying stage-gate calculations unchanged;
- renamed Progress presentation metrics from Mastery / Retention / Transfer / Calibration to Skill level / Recall / In games / Estimate match;
- translated Progress model vocabulary such as evidence, interventions, coach readout and real-game transfer into tracked results, training methods, training focus and how training shows up;
- rewrote the advanced Progress detail panel as “How progress is estimated” rather than exposing model-diagnostic language;
- replaced Review repair-queue language with Practice again / positions to revisit;
- rewrote Review import/reanalysis copy around concrete actions: analyze, inspect critical moments, save positions;
- simplified opening-repertoire terms such as recall evidence, live branch and deviation-rate presentation;
- removed internal version wording such as “P8 story” from game review;
- removed mastery/recognition-evidence language from puzzle and lesson success feedback;
- rewrote placement/stage-check summaries so they explain course effects without referencing player models, certification evidence or adaptive training;
- replaced generic BrainCircuit, Gamepad2 and decorative Sparkles icons on chess surfaces with Target, Swords, Search, CheckCircle and other action-specific symbols;
- kept Sparkles only where it literally represents the optional Celebrations setting;
- updated Library “train” actions to “practice” where the action is recalling a saved position;
- added `npm run content:audit` and made it part of the Quality workflow;
- documented the copy/icon rules in `docs/P54_VISUAL_CONTENT.md`.

Internal model/type names remain unchanged when they are not user-visible. P54 is a presentation-language pass, not an analytics architecture rewrite.

### P55 — Cross-Page Workflow Integration

**Status:** implemented; browser/device qualification continues in P58.

- Completed games offer a direct action opening the exact saved Review game, with a manual-analysis fallback.
- Play → Review uses route replacement to prevent Back from restarting finished games.
- Review → Play replay keeps its exact originating game route in the session snapshot, including after refresh.
- Progress → Play prescription scenarios return to Progress; stale or external origins fall back to Play.
- Training games can open their saved game in Review from the completed activity.
- Existing Learn / Review / Library → Train return-to-origin behavior is preserved.
- Route tests cover encoded identifiers and safe origin restoration.

### P56 — Performance & Route Optimization

**Status:** implemented (automated production gates; device measurements remain P58).

- Split nine training-only React runners into individually lazy-loaded chunks; GameArena loads on demand for both Train and Play, and GameStoryView loads on demand for Review game details.
- Keep the default Train queue and board preview immediately accessible without loading every exercise runtime.
- Opportunistically preload one likely next top-level route after 2.4 seconds on stable connections, while respecting data-saver, slow connections and background tabs.
- Memoize static SVG chess pieces to avoid re-rendering unmodified geometry during board updates.
- Bound Review and Library history rendering to 40 visible rows, with accessible Show more controls and collection/search resets.
- Reuse memoized game ordering in Library rather than sorting game history repeatedly.
- Add a Vite manifest-based production audit for dynamically loaded training runners; preserve existing JS/CSS compressed-size budgets.
- Add progression-window regression tests.

Full real-device perceived-load measurements and visual behavior remain P58 release qualification.

### P57 — Visual Regression Suite

**Status: complete.** Deterministic Playwright browser capture and approved PNG snapshots for desktop and mobile. The Visual Regression CI workflow compares images on every pull request and main-branch push; screenshots, diffs and traces are retained as build artifacts on failures.

- Locked primary screen matrix: Train, Learn, Play, Review, Library, Progress at 1440×900 desktop and 393×852 phone.
- Deeper representative workspaces: lesson detail, reviewed game analysis, and saved study workspace at both sizes.
- Pinned Chromium/Playwright on Ubuntu 24.04, reduced motion, fixed clock and fixture state, fixed device scale and locale.
- Unapproved visual changes fail the separate CI check; updating baselines is a conscious reviewed change.
- Coverage is intentionally visual and structural, not a substitute for P58 physical-device qualification.
- P57's first screenshots exposed and drove repair of an actual mobile Play grid blowout; the browser test now checks board visibility and horizontal overflow.

Baseline status is verified by the screenshot comparison workflow and committed snapshot files.

### P58 — Real-Device UX Qualification

**Status: automated cross-device prequalification implemented; physical-device sign-off remains pending.**

- Playwright browser journey testing on compact Android-sized phone, standard Android phone, tablet portrait, tablet landscape, desktop and mobile Safari-like WebKit.
- Route visibility, horizontal overflow and safe scrolling on Train, Learn, Play, Review, Library, Progress and representative deep workspaces.
- Keyboard navigation, browser Back/Forward, Play → game → exit, Train → activity → exit and saved Review/Library reopening.
- Phone touch-target and sticky-start-action checks, plus per-route elapsed-time evidence emitted as CI artifacts.
- P58 uncovered and corrected portrait-tablet root horizontal overflow missed by a naive window.innerWidth check.
- Fixed local data and time; browser-matrix results cannot be presented as actual physical-device qualification.
- Hardware acceptance checklist and explicit sign-off gate in `docs/P58_DEVICE_QUALIFICATION.md`. No green release claim until real Android, iOS/iPadOS and desktop hardware is observed.

### P59 — Visual QA Against Locked Design

**Status:** screenshot audit and priority repairs implemented; quantitative P37 release threshold remains a separate design gate until all categories are evidenced at the locked target.

- Visually inspect all 18 representative desktop/phone reference captures and score against P37 contract, without claiming hands-on device qualification.
- Repair mobile Library navigation/action hierarchy and blank space, prevent lesson controls from obscuring instructional text, and increase important compact labels to legible sizes.
- Add DOM geometry checks for mobile Library top spacing and lesson navigation flow, plus maintain established performance/quality and pixel-regression budgets.
- Record remaining sub-target visual and accessibility issues candidly in `docs/P59_VISUAL_QA.md` rather than falsely approving release.

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
