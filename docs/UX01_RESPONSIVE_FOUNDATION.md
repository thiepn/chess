# UX01 — Responsive foundation (draft, no release)

## Exact provenance
- Qualified base: Chess G2 draft PR #119 at `6f86f1339f2f608049e9ee2f8d506fd6deeaf1d8`.
- Verified public `main` at `a0fdc5e6f944df560166f9458e2f049cfe14f692`; histories diverge by two newer main commits. Do not merge/rebase this stack implicitly.
- Upgrade branch: `feature/chess-ux01-responsive-foundation-20261022`. Parent G0/G1/G1B/G1C and G2 remain untouched.

## Root causes and implemented ownership
- Lazy-loaded page modules historically imported 15 page stylesheets; their injection order could compete with the top-level mobile viewport stylesheet.
- All 15 page styles now load centrally via `src/main.tsx`, before the existing material, motion, accessibility, finishing, study and mobile viewport layers. Page modules no longer import these styles as side effects.
- The final, single `src/styles/mobile-app-viewport.css` removes the late contradictory “mobile progression regression” and landscape recovery rules. The earlier first-screen grid and internal reading scroll are authoritative.
- On compact portrait lessons, board geometry uses `44svh` as an available-height cap instead of independently growing beyond the controls. The lesson action row is never placed in a fixed overlay: it remains a nonshrinking part of the lesson-instruction column; large evidence/error text gets an internal scroll region.
- Live games preserve the existing separate, independently scrollable move list and existing on-screen session action row. Catalog/list screens can retain contained scrolling.
- Top-level `AGENTS.md` adopts the already-published functional-copy policy from `main`. No game, curriculum, grading, Review, source ownership, account, persistence or service-worker behavior is modified.

## Scope and residual limitations
- This is a layout-cascade foundation, **not** final redesign of Train/Play/Learn/Review/Library/Progress.
- The old global `src/styles.css` and legacy P47–P107 visual rules still exist; they are now deterministic but not yet unified into component-level styles. UX02–UX09 should replace page-by-page presentation without another postscript CSS patch.
- The two nested mobile activity layouts still need real device testing for 320×568, 360×640, 393×852, landscape and standalone PWA. Long analysis/history text may scroll only inside its dedicated region; controls must remain reachable.
- The exact-head build, Vite CSS extraction, original and revised Playwright UX journeys, Vitest, and Account/Review continuity must pass before integration. Draft PR CI can be skipped and cannot be represented as a PASS. No merge, deployment or live data writes were performed by this phase.

## Acceptance to promote this foundation
1. Every imported stylesheet in `src/main.tsx` loads before `mobile-app-viewport.css`; all lazy page modules remain stylesheet-free.
2. App activity routes keep the outer document stable, preserve zoom, and never discard Continue/Finish/Exit/Resign/Review controls or saved data.
3. On supported short phones, the chessboard, clocks and available actions fit the visible activity viewport; lesson body and game moves may scroll independently.
4. Execute the node viewport source tests, full build, dedicated phone/landscape browser tests, and exact-head screenshots before approving. Repair reproduced issues on this branch.
