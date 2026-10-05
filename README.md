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
- Local-first durable state
- Optional Supabase persistence using the shared authenticated user
- Responsive Home and session runtime shell
- Reduced-motion and keyboard-friendly interaction defaults

The curriculum is now a complete beginner-to-intermediate course rather than a representative seed graph. P3 established the visual lesson engine; P4 supplies scalable practice; P5 converts real games into evidence; P6 keeps opening study compact and concept-first; P7 makes Play part of the learning system; P8 turns engine output into a visual game story; P9 provides a serious free-study workspace; P10 standardizes interaction quality; P11 fills the course with a coherent 68-skill progression and authored lesson coverage; P12 makes progression evidence-based instead of equating lesson completion with competence; P13 makes the resulting player model interpretable across time instead of exposing only the latest score.

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

## Account sync

Point `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` at the same Supabase project used by the thiepn account system, then apply `supabase/migrations/001_chess_learning_state.sql`.

If there is no authenticated Supabase session, the app stays fully usable with local persistence.

Durable account state includes skill mastery, longitudinal analytics history, puzzle attempt history, games, game stories, repertoire progress, personal mistakes, assessments, certifications, and saved Library studies. The static puzzle/reference corpora themselves are not synced through the account backend.

## Architecture

Static curriculum lives in version control. Personal state lives behind a repository interface and can persist locally or to Supabase. Disposable engine calculations and board runtime state do not belong in account sync.

## Next phase

P14 — Adaptive Training Policy, Difficulty Calibration & Automatic Intervention Selection.
