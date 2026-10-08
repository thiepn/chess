# P64 — Premium Chess Visual Refinement

Status: **draft implementation / not a production visual sign-off**.
Dependency stack: P64 → P63 → P62 → P61 → main.
Authoritative specification: `DESIGN_SYSTEM_V2.md` (P37).

## Reviewed reference states

Visual snapshots: Train, Learn, Play mobile, Review desktop and Progress desktop (1440×900 and 393×852 current baseline). These snapshots show the actual existing site design, not a generated concept rendering.

Observed problems:
- Train's narrow queue cuts off meaningful exercise titles.
- Board piece silhouettes can become visually weak on same-valued dark squares.
- Fine-print application metadata ranges from 7–10 px (not readable at normal viewing distances).
- Progress displays a large chart with little or no measured evidence.
- Review and Learn have strong layout identities but underweighted text; there is no need to add generic cards, marketing heroes, or glows.

## Scope of changes

1. **Board material and affordances:** refined tournament square values, stronger black/white SVG piece contrast, accessible coordinate scale, more precise selected-square and last-move feedback. Walnut/slate customization remains independent.
2. **Legibility:** raise supporting typographic scale and text contrast in Train, Learn, Play, Review and Progress without allowing routine headings to overpower the board.
3. **Train:** widen the desktop queue rail only where screen width permits and allow two-line lesson titles. Preserve narrow/mobile one-line state to protect board width.
4. **Learn + Review:** increase editorial explanatory copy and notation context legibility; keep visual grammar of interactive book/analysis desk.
5. **Progress truth:** if total tracked history is less than two samples, replace the deceptively tall eight-week line chart with a compact honest next-step explanation linked to Train. Charts with enough evidence are unchanged, apart from enlarged labels.
6. **Responsive and accessibility:** retain native five-tab phone navigation, 64 interactive squares, focus ring, legal-target marks, reduced motion and P63 promotion choice; no ornamental looping animation.

New CSS: `src/styles/p64-premium-finishing.css`. Imported after P59B so it stays an explicit auditable layer. Added to the flat-material design audit (no gradients, no 16px+ radii). Tests in `tests/ux/chess.ux.spec.ts` cover empty-data Progress and chessboard geometry/legibility.

## Visual regression policy

**P64 intentionally changes screenshot pixels.** Existing P59 screenshots in `tests/visual/chess.visual.spec.ts-snapshots` are **not** the new approved baseline. A Visual Regression failure against the old approved images is therefore expected and must not be bypassed or reclassified as a successful visual sign-off.

Before visual approval:
1. Generate the nine route screenshots at both desktop and phone at the pinned baseline environment; add critical game/review states where needed.
2. Perform side-by-side human QA for board legibility, selected states, text scale, typography, mobile overflow, iPad portrait/landscape and dark-theme variants.
3. Approve the changed reference captures and commit corresponding binary snapshots; re-run unmodified screenshot comparison.
4. Keep Playwright no-horizontal-overflow tests, material audit, accessibility, motion and performance budgets enabled.
5. Confirm keyboard, touch, TalkBack/VoiceOver and 200% text zoom on real devices.

## Release block list

- P61 Account migration was applied but authenticated live sync/two-device conflicts are not yet accepted.
- P62 has outstanding simulated Device UX failures in reload/recovery journeys.
- P63 still has 49 lessons without an independent transfer position and awaits instructor-level quality checks.
- P64 screenshot rebaselining/human visual approval is pending. No 9/10 claim solely from CSS edits.

P65 should be an integrated device and release-candidate qualification stage once the earlier blockers are actually resolved.
