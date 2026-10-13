# P113 — Historical Master Games & Critical Decisions

## Stacked parent
- Parent: P112 [draft PR #100](https://github.com/thiepn/chess/pull/100), `p112-endgame-decision-conversion-chains`, SHA `986f2fcc919cfef6ccba4c17315fa5579e37c1ed`.
- Feature branch: `p113-strategic-master-game-decisions`. This branch is not merged or deployed.

## Actual product surface
Course → Model Games → **Open master-game workspace**. The original four scored P33 model games and their existing results/writers remain untouched.

The P113 workspace loads **eight additional historical PGN records** only when opened, creating a total of **twelve complete historical study games across the two connected native surfaces**. The eight P113 journeys offer **32 source-aware decision pauses** (four per game) with three original writing fields: candidate move and plan, opponent resistance, and revised transfer. These are unscored learner self-checks, not automatically graded performances.

Learners can:
1. Navigate the **entire legal move history**, jump to specific critical decisions, use move stepping and historical replay.
2. Write a candidate plan and an opponent objection before comparing against the **actually recorded** moves.
3. Inspect the original authored model comparison, misconception-specific guardrail, and defender transfer prompt.
4. Try **up to eight alternative legal plies** on the original ChessBoard using chess.js, then reset to the historical position.
5. Mark their own decision as understood or needing another attempt and recover the writing draft after an interruption during the same owner-specific browser session.

A **source qualification gate** loads and legally replays the complete PGN before showing a game, checks recorded result, unique source IDs, checkpoint bounds, provenance and line continuity. Any malformed game is excluded with a visible warning; the system never manufactures a repaired historical line.

## Authorship and source rights
The new archive uses the factual event, player, result and move scores from [mcostalba/chess_db — great_masters.pgn](https://github.com/mcostalba/chess_db/blob/master/pgn/great_masters.pgn). **No original author's book-based commentary, annotations or variations are redistributed.** Its old PGN notation (e.g. `0-0`, `...Ba8`, abbreviated capture notation and move numbers lacking periods) was normalized in the score transcription without adding fictitious game moves. The source repository is GPL-3.0; factual game scores are distinguished from protectable source prose. All new P113 decision, feedback and transfer text is newly authored for this application.

P113 does **not** claim that any historical move was engine-best, any particular defender reply was forced, any game was tablebase-proven or any written answer was evaluated objectively. The chosen decision pauses are board-anchored instructional prompts based on the recorded moves, **not expert-annotated proof that all 32 points are objectively critical**.

## Native authority and privacy
- Reuses `ChessBoard` and `chess.js` replay. No second rules engine, global learner store, rating authority or completion writer.
- The P113 text drafts are owner-namespaced in `sessionStorage`, versioned, size-limited and expire at 24 h. They are **not** Account sync, persisted mastery or certification.
- Existing P33 scores, repertoire links, model-game checkpoints, saved studies and historical IDs are unchanged. The existing scored trainer remains the place for graded checkpoint work.
- The new game archive is delivered from `public/data/model-games/p113-master-games-v1.json` under the configured Vite base path, and the native workspace is a lazy-loaded module with co-loaded CSS.

## Verification scope
A focused `masterGames.test.ts` was added to check 8 legal PGNs, 32 historical moves, factual source gating and refusal of malformed records. **No tests, production build, manual CI, device acceptance or performance measurements were manually run during implementation.** Actual results, gzip budgets and runtime visual acceptance must not be claimed as passing without the automatic exact-head reports. Production build limits remain unchanged at 260 KiB initial and 321 KiB all-app JS/CSS gzip.

## Known limitations and next improvement
- The P113 authored comparisons deliberately restrict conclusions to observable move history. Deep alternative lines and engine-best assessments are not provided; local variation replay is legal-move exploration without evaluation.
- Free historical navigation intentionally allows revealing future moves; this is not an exam environment.
- Session-only drafts are not a durable synchronized cross-device journal.
- The eight P113 games are additional to, not replacements for, the four existing scored studies.
- Human UX and production constraints are **NOT_TESTED** unless separately verified on exact head.
