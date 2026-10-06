# Chess

A personal, adaptive chess-learning app for the thiepn ecosystem.

## Product contract

Chess is not a general chess portal. It is a personal coach that decides what deserves training time based on curriculum readiness, retention, weaknesses, and real-game evidence.

Core loop:

```
Learn → Practice → Play → Review → Diagnose → Retrain → Retain
```

The default experience should answer one question: **what should I train now?**

## Implemented foundation

- P0 product architecture and five-area information model
- P1 typed curriculum graph, multidimensional mastery, evidence weighting, retention and weakness scoring
- P2 adaptive 10/25/60-minute Training Composer with diversity, novelty and fatigue constraints
- P3 reusable interactive lesson scripting model, chessboard teaching engine, guided moves, hints, overlays, rewind/retry feedback, and curriculum browser
- P4 streaming Lichess puzzle ingestion, curriculum-theme normalization, quality/rating filtering, sharded corpus loading, adaptive puzzle selection, multi-ply practice, and durable puzzle history
- P5 PGN/Lichess game import, client-side Stockfish 19 analysis, critical-moment filtering, curriculum-linked error classification, personal mistake bank, real-game evidence, and spaced mistake repair
- P6 compact concept-first opening repertoire, visual repertoire explorer, spaced branch recall, real-game deviation detection, and adaptive opening review
- P7 full Play system with configurable/adaptive Stockfish opponents, complete legal games, opening/endgame/conversion/defense training scenarios, automatic PGN capture, transfer evidence, and automatic handoff into P5 Review
- P8 post-game storytelling with phase summaries, a complete move timeline, 3–5 high-signal moments, animated actual-vs-better move playback, curriculum links, legacy-review upgrades, and direct Repair/Replay actions
- P9 full Library workspace with free FEN/PGN analysis, on-demand Stockfish, branching move navigation, saved studies, notes/tags/favorites, reference positions/master-game exploration, game-history access, and optional promotion of saved positions into adaptive spaced training
- P10 shared premium interaction system with real board glides/castling motion, check emphasis, motion tokens, optional Web Audio and haptics, milestone-based celebrations, synced experience preferences, improved loading/error resilience, accessibility states, safe-area handling, and mobile/landscape polish
- P11 complete beginner-to-intermediate curriculum expansion with 68 atomic skills across 8 stages, authored interactive board lessons for every skill, prerequisite-driven progression, expanded Lichess puzzle-theme mappings, a staged Learn journey, recommended-next guidance, and CI-enforced curriculum/content QA
- P12 placement diagnostics, mixed stage checkpoints, evidence-based promotion gates, persistent certifications, placement/certification-aware curriculum floors, targeted checkpoint remediation, and Home/Learn course-status surfaces
- P13 longitudinal learning analytics with compact evidence history, mastery/retention/transfer trajectories, model calibration, stage velocity, recurring-vs-repaired weakness tracking, intervention effectiveness signals, and a dedicated Progress Intelligence view
- P14 adaptive training policy with per-skill intervention selection, challenge bands, calibrated puzzle targets, transfer-to-game routing, explicit stopping pressure, explainable policy reasons, and session-level difficulty adaptation
- P15 human-play integration through Lichess with public-username linking, bounded recent-game sync, stable external-game deduplication, focus-triggered automatic refresh, batch human-game analysis, source provenance, and direct routing into Review/mistake/adaptive learning
- P16 source-aware real-game transfer with separate structured-training, AI-game and human-game evidence channels, practical game-quality metrics, human-weighted weakness recurrence, practical-strength estimation, time-control/opponent context, positive clean-move validation, and confidence-aware human-performance analytics
- P17 sample-aware real-game cohort diagnostics across color, time control, relative opponent strength, opening family, position type and game phase, with recurring human mistake families, five-vs-five recent form, baseline deltas, confidence thresholds, and actionable focused-practice links
- P18 cohort-to-training prescriptions that convert strong P17 diagnoses into confidence-gated repair plans, repertoire-aware opening recall, exact human-mistake replay, focused curriculum repair, targeted scenarios, one-item composer injection, Home surfacing and next-human-game checklists
- P19 prescription outcome tracking with issued/started/completed intervention episodes, frozen pre-treatment baselines, matched post-treatment human-game validation, three-game minimums, successful-plan retirement, persistent-plan escalation and coach-effectiveness analytics
- P20 coach policy learning with recency-weighted/shrunk outcome evidence, learned plan/action-family preferences, deterministic action reordering, bounded prescription-priority adjustments, explicit exploration of weak/unseen alternatives, and transparent policy diagnostics
- P21 goal-aware training horizons with configurable 4/8/12-week plans, real completed-training ledger, weekly functional budgets, adaptive under-allocation pressure, protected urgent work, pace-aware session recommendations, and Home/Progress periodization surfaces
- Local-first durable state
- Optional Supabase persistence using the shared authenticated user
- Responsive Home and session runtime shell
- Reduced-motion and keyboard-friendly interaction defaults

The curriculum is now a complete beginner-to-intermediate course rather than a representative seed graph. P3 established the visual lesson engine; P4 supplies scalable practice; P5 converts real games into evidence; P6 keeps opening study compact and concept-first; P7 makes Play part of the learning system; P8 turns engine output into a visual game story; P9 provides a serious free-study workspace; P10 standardizes interaction quality; P11 fills the course with a coherent 68-skill progression and authored lesson coverage; P12 makes progression evidence-based instead of equating lesson completion with competence; P13 makes the resulting player model interpretable across time instead of exposing only the latest score; P14 closes the loop by using that evidence to choose how difficult the next activity should be and which intervention should come next; P15 brings real human games into that same loop without building a proprietary multiplayer service; P16 makes real human performance a distinct and more valuable evidence source instead of mixing it with AI practice; P17 explains the conditions under which that human performance changes; P18 converts those diagnoses into concrete next actions and pre-game plans; P19 checks whether those interventions actually improve later matching human-game performance; P20 lets repeated validated outcomes modestly influence which repair mechanisms the coach prefers next without allowing small samples to dominate; P21 turns those priorities into a sustainable weekly study budget instead of optimizing each session in isolation.

## Run

```bash
npm install
npm run dev
npm test
npm run build
```

## Lichess puzzle corpus

The app uses Lichess's open puzzle export as an optional large practice source. The ingestion pipeline expects the published CSV schema and normalizes Lichess's puzzle convention automatically: the source FEN is before the opponent move, so the builder applies the first UCI move and stores the remaining solution from the learner's turn.

A small built-in seed corpus keeps development and offline fallback functional without a large download.

Generate the production corpus from a decompressed CSV:

```bash
npm run puzzles:build -- lichess_db_puzzle.csv
```

Or stream decompression without creating the full CSV:

```bash
zstdcat lichess_db_puzzle.csv.zst | npm run puzzles:build -- -
```

Useful options:

```bash
--out public/data/puzzles
--max-per-skill 5000
--min-popularity 75
--min-plays 50
--min-rating 600
--max-rating 2400
--max-rd 140
--include-very-long
```

The builder:

1. streams the source instead of loading millions of rows into memory;
2. validates FEN and every UCI move with chess.js;
3. maps Lichess themes to canonical curriculum skills;
4. detects knight-specific forks from the solving piece;
5. filters low-confidence, unpopular, and excessively noisy positions;
6. preserves rating diversity with rating buckets;
7. emits one compact JSON shard per skill plus a manifest.

At runtime the browser downloads only the shard needed for the current skill. Puzzle selection scores rating fit, popularity, play count, exact curriculum match, and personal attempt history. Puzzles attempted recently are heavily penalized; older failed puzzles can return after spacing.

Lichess puzzle exports are CC0. Source provenance and license metadata are preserved in the generated manifest.

## Personal game analysis

Review accepts pasted PGN, uploaded `.pgn` files, or a public Lichess game URL/ID. The app analyzes only the selected player's moves.

Stockfish 19 lite single-threaded is installed as a browser worker during `npm install`. Its JS/WASM files, GPL-3.0 license text, exact package version, and corresponding-source link are emitted into `public/engine`.

Game analysis is deliberately selective:

- engine differences below the learning threshold are ignored;
- low-value inaccuracies in already-lost positions are suppressed;
- at most eight high-impact moments are promoted per game;
- positions are classified against curriculum skills such as piece safety, exchange judgment, candidate moves, opening principles, defense, opposition, and conversion;
- the bank stores the position *before* the error, so future review tests retrieval instead of showing the old move;
- successful repairs are spaced at increasing intervals and feed the normal mastery engine.

Imported game summaries and the personal mistake bank are account state. The engine itself stays client-side.

## Opening repertoire

The default repertoire is intentionally narrow:

- White: 1.e4, Italian versus ...e5, Alapin versus the Sicilian, central setups versus the Caro-Kann and French
- Black versus 1.e4: Caro-Kann
- Black versus 1.d4: Queen's Gambit Declined setup

Each branch stores purpose, plans, common mistakes, key squares and a preferred move. Training happens from positions rather than notation lists.

Opening recall is spaced independently per position. Real games are matched against the repertoire after analysis. If the opponent leaves the curated tree, the app stops judging the branch. If the learner leaves a chosen repertoire move, that exact position is marked due and can override the normal review date.

The repertoire explorer is owned data and works offline. The app does not expose a Lichess access token in client code. A future authenticated server-side explorer adapter can add live Lichess statistics without making the learning flow dependent on the external service.

## Play system

Play supports complete games from the initial position and targeted training games from curated positions.

Opponent profiles are deliberately described as training pressure rather than exact Elo ratings:

- Gentle: Stockfish Skill Level 0, shallow search
- Developing: more reliable punishment of obvious errors
- Club: default practical resistance
- Strong: deeper and more accurate
- Adaptive: selected from the current multidimensional player model

Training scenarios currently include:

- Italian repertoire entry
- Caro-Kann rehearsal as Black
- conversion with an extra rook
- defending a worse rook ending
- king-and-pawn opposition

A completed game immediately produces PGN, enters account game history, updates scenario transfer evidence, detects opening deviations, and is then analyzed through the P5 Stockfish critical-moment pipeline. If automatic analysis fails, the raw game remains safely stored in Review.

## Post-game story

Every analyzed game now stores a compact durable review story rather than the raw per-move engine dump.

The story contains:

- opening, middlegame and endgame phase summaries;
- a verdict for the overall game;
- the highest-priority curriculum skill from that game;
- 3–5 moments worth remembering;
- actual move versus better move;
- evaluation before/after and centipawn cost;
- a short teaching explanation;
- a compact engine continuation;
- links back to the personal mistake bank.

The visual Review workspace keeps the entire move timeline navigable while reserving detailed explanation for the selected moments. Switching between Position, Your move and Better move animates the relevant board transition and teaching arrow.

Older P5/P7 analyzed games can be upgraded in place by selecting them from Review; the app reruns analysis and generates the P8 story.

From a critical moment:

- **Repair now** opens the focused retrieval exercise from P5.
- **Replay position** starts a real P7 Stockfish game from that exact position.

Replay games preserve their custom starting FEN, are excluded from ordinary opening-deviation tracking, and flow back into the normal Review pipeline after completion.

## Library and analysis workspace

Library is the free-study side of the product.

The Analysis Board supports:

- legal free play from the initial position or any valid FEN;
- pasted PGN/game loading;
- undo/redo-style move navigation and branching by rewinding then choosing another move;
- board flipping;
- on-demand client-side Stockfish evaluation;
- best-move and principal-variation display in readable notation;
- study titles, notes, tags and study type;
- saving and updating studies;
- favorites and search;
- opening any game already stored by Play or Review;
- a small built-in reference collection, including the Morphy Opera Game and targeted opening/endgame/conversion positions.

Saved studies remain exploratory by default. They enter the adaptive training system only when **Save + train** is used after engine analysis. That stores a concrete target move and curriculum skill, then spaces future recall exactly like other personal review material.

If a saved study is branched to a different position, position-dependent engine analysis and training targets are cleared automatically rather than being carried onto the new FEN.

Library study state lives inside the same account JSON state as mastery, games, repertoire and mistakes, so no additional database table or migration is required.

## Premium interaction system

P10 provides one shared interaction contract across Learn, Play, Review and Library.

The board now uses real square-to-square piece travel rather than only destination pop animations. Castling animates the rook as well as the king, check gets its own visual pulse, legal targets enter smoothly, and rejected moves use restrained feedback.

Interaction preferences are account state:

- **Sound** — optional generated Web Audio cues for moves, captures, checks, success and game results. No audio asset bundle is required.
- **Haptics** — subtle vibration patterns on supported devices.
- **Celebrations** — optional particle flourishes reserved for mastery thresholds, repaired personal material, scenario goals and game wins.
- **Motion** — System, Full or Reduced. Reduced motion can be explicitly selected even when the operating system does not request it, while Full can deliberately override system reduction.

Celebrations are deliberately sparse. Ordinary correct moves receive tactile/audio confirmation, not confetti. Larger visual responses are reserved for meaningful mastery thresholds and real achievements.

Mobile polish includes safe-area-aware navigation, larger touch targets, an accessible settings surface, bottom-sheet training behavior, portrait/landscape tuning, reduced hover artifacts on touch devices, and improved study/game controls.

Startup now uses a branded loading state instead of briefly rendering demo state. Supabase/auth/network failures fall back to local state so account-sync trouble does not trap the application on startup.

Accessibility additions include current-page and pressed-state semantics, live game-state announcements, explicit reduced-motion control, and consistent keyboard focus behavior.

## Full curriculum

P11 expands Learn into an eight-stage beginner-to-intermediate course:

1. **Learn to play** — board coordinates, piece movement, captures, check, responses to check, mate, castling, promotion and draw rules.
2. **Stop losing pieces** — material values, attacks, defenders, hanging pieces, exchanges, final blunder checks and opponent-threat recognition.
3. **Build good positions** — development, center control, king safety, queen timing, tempo use, piece activity and improving the worst piece.
4. **See tactical patterns** — double attacks, knight forks, pins, skewers, discovered attacks, removing defenders, deflection, decoys, back-rank tactics, overloaded defenders and clearance.
5. **Think before you move** — candidate generation, best replies, forcing lines, move order, visualization, quiet moves, open files, outposts, pawn breaks and pawn weaknesses.
6. **Attack and defend** — exposed kings, opening lines, counting defenders, mating nets, sound sacrifices, prophylaxis, exchanging attackers and counterplay.
7. **Finish games** — queen mate, rook mate, opposition, key squares, pawn races, passed pawns, rook activity, Lucena, Philidor and simplification.
8. **Play practical chess** — clock discipline, planning, phase transitions, post-move rechecks and recovering after mistakes.

Every curriculum skill has a skill-specific authored board lesson. The generic fallback lesson has been removed entirely. If a curriculum ID is added without matching lesson content, the content audit now fails CI.

Learn is stage-based rather than a flat domain catalog. Each stage shows:

- its learning promise and approximate player level;
- average mastery and mastered-skill count;
- prerequisite locks;
- course progress;
- legitimate puzzle practice when a compatible Lichess theme exists;
- the current **Next** skill selected by the same prerequisite logic used by adaptive training.

Puzzle theme mappings now connect common Lichess motifs such as forks, pins, skewers, deflection, clearance, overloaded pieces, back-rank mates, sacrifices, quiet moves, pawn endings, rook endings and king attacks to the expanded skill graph. Concepts that do not map honestly to tactical puzzles continue to use board lessons, endgame drills, opening positions, game review or training games instead of receiving fake puzzle coverage.

P11 also adds a curriculum certification audit. CI verifies:

- unique skill IDs;
- valid prerequisite references;
- no prerequisite cycles;
- all eight stages populated;
- valid difficulty and importance values;
- at least one training/transfer mode per skill;
- authored lesson coverage for every curriculum skill;
- legal FENs and legal accepted moves in every lesson.

During the certification pass, strict TypeScript defects in PuzzleRunner, the Stockfish message handler and repertoire ancestor typing were also repaired so the expanded course is tested against a clean production build rather than only unit tests.

## Placement, checkpoints and promotion gates

P12 separates **learning a concept** from **earning progression**.

### Placement diagnostic

A first-time or repeatable 16-position diagnostic samples two positions from every curriculum stage.

Placement rules:

- no hints;
- no retries;
- one committed legal move per position;
- the tested skill is hidden until after the move;
- results seed recognition/execution evidence;
- two sampled positions never certify an entire stage.

Placement chooses the automatic curriculum floor. Earlier stages remain visible and manually accessible, but adaptive curriculum recommendations begin at the recommended stage rather than immediately sending an experienced player back to board basics.

Placement-cleared stages are deliberately labeled as such rather than falsely marked **Certified**.

### Stage checkpoints

Each stage has a rotating mixed checkpoint of up to six representative skills. Retakes rotate the selected skills so the same subset is not used every time.

A checkpoint answer is irreversible inside that assessment. After each move the app reveals whether it was correct and shows the target move when it was missed.

A checkpoint score is only one promotion signal.

### Promotion gate

Stage certification requires all of the following:

- **Breadth** — at least 80% of stage skills have real learning evidence.
- **Mastery** — stage-average effective mastery of at least 55%.
- **Retention** — stage-average delayed-retention evidence of at least 35%. A checkpoint only earns delayed-retention credit when the skill was previously seen at least one day earlier, so same-session recall cannot satisfy this gate.
- **Transfer** — evidence outside the lesson, with stage-specific requirements from 0% for the rules stage up to 30% for Practical Chess.
- **Checkpoint** — at least 80% on the mixed checkpoint.

Transfer uses representative evidence from training positions and real games rather than requiring every single atomic skill to appear in a played game.

Gate states are explicit:

- **Learning** — not enough evidence yet.
- **Checkpoint ready** — broad preparation is sufficient to test.
- **Placement cleared** — placement allows progression, but the stage is not certified.
- **Repair needed** — the latest checkpoint failed.
- **Evidence pending** — the checkpoint passed but retention/transfer/mastery still needs proof.
- **Certified** — all promotion requirements were demonstrated.
- **Locked** — the previous stage has not been certified or bypassed by placement.

Certifications are durable account state. A later failed retake can generate maintenance work without deleting an already-earned certificate.

### Assessment-driven remediation

A failed checkpoint is not just a score.

Missed checkpoint skills are inserted into the next adaptive session with elevated priority and labeled **Checkpoint remediation**. If the checkpoint score passes but another gate remains weak, the composer targets the weakest skills in that stage.

This sits alongside existing priorities from personal blunders, recurring weaknesses, spaced reviews, opening deviations and saved Library studies.

### Curriculum floor

Automatic curriculum progression respects both placement and certification:

1. placement establishes the initial floor;
2. certification of that stage advances the floor to the next stage;
3. prior material stays available manually;
4. real-game weaknesses and due reviews are still allowed to pull earlier concepts back into training when evidence says they matter.

This prevents both failure modes: forcing an experienced player through beginner content, and pretending skipped material was mastered.

### Course visibility

Home now shows the current course stage, certification state and which evidence category is blocking promotion.

Learn shows the complete five-part gate for every stage, placement status, checkpoint controls and the same recommended-next curriculum logic used by Home.

Assessment state, placement results and stage certifications live inside the existing account JSON state, so P12 requires no separate backend service or database migration.

## Longitudinal progress intelligence

P13 adds a compact event history behind the existing mastery model. It records the before/after state whenever meaningful learning evidence changes a skill.

Tracked evidence includes:

- curriculum lessons and guided work;
- themed and mixed puzzle practice;
- spaced reviews;
- personal mistake repair;
- saved Library study retrieval;
- opening recall;
- targeted training games;
- real-game review mistakes;
- placement diagnostics;
- stage checkpoints.

Each event stores the relevant skill/stage/domain plus mastery, delayed-retention, transfer, confidence and stability before and after the evidence. The history is capped to a compact rolling window rather than storing disposable engine data or raw interaction telemetry.

Existing accounts are migrated without a database change. Their current skill states become baseline events; P13 then records true longitudinal changes from that point onward.

### Progress Intelligence view

The five primary product tabs remain unchanged. Home links into a dedicated Progress Intelligence surface that answers:

- **Mastery trajectory** — whether effective mastery is actually increasing over the last 30 days and across an eight-week trend.
- **Retention health** — expected recall from the current forgetting/stability model rather than lesson-completion percentage.
- **Transfer** — how well trained concepts survive position training and real games.
- **Calibration** — whether mastery estimates predict placement/checkpoint performance, including overconfidence and underconfidence signals.
- **Stage velocity** — time from first evidence in a course stage to certification, plus current mastery/retention/transfer for unfinished stages.
- **Improving skills** — skills with positive recent longitudinal movement.
- **Needs attention** — skills with the weakest combined mastery, retention and transfer.
- **Recurring versus repaired weaknesses** — unresolved/repaired personal mistakes and recurring game-derived weakness signals.
- **Intervention effectiveness** — which actual learning interventions are producing the strongest current personal signal.

Placement, checkpoints and game review are deliberately treated as **measurement**, not as teaching interventions. They inform calibration and player-model accuracy but are excluded from the “what works for you” intervention ranking.

Intervention effectiveness is presented as a personal signal, not a causal scientific claim. It combines recent success, mastery movement, retention movement and sample size. Scores are bounded and become more meaningful as repeated evidence accumulates.

The analytics layer stores no separate telemetry backend and requires no new database table. It lives inside the same account JSON state as mastery, games, assessments and Library studies. The event log is capped at 3,000 entries to keep personal sync compact.

### Historical limits

P13 cannot reconstruct learning trajectories that were never stored before this phase. For pre-P13 users, existing mastery becomes a baseline and real longitudinal tracking begins from that baseline. The UI therefore distinguishes insufficient calibration/history from confident conclusions instead of inventing past progress.

## Adaptive training policy

P14 turns the P13 player model into an explainable session policy.

For every candidate skill, the composer now evaluates:

- current effective mastery;
- understanding, recognition, execution and mixed-recognition dimensions;
- expected retention from the forgetting/stability model;
- training and real-game transfer;
- recent success/failure history;
- confidence in the mastery estimate;
- recent per-skill intervention results;
- the reason the skill entered the session in the first place, such as curriculum, spaced review, game weakness, checkpoint remediation or personal material.

The result is an explicit per-activity policy rather than a hidden score.

### Challenge bands

Every adaptive activity receives one of five challenge bands:

- **Recovery** — recent performance is breaking down. Difficulty is reduced and the target success range is intentionally high enough to rebuild reliable retrieval.
- **Supported** — new or still-fragile knowledge receives a more forgiving task.
- **Productive** — the default desirable difficulty range.
- **Stretch** — repeated clean success and sufficient model confidence raise the challenge instead of adding more easy volume.
- **Maintenance** — mastery, retention and transfer are all strong enough that continued drilling receives heavy stop pressure.

Each band carries an explicit target-success range. This makes difficulty calibration goal-aware instead of treating harder as automatically better.

### Intervention selection

The app no longer picks the training mode only from the candidate source.

The policy can move a skill through a progression such as:

1. concept lesson when understanding is still weak;
2. guided or themed recognition when the pattern is not reliably seen;
3. mixed retrieval when isolated recognition is stronger than mixed recognition;
4. real position play when knowledge is ahead of transfer;
5. spaced retrieval when recall is decaying;
6. the strongest recent per-skill intervention signal when enough personal history exists.

Personal mistakes, opening recalls and saved Library studies keep their concrete intervention because the source position itself is the learning material.

The policy does not invent capabilities that the runtime cannot execute. If a transfer gap exists but no dedicated playable scenario is available for that skill, the composer falls back to a real retrieval mode rather than labeling an ordinary lesson as a game.

### Adaptive puzzle difficulty

Puzzle selection accepts a policy-generated target rating.

The target combines:

- current mastery;
- curriculum difficulty;
- recent success rate;
- challenge band.

Repeated failure can lower the target substantially. Repeated clean success raises it. The target remains bounded to the curated corpus range instead of escalating without limit.

Recent-puzzle spacing, popularity, play confidence and exact skill match continue to influence final puzzle selection after the difficulty target is set.

### Transfer into real play

For skills with dedicated P7 scenarios, a strong knowledge/weak transfer gap can automatically become a real Stockfish training game inside the adaptive session.

Current scenario-backed examples include:

- opposition/endgame conversion;
- defending a worse rook ending;
- converting a material advantage;
- concept-first opening play.

Opponent pressure follows the same challenge policy:

- Recovery → Gentle
- Supported → Developing
- Productive → adaptive player-model opponent
- Stretch → Strong
- Maintenance → Club

The resulting game still follows the normal P7 → P5/P8 pipeline: PGN capture, transfer evidence, Review storage and critical-moment analysis.

### Stop pressure

P14 also decides when **not** to keep training something.

A skill with strong mastery, retention and transfer receives increasing stop pressure. Routine curriculum/focus candidates are strongly down-ranked when this pressure is high, while important spaced reviews, real-game weaknesses, checkpoint remediation and personal mistakes remain allowed to override it.

This prevents a familiar failure mode in learning apps: spending time on material that already feels good simply because it is easy to serve.

### Explainability

Home now shows the challenge band and selected activity type inside the generated session.

Opening an activity shows the policy reason, target success range and—when relevant—the current puzzle-rating target. Low-confidence policy decisions are explicitly marked as such.

The adaptive policy itself is not stored as permanent account state. It is deterministically recomputed from the latest synced mastery, analytics, assessment and game evidence whenever a session is composed. This allows later evidence to change the recommendation immediately without stale personalization state.

## Human play and Lichess game intake

P15 uses Lichess as the human-play surface rather than building a multiplayer backend.

### Lightweight account link

The chess app stores only:

- the public Lichess username;
- when it was linked;
- whether automatic sync is enabled;
- the last successful sync/import timestamps;
- the number of newly imported games from the latest sync.

No Lichess password, session cookie, personal access token or OAuth bearer token is stored in THIEPN account state.

The username is validated against the public Lichess user endpoint before it is linked.

### Human play

Play now includes a **Human Play** section.

When a Lichess username is linked:

- **Play humans** opens Lichess in a new tab;
- the normal local/Stockfish training modes remain available;
- returning focus to THIEPN can trigger a due game sync automatically.

This deliberately keeps live matchmaking, clocks, anti-cheat, reconnection and multiplayer infrastructure on Lichess instead of recreating them in this app.

### Recent-game sync

The client requests a bounded recent-game window rather than attempting to mirror an entire Lichess account.

Current behavior:

- at most 12 games are requested per sync;
- later syncs use the last successful sync timestamp with a six-hour overlap;
- overlap prevents games near a boundary from being lost;
- stable Lichess game IDs make the overlap safe because duplicates are removed;
- automatic refresh is considered due after 15 minutes and also runs when the app regains focus;
- only one Lichess request/sync sequence can be in flight at once.

The primary integration uses the documented Lichess user-game export endpoint. A narrow historical export-route fallback is retained for temporary endpoint-routing regressions. The app never scrapes rendered Lichess HTML.

If Lichess responds with a rate-limit status, the app surfaces a clear retry-later message rather than hammering the service.

### Stable game provenance

Imported games now carry explicit provenance:

- **manual** — PGN pasted/uploaded by the user;
- **training** — games played against the app's Stockfish training opponent;
- **lichess** — human games imported from the linked public Lichess account.

Synced Lichess games also preserve:

- their external Lichess game ID;
- their canonical Lichess game URL;
- the real game timestamp when available;
- the linked user's inferred color.

A synced game receives a stable ID such as `lichess:AbCd1234`, so repeated syncs cannot create duplicate Review entries or duplicate mastery penalties.

### Review pipeline

Synced games appear immediately in Review.

Review adds a linked-account sync surface and a **Analyze new human games** action. It processes up to five newest unanalyzed synced games in one batch using a single browser Stockfish instance.

Each analyzed game then follows the already-established learning pipeline:

1. client-side Stockfish analysis;
2. critical-moment filtering;
3. curriculum-skill classification;
4. visual P8 game story;
5. personal mistake-bank entries;
6. opening-deviation detection;
7. real-game mastery/transfer evidence;
8. future P14 adaptive remediation.

Browser engine work is serialized so manual review, game reanalysis and synced-game batch analysis cannot accidentally run competing Stockfish jobs.

### API/privacy boundary

P15 intentionally stops short of OAuth because the current product does not need private account actions merely to learn from public finished games.

If a future phase needs actions such as creating challenges programmatically, reading private data or controlling authenticated Lichess account functions, OAuth2 PKCE should be added as a separate capability with narrowly scoped permissions. It should not be introduced merely to make public game sync look more sophisticated.

## Human-vs-AI transfer and practical strength

P16 separates transfer evidence by where it was demonstrated.

The mastery model now distinguishes:

- **Structured training transfer** — guided positions, endgame drills, conversion exercises and other intentionally constructed practice.
- **AI-game transfer** — decisions made while playing the app's Stockfish opponents and later reviewed by the engine.
- **Human-game transfer** — decisions made in synced Lichess games against real opponents.

The older `realGameRecognition` / `realGameExecution` fields remain readable as legacy compatibility fields, but new P16 evidence is written into explicit human/AI channels. Existing AI-game review can therefore no longer masquerade as human proof.

### Positive and negative human evidence

Real-game evidence is no longer only a list of mistakes.

Engine review still creates strong negative evidence for meaningful errors, but clean decisions can also provide bounded positive validation when a skill repeatedly appears in the game context.

Current positive validation can recognize signals such as:

- clean opening-principle execution;
- blunder-check discipline on low-loss moves;
- selecting forcing candidates;
- precise king-and-pawn endgame decisions;
- simplifying/maintaining a winning ending;
- accurate defensive play under pressure.

A positive validation is only promoted when the pattern appears at least twice in the game, and a skill cannot receive positive validation from the same game when that skill was also classified as a mistake there.

This keeps one lucky engine-approved move from becoming “mastery.”

### Game context

Imported PGN headers now preserve practical context when available:

- player rating;
- opponent rating;
- rated/casual status;
- raw time control;
- normalized category: Bullet, Blitz, Rapid, Classical, Correspondence or Unknown.

Time control affects transfer confidence rather than changing the chess result itself. Slower games receive somewhat more evidential weight because there was more opportunity to apply a learned thinking process; Bullet remains useful practical evidence but is deliberately weaker.

Opponent rating is also only a context modifier. It is tightly bounded and cannot simply turn the internal model into a renamed Lichess Elo.

### Practical game metrics

Every analyzed game now receives a compact practical summary:

- average centipawn loss across the user's moves;
- critical-error rate;
- blunder rate;
- normalized quality score;
- result score;
- positively validated curriculum skills.

These metrics are stored with the analyzed game so Review and Progress do not need to rerun Stockfish merely to explain practical performance.

Review history shows the relevant human-game context directly, including time-control category, opponent rating, practical quality and ACPL.

### Human-weighted weaknesses

Mistakes also preserve their game source.

Recurring-weakness aggregation now weights sources approximately in this order:

1. synced Lichess human games;
2. manual external games;
3. Stockfish training games.

AI mistakes remain valuable training evidence, but a repeated error against humans carries more practical weight than the same pattern occurring in an artificial practice game.

### Stage transfer and adaptive policy

P12 promotion and P14 adaptive saturation now prefer human transfer evidence.

Human proof can satisfy transfer at full strength. AI/structured transfer remains useful but is discounted when used as the best available transfer signal.

This means a user can still progress through the course without being forced to play online constantly, while the model becomes more confident once the skill actually survives human opposition.

### THIEPN practical rating

Progress Intelligence now includes a separate **THIEPN practical rating**.

This is not copied from Lichess Elo and does not attempt to replace an official competitive rating.

The estimate combines:

- curriculum/effective mastery;
- explicit human-game transfer;
- analyzed human-game quality;
- consistency from game to game;
- practical result performance.

Opponent rating contributes only a bounded context adjustment. AI/training transfer is used mainly when there is not yet enough human evidence.

The displayed scale is intentionally familiar (roughly 500–2000) but represents this app's internal practical-strength estimate, not an externally certified chess rating.

Confidence is displayed alongside the estimate:

- **Provisional** — fewer than 3 analyzed human games;
- **Developing** — 3–9 analyzed human games;
- **Established** — at least 10 analyzed human games.

Confidence grows from analyzed human-game count plus explicit skill-level human transfer evidence. Strong AI games cannot increase the human-game count or establish the model.

Progress also shows:

- human transfer separately from AI/training transfer;
- analyzed human-game quality;
- consistency;
- result performance;
- average opponent rating when known;
- quality by time-control category.

When no human games exist yet, Home clearly labels the practical number as a training-only estimate rather than presenting it as established real-world strength.

### Compatibility

P16 does not require a new database table or a destructive migration.

New mastery fields are additive and tolerate older account JSON that does not contain them. Missing human-game fields are treated as absent evidence, not as zero-quality performance.

Effective mastery also normalizes its dynamic weights, so simply having no human-game sample cannot lower a user's existing mastery score.

## Real-game cohort diagnostics

P17 answers a different question from P16.

P16 estimates **how strong the user's practical human chess is overall**. P17 asks **where that strength changes depending on the conditions**.

The cohort layer is derived entirely from analyzed Lichess games already stored in account state. It adds no analytics service, telemetry backend or destructive migration.

### Human-game baseline

Every analyzed human game contributes a compact practical score built from:

- engine quality;
- result performance;
- critical-error rate.

P17 compares each cohort against the user's own human-game baseline rather than against a generic population benchmark.

That makes statements such as “Black is currently weaker than White” meaningful for the individual learner without pretending a small personal dataset can establish universal chess truths.

### Sample-aware conclusions

Raw cohort rows can appear with any sample size so the user can inspect the evidence.

However, P17 does **not** declare a cohort meaningfully better or worse until it contains at least three analyzed human games.

Confidence rises with sample count and reaches the current display ceiling at six games per cohort.

This is deliberate. One bad Sicilian or two rushed Blitz games should remain observations, not become durable diagnoses.

### Cohort dimensions

P17 derives performance across:

- **Color** — White versus Black.
- **Time control** — Bullet, Blitz, Rapid, Classical, Correspondence and Unknown.
- **Opponent strength** — lower-rated, similar-rated and stronger opponents using rating difference relative to the player's own rating.
- **Opening family** — grouped opening families rather than tiny one-game sub-variations.
- **Position type** — opening-sensitive, tactical, endgame-heavy, long-middlegame or balanced games.
- **Game phase** — opening, middlegame and endgame quality/ACPL/critical-error performance.

Each cohort reports:

- analyzed-game count;
- engine quality;
- result performance;
- ACPL;
- critical-error rate;
- blunder rate;
- compact practical score;
- delta versus personal baseline;
- sample confidence.

### Opening identity

New Lichess sync requests opening metadata where the export provides it and preserves the PGN `Opening` and `ECO` tags.

Variation labels are normalized to stable families. For example, multiple Caro-Kann variations contribute to one **Caro-Kann Defense** cohort rather than producing several one-game rows.

For older games or PGNs without opening metadata, P17 falls back to the app's own repertoire tree and then to a small move-based family classifier.

Repertoire-deviation behavior remains separate from analytics identity: the opening trainer may still flag 1.d4 as leaving a White 1.e4 repertoire even though cohort analytics correctly refuse to label that zero-match game as a 1.e4 repertoire game.

### Relative opponent diagnostics

Opponent cohorts are relative rather than fixed absolute rating buckets:

- **Stronger opponents** — at least 125 rating points above the player.
- **Similar-rated opponents** — within ±124.
- **Lower-rated opponents** — at least 125 below.
- **Unknown rating** — required PGN rating metadata is missing.

This answers a more useful personal question than generic “1200–1400” buckets: whether the player's chess changes when facing peers, stronger resistance or supposedly easier opposition.

### Position-type diagnostics

P17 derives broad practical archetypes from the existing review story rather than inventing a new engine pass.

Examples include:

- **Opening-sensitive** — the opening phase contains a meaningful error and is substantially worse than later phases.
- **Tactical** — repeated tactical/calculation moments or a high blunder rate dominate the game.
- **Endgame-heavy** — a substantial endgame was actually played.
- **Long middlegame** — a long non-endgame struggle dominates.
- **Balanced** — no single archetype dominates strongly enough.

These labels are intentionally broad; they exist to find repeatable learning conditions rather than to classify chess positions academically.

### Recent form

Recent form uses two rolling five-game windows:

- latest five analyzed human games;
- preceding five analyzed human games.

P17 compares both engine quality and result performance.

A minimum of three games in each window is required before form can be called improving, stable or declining. Otherwise the status remains **insufficient**.

### Recurring human mistake families

P17 also aggregates the curriculum skills attached to personal mistakes from human games.

For each recurring family it tracks:

- unique games affected;
- total mistake occurrences;
- average practical impact;
- recurrence rate across analyzed human games.

Families that recur across at least three games can become explicit P17 diagnostic signals.

The Progress workspace includes a direct **Train** action for these skill families, which enters the existing focused-practice runtime rather than creating a separate remediation product.

### Progress Intelligence workspace

The P17 section inside Progress includes:

- human-game baseline summary;
- ranked priority/watch/strength diagnostics;
- opening-family performance;
- time-control and opponent cohorts;
- color and position-type cohorts;
- phase performance;
- recent form;
- recurring human-game mistake families.

Home surfaces the highest-ranked P17 diagnostic when one has enough evidence, so a meaningful condition-specific issue is visible without opening the analytics page.

### Scope boundary

P17 is primarily a **diagnostic** phase.

Existing P14/P16 logic already uses human-weighted weaknesses for training priority, and recurring P17 mistake families can be trained directly. However, P17 deliberately does not rewrite the adaptive composer around every cohort difference yet.

That allows the statistical layer to remain inspectable before automatic prescriptions start changing opening drills, game scenarios or session composition.

## Cohort-to-training prescriptions and practical game plans

P18 closes the P17 diagnostic loop.

P17 can establish that a repeatable human-game problem exists. P18 converts that evidence into a short, inspectable repair plan using training capabilities that already exist elsewhere in the product.

The prescription system is derived from current account state. It does not persist a separate hidden recommendation profile or add a new analytics backend.

### Prescription structure

Every P18 prescription contains:

- the P17 diagnostic evidence that triggered it;
- number of supporting human games;
- confidence;
- a short rationale;
- a three-point next-game plan;
- one or more executable actions;
- whether the plan is strong enough to influence automatic session composition.

Current prescription classes are:

- **Opening repair**;
- **Recurring mistake repair**;
- **Phase repair**;
- **Condition-specific game plan**;
- **Recent-form reset**.

Strength diagnostics do not generate remediation. P18 only prescribes against priority/watch evidence.

### Opening repair

When P17 finds a weak opening-family cohort, P18 tries to resolve the diagnosis back to the app's real repertoire tree.

Examples include:

- Italian/Open Game → White 1.e4 repertoire;
- Sicilian → White Alapin branch;
- Caro-Kann as White → the White anti-Caro repertoire node;
- Caro-Kann as Black → the Black Caro-Kann repertoire and playable opening scenario;
- French → the White French-response node;
- Queen's Pawn/QGD positions as Black → the QGD repertoire.

A mapped opening prescription can therefore offer:

1. exact repertoire recall from the relevant node;
2. a real Stockfish training scenario when one exists;
3. opening-principles repair as a fallback.

If P18 cannot map a family to a trustworthy concrete repertoire node, it falls back to principled opening training instead of fabricating theory.

### Recurring mistake repair

A P17 recurring human-game mistake family becomes a prescription centered on the exact curriculum skill.

If a matching human-game mistake is available, the first action is the exact position replay from Review.

The prescription can then add focused skill repair.

That produces a concrete path such as:

`Human blunder-check recurrence → replay the latest failed position → focused blunder-check training → carry a blunder-check cue into the next human game.`

### Phase and condition prescriptions

Weak opening/middlegame/endgame phases resolve to existing curriculum skills instead of generic advice.

Condition-specific diagnoses map to practical skills such as:

- time-control weakness → clock discipline;
- stronger-opponent weakness → threat recognition/defense;
- lower-rated-opponent weakness → post-move checking instead of careless acceleration;
- tactical game weakness → candidate-move calculation;
- opening-sensitive games → opening principles;
- endgame-heavy weakness → phase transition/endgame work;
- long middlegames → worst-piece/planning work.

The prescription includes a concise practical game plan as well as a concrete training action.

### Recent-form reset

A sufficiently supported decline in recent form can create a **process reset** prescription.

The plan deliberately avoids rating-chasing language and instead returns to:

- objective position assessment;
- threat and forcing-candidate checks;
- a final blunder check;
- decision quality in the next human game.

### Confidence gating

P18 does not automatically inject every suggestion into training.

A prescription becomes composer-eligible only when its underlying P17 evidence has enough support—currently at least three games and roughly 50% cohort confidence, with stricter confidence for a recent-form reset.

Lower-confidence plans remain visible in Progress but do not hijack the daily session.

### Composer integration

The daily composer now understands `prescription` as a distinct source.

High-confidence prescriptions receive extra practical priority, but the session can include at most one prescription-driven mandatory activity.

This prevents a new failure mode where one recent set of human games overwhelms:

- due spaced review;
- personal mistakes;
- stage remediation;
- curriculum progression;
- other established weaknesses.

Prescription candidates still pass through P14's adaptive challenge/difficulty logic whenever the action type allows it.

### Executable actions

P18 never creates fake training modes.

Prescription actions dispatch into existing proven runtimes:

- **Focused practice** → a supported puzzle/retrieval/concept mode for that skill;
- **Mistake replay** → the exact human-game position in Play;
- **Opening recall** → P6 repertoire trainer;
- **Scenario** → P7 Stockfish position training.

Focused practice was also hardened so it no longer forces a themed puzzle for skills that have no puzzle corpus. Practical skills such as time use or resilience fall back to an executable guided/concept repair instead.

### Progress workspace

Progress now includes a dedicated **P18 Training Prescriptions** section.

Each plan shows:

- title;
- evidence count;
- confidence;
- rationale;
- three-point game plan;
- executable action buttons;
- whether it may automatically contribute to the next generated session.

The highest-priority prescription is visually marked as the top plan.

### Home and Play

Home surfaces the current **Next Repair Plan** with the first practical cues and a direct route into the evidence/plan.

Play receives the same top prescription immediately above the Lichess human-play surface.

This means the learning loop now reaches the actual next game:

`Human games → analysis → P17 diagnosis → P18 repair → targeted training → next-game checklist → human game.`

### No hidden recommendation state

P18 prescriptions are recomputed from current P17 diagnostics and current account evidence.

If the cohort improves, disappears, loses confidence or is replaced by a more important issue, the prescription changes automatically.

No stale permanent field such as `currentCoachPlan = "Caro-Kann"` is written to the account.

## Prescription outcome tracking and coach effectiveness

P19 adds the missing evaluation layer to P18.

A recommendation is no longer considered successful merely because it was shown, clicked or completed. P19 waits for later human games that match the same target and compares them with a frozen pre-treatment baseline.

### Lightweight persistent intervention history

P18 prescriptions remain derived from current evidence.

P19 persists only the minimal intervention episode needed to evaluate them:

- prescription ID and type;
- explicit target;
- when the plan was first issued;
- frozen pre-treatment baseline;
- number of starts;
- number of completed interventions;
- completed action IDs;
- training success/quality totals;
- retirement metadata.

This history lives in the normal account state and therefore follows the existing local/Supabase sync path. No new analytics service or database table is required.

### Explicit like-for-like targets

Every P18 prescription now carries a structured target.

Examples:

- `opening:header:caro-kann defense`;
- `color:b`;
- `timeControl:rapid`;
- `opponent:stronger`;
- `positionType:tactical`;
- `phase:middlegame`;
- `mistake:fundamentals.blunder-check`;
- `form:recent`.

The baseline is captured from the same metric family used by P17.

P19 then evaluates only later games that match that target. A Caro-Kann intervention is not credited because unrelated Italian games improved, and a Rapid prescription is not evaluated from Bullet games.

### Issued, started and completed are different

P19 distinguishes:

1. **Issued** — the P18 plan was surfaced and its baseline was captured.
2. **Started** — the user explicitly launched a prescription action.
3. **Completed** — the training runtime actually finished.

Automatically composed P18 activities are also tracked when completed.

Outcome validation does not begin until at least one intervention completion exists. Advice that was merely displayed receives no credit.

### Runtime coverage

Prescription identity now survives through every P18 execution path:

- focused puzzle/concept repair;
- personal mistake repair;
- opening repertoire recall;
- exact-position replay;
- Stockfish scenarios;
- automatically composed prescription activities.

Scenario metadata carries the prescription/action IDs through `GameArena` into the final play result, so scenario completion can be attributed correctly.

### Post-treatment human-game window

The evaluation cutoff is the latest completed intervention timestamp.

Only analyzed Lichess games played after that cutoff count as post-treatment evidence.

Using the game's real imported/game timestamp prevents an older game that was merely synced later from being misclassified as post-treatment performance.

### Minimum evidence

P19 requires at least **three matching post-treatment human games** before assigning an effectiveness result.

Before that, status is:

- **Untested** — no prescription action has been completed;
- **Collecting** — treatment was completed, but fewer than three matching later human games exist.

After three or more matching games:

- **Improved** — target score is at least 8 points above baseline;
- **Unchanged** — change remains inside the neutral band;
- **Worsened** — target score is at least 6 points below baseline.

Confidence increases with post-treatment sample size and currently reaches its display ceiling at six matching games.

### Target scoring

For normal cohorts, P19 uses the same compact practical score used by P17.

Phase prescriptions recompute the same P17 phase-quality formula from stored phase ACPL and critical-error counts.

Recurring-mistake prescriptions invert recurrence into a higher-is-better score:

`100 - percentage of later human games containing that mistake family`.

Recent-form resets compare later human-game quality with the frozen recent-form baseline.

This gives every prescription type one consistent interpretation: positive delta means the targeted practical behavior improved.

### Successful-plan retirement

If a completed prescription reaches an **Improved** result with enough post-game evidence, P18 stops serving that plan as an active prescription.

The historical P19 episode remains visible, but the plan no longer occupies Home, Play or automatic-session priority.

If the same practical problem later returns after the episode has been retired, a new prescription episode can be issued with a new baseline instead of treating the old result as permanently solved.

### Persistent-plan escalation

If post-treatment evidence is **Unchanged**, the active prescription remains available and receives a modest urgency increase.

If performance **Worsens**, the prescription is explicitly escalated and receives stronger priority in the P18 composer.

The existing one-prescription-per-session guard remains intact, so escalation cannot crowd out the entire curriculum/review system.

### Coach effectiveness

Progress now contains a dedicated **P19 Coach Effectiveness** panel.

It reports:

- prescriptions issued;
- prescriptions started;
- prescriptions completed;
- prescriptions with enough post-game evidence to evaluate;
- validated/improved rate;
- average before→after target delta;
- effectiveness by prescription type.

Recent intervention history shows:

- target;
- baseline score;
- post-treatment score;
- delta;
- outcome status;
- post-game sample count;
- completed-intervention count.

This lets the app eventually distinguish, for example, whether opening repair, exact mistake replay or practical game plans tend to produce stronger real-world transfer for this user.

### Causal caution

P19 is a personal before/after validation system, not a randomized experiment.

Later chess improvement can have several causes: other study, opponent mix, natural variance, fatigue, rating changes or overlapping skills.

For that reason P19:

- compares only like-for-like target cohorts;
- requires minimum post-treatment samples;
- shows confidence/sample size;
- uses bounded thresholds;
- describes plans as validated/ineffective signals rather than claiming scientific causality.

The value is practical: stop repeatedly prescribing things that show no evidence of transfer, and preserve interventions that appear to work in the user's real games.

## Coach policy learning and long-term prescription optimization

P20 closes the next loop after P19: the app no longer treats every prescription mechanism as equally useful forever.

The policy layer is deliberately conservative. It learns only from P19 episodes that reached a real post-treatment outcome (`improved`, `unchanged` or `worsened`). Merely showing a plan, starting an exercise or finishing training does not create a policy preference.

### Shrunk personal policy

Each validated episode contributes a bounded utility signal from:

- the P19 outcome class;
- the measured before→after target delta;
- P19 post-game confidence;
- recency, with older interventions gradually carrying less weight.

A neutral prior is always present. One strong result therefore cannot make the coach declare an intervention superior.

Plan-family and action-family multipliers stay intentionally small and bounded. Diagnosis severity remains the primary reason a problem is trained.

### Plan-family learning

P20 learns separate signals for:

- opening repair;
- recurring-mistake repair;
- phase repair;
- condition-specific game plans;
- recent-form resets.

After repeated validated transfer, a plan family may receive a modest boost. Repeated poor transfer can reduce its automatic priority, but it is not deleted from the product.

### Action-family learning

Completed prescription actions are grouped into:

- focused practice;
- exact mistake replay;
- opening recall;
- resistant Stockfish scenario.

When enough P19 outcomes exist, actions inside a new prescription are deterministically reordered so historically stronger transfer mechanisms come first.

Attribution remains cautious. If one P19 episode completed several action families, its evidence is divided across those families instead of giving each full credit.

### Exploration without randomness

P20 does not use opaque random recommendations. Given the same player state and validated history, the policy produces the same ordering and weights.

Unknown or weakly sampled action families remain neutral. This means they naturally rank above repeatedly poor alternatives while still ranking below clearly validated winners. The system can therefore keep learning without locking into an early guess.

### Failure escalation remains dominant

If the current target itself worsened after treatment, P19 escalation is preserved. P20 may change which action is tried next, but it cannot suppress the urgency of a currently deteriorating real-game problem.

### Explainable policy surface

Progress now includes **P20 Coach Policy Learning**.

It shows:

- policy mode (`cold-start`, `learning`, or `personalized`);
- number of validated episodes;
- overall learning confidence;
- currently preferred plan family;
- currently preferred action family;
- per-family policy multiplier, sample count and transfer signal.

Each active prescription also shows the policy adjustment that affected it.

The policy is derived from existing durable prescription history. No new analytics service, database table or opaque permanent recommendation state is introduced.

## Goal-aware training horizons and weekly periodization

P21 adds the layer above the single-session composer.

P2 can fit useful work into 10, 25 or 60 minutes. P14 chooses suitable difficulty and intervention mode. P18–P20 diagnose real-game problems, prescribe repairs and learn which intervention families appear to transfer. P21 decides how the available training time should be distributed across an entire week and multi-week horizon.

### Durable training plan

The user can choose:

- goal: balanced growth, course progress, human-game transfer or competition preparation;
- weekly study budget;
- 4, 8 or 12-week horizon;
- intended sessions per week.

The default remains conservative: 150 minutes per week, five sessions, an eight-week balanced-growth horizon.

### Real completed-training ledger

P21 no longer relies on the old seed-style `recentDomainMinutes` field as the primary planning signal.

Completed structured activities now append a compact ledger entry containing:

- timestamp;
- skill/domain;
- candidate source;
- activity mode;
- planning bucket;
- completed minutes.

Only completed work counts toward the weekly budget. Merely generating or opening a session does not.

Ledger history is bounded and follows the existing local/Supabase account-state path. No new backend table is required.

### Functional weekly budgets

Instead of assigning rigid weekdays, P21 allocates time across six learning functions:

- retention;
- repair;
- course progression;
- transfer/resistant play;
- repertoire;
- exploration.

Each goal changes the target shares. Course progress, for example, reserves substantially more time for curriculum advancement, while human-transfer and competition-prep plans shift time toward repair and resistant play.

### Rolling periodization instead of a brittle calendar

The app continuously compares completed minutes with the current week's target allocation.

Under-served buckets receive a bounded score boost in the next generated session. Buckets that already reached their weekly allocation cool down modestly so other needs get room.

This makes skipped or moved sessions recover naturally: there is no hard-coded 'Tuesday = tactics' rule to break.

### Protected urgent work

Weekly quotas do not override chess evidence.

Due reviews, recurring weaknesses, personal-game mistakes, checkpoint remediation and active prescriptions retain a priority floor even when their nominal bucket is already full. P21 therefore periodizes the plan without suppressing urgent forgetting or real-game failure signals.

### Pace-aware session advice

P21 reports:

- completed vs planned weekly minutes;
- expected progress through the current week;
- ahead / on-track / behind / complete status;
- largest remaining allocation gap;
- suggested next session duration and matching Quick / Standard / Deep mode;
- total planned minutes across the selected horizon.

When a plan is created or changed midweek, pace starts from the plan-change time rather than incorrectly treating earlier days as missed study.

### Explainability

Home exposes the current horizon, goal controls, weekly budget, next emphasis and per-bucket progress.

Generated activities carry a P21 periodization explanation showing which bucket they serve and why that bucket currently receives its multiplier.

Progress contains a dedicated P21 panel with the full weekly allocation and remaining minutes.

### Interaction with earlier phases

P21 does not replace the existing intelligence layers:

- P14 still decides the appropriate challenge and training mode;
- P18/P19 still govern active repair urgency and outcome validation;
- P20 still learns which prescription/action families transfer;
- P21 only adjusts how the week's finite study budget is distributed.

This separation keeps the planner understandable and prevents a weekly quota from becoming a hidden master score.

## Account sync

Point `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` at the same Supabase project used by the thiepn account system, then apply `supabase/migrations/001_chess_learning_state.sql`.

If there is no authenticated Supabase session, the app stays fully usable with local persistence.

Durable account state includes skill mastery, longitudinal analytics history, puzzle attempt history, games, game stories, repertoire progress, personal mistakes, assessments, certifications, saved Library studies, and the lightweight public Lichess link/sync metadata. Lichess credentials are not part of account state. The static puzzle/reference corpora themselves are not synced through the account backend.

## Architecture

Static curriculum lives in version control. Personal state lives behind a repository interface and can persist locally or to Supabase. Disposable engine calculations and board runtime state do not belong in account sync.

## Next phase

P22 — Plan Adherence, Goal Forecasting & Automatic Horizon Recalibration.
