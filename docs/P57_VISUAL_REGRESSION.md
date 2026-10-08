# P57 — Visual Regression Suite

## Purpose

Protect the chess-specific P37–P56 visual direction against accidental drift. Primary
workspaces are real pages, boards lead when a position is active, and narrow phone
layouts are intentional rather than desktop cards collapsed into a SaaS dashboard.

## Screen coverage

| State | Desktop | Phone |
| --- | --- | --- |
| Train room | 1440 × 900 | 393 × 852 |
| Learn course | 1440 × 900 | 393 × 852 |
| Play setup | 1440 × 900 | 393 × 852 |
| Review games index (with seeded game) | 1440 × 900 | 393 × 852 |
| Library index (with seeded study) | 1440 × 900 | 393 × 852 |
| Progress | 1440 × 900 | 393 × 852 |
| Learn lesson detail | 1440 × 900 | 393 × 852 |
| Reviewed game workstation | 1440 × 900 | 393 × 852 |
| Library saved-study workstation | 1440 × 900 | 393 × 852 |

Total: **18 viewport snapshots**. The test fixture contains one valid PGN
game, a reviewed decision, one saved study and a reproducible mastery profile.

## Deterministic conditions

- Playwright **1.56.1**, pinned Chromium, Ubuntu **24.04** CI runner
- One browser worker, fixed clock (2026-10-08T08:00:00Z), locale en-US
- Europe/Berlin timezone, light color scheme, reduced motion, DPR 1
- Fixed viewport sizes, disabled screenshot animations and caret
- 250 ms post-hydration settle, await loaded view and document fonts
- Visible viewport rather than whole scrollable page to avoid content-length
  noise. P58 separately qualifies real scrolling and browser UI behavior.
- Maximum difference: **0.5% pixels**, plus Playwright color threshold 0.2

## How to run

```bash
npm install
npx playwright install chromium
npm run build
npm run visual:verify
```

To *intentionally* update screenshots locally after reviewing the visual changes:

```bash
npm run visual:update
git diff -- tests/visual/chess.visual.spec.ts-snapshots
```

Do not automatically regenerate baselines on ordinary pull requests. Snapshot
updates must be reviewed as part of the code change.

## CI and recovery

`Visual Regression` verifies snapshots on pull requests and on pushes to main
that change the app or snapshots. A mismatch fails the check; CI stores actual
images and diffs in a downloadable artifact for 14 days. A missing baseline
is an error, not a reason to silently bless new screenshots.

Initial bootstrap on the P57 implementation branch may generate the first
PNG set using a temporary, branch-restricted workflow. Remove that temporary
workflow before merging into main. The permanent workflow is read-only.

## Regression found and repaired

Initial baseline inspection found that the mobile Play setup's scenario scroller
expanded an intrinsic CSS grid track to 2,650 px at the 393 px phone viewport.
This centered the chessboard off-screen while leaving a large blank area.
P57 repairs mobile grid min-sizing and includes a browser-level assertion that
the board is at least 90% in the viewport, with document width no greater than
395 CSS px. The approved Play screenshot must visibly contain the board.

## Limitations

This does **not** replace P58 real-device testing (Safari, iPad, Samsung, installed
PWA chrome, touch targets, keyboard opening, orientation changes), nor does it
certify the visuals as high-quality—that is P59's design QA gate.
