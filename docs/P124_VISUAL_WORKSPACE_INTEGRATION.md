# P124 — Exact-head learning workspaces and visual-root-cause integration

## Original custody
- Direct parent P123 [draft PR #111](https://github.com/thiepn/chess/pull/111), `p123-focused-runtime-visual-and-study-recovery`, exact SHA `56415cc5a9bd526c84e58ba69794fd6f0f824687`.
- Dedicated P124 child: `p124-verified-study-recovery-and-bundle-headroom`. No old branches, main or production changed.
- Historical P113–P123 PGNs, source/checkpoint IDs, Chess.js authority, unscored learning and existing native grading, owner/session draft policy, P51 responsive design, consent controls, 260 KiB initial and 321 KiB total compressed JS/CSS gates remain unchanged.

## Actual image evidence, not guessed from console
Retrieved the original P121 strict Visual Regression [run 38537787246](https://github.com/thiepn/chess/actions/runs/38537787246) [artifact 11880448740](https://github.com/thiepn/chess/actions/runs/38537787246/artifacts/11880448740) and examined expected/actual/diff images in a temporary local workspace. The differences are not uniformly faulty rendering:
- **Train desktop (~12% changed pixels):** In the actual capture the new P109–P112 position catalog is rendered directly inside the right preview-coach column, pushing the original session facts and next-focus content down and replacing the board-first information hierarchy. The original screenshot lacks that block. This is attributable to actual source `src/App.tsx` rendering `StrategicStudyLibrary` between `train-task-actions` and `train-session-facts`. P124 moves these original unscored study cases into an optional, labeled section *after* the primary Train room. The catalog retains the original source data, retry, launch and scoring boundaries; it now mounts lazily only after the user opens it, avoiding unnecessary work in the primary preview.
- **Review analysis phone (~32% changed) / desktop (~27% changed):** The new full-width `Refresh engine review` action appeared between the title and game-phase strip, displacing the actual opening strip and main chessboard downwards, leaving less room for analysis. Actual `src/components/GameStoryView.tsx` confirms this unconditional placement. P124 moves the same enabled/disabled/error/retry control *after* the primary analysis workspace, preserving discoverability without interrupting the initial board-first hierarchy. A source-dependent static chessboard's React key is made stable per game rather than changing for every selected historical ply and preview, relying on original ChessBoard FEN synchronization.
- **Train phone (~11% changed):** the expected/actual montage chiefly shows piece/square and minor board-spacing differences; the position-study catalog is not visible in that first viewport. P124 does **not** claim this entire screenshot is repaired by moving the catalog.
- **Learn-lesson phone (~19% changed):** the actual first viewport includes `Begin lesson` and `Practice positions` buttons absent in the expected image. These may be intentional new learner actions; P124 does not remove them merely to match an old image.
- Other mismatches remain under manual evidence review. Original 0.5% pixel limit and baseline PNGs remain untouched. No new screenshot comparison or human design approval is claimed.

## Source changes and behavioral acceptance
- `src/App.tsx`: optional positional study content now has a separate post-room disclosure button with responsive margin, conditional React mount, and correctly populated `aria-expanded`/`aria-controls`; initial three-column learner preview and all its original controls remain first.
- `src/components/GameStoryView.tsx`: reanalysis now follows the review board without changing API ownership, handling, saved game persistence or refresh error.
- `src/styles/p47-train-native.css`: modest responsive visual separation for the optional study section; no global redesign or altered viewport CSS.
- `tests/ux/chess.ux.spec.ts`: focused checks authored to detect regression in initial Train location/mounting and relative Review reanalysis placement. **NOT_RUN**, no manual CI triggered.

## Budget and qualification limits
The P121 reference production build reported 230.5/260 KiB initial and 320.7/321 KiB global gzip, leaving only ~0.3 KiB. P122–P124 have modified source import/render structure; P124 now avoids rendering or fetching optional study UI on initial Train entry, but this proves only a reduced *runtime mount*, not a numeric change in Vite's global minified+gzip output. The local container cannot reach the GitHub repository for an exact source checkout (`Could not resolve host: github.com`), and no original complete source ZIP is attached. **P124 exact-head gzip delta, full TypeScript/Vite build, real runtime, browser tests and physical device acceptance are NOT_TESTED/NOT_MEASURED**. Never claim passing original 260/321 KiB caps without an exact-head build. Test additions do not change production bundle by design. No budget relaxation, baselines replaced, CI runs manually dispatched, merges or deployments.

## Remaining release blockers
1. Obtain an exact P124 checkout in a build-capable environment to run only targeted build/perf checks, and make further lean source changes if global 321 KiB cap is exceeded.
2. Inspect/decide remaining actual visual diffs; then repair actual source issues or explicitly approve each baseline through separate human review. No automatic snapshot acceptance.
3. Verify current-owner drafts, private/guest Account, notebook portability, historical reveal and legal chessboard interaction in real browser/phone flows, with offline recovery and actual Stockfish test.
4. Authenticate Chess OAuth client, perform human accessibility/visual acceptance and separate authorization before any mainline integration or deployment.
