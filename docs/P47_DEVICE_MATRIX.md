# P47 Device Matrix

P47 treats mobile and tablet as first-class layouts, not reduced desktop.

## Qualification viewports

| Class | Reference viewport | Expected behavior |
| --- | --- | --- |
| Small phone portrait | 360 × 800 | One-column board-first flow, 44px+ touch targets, bottom nav safe area |
| Modern phone portrait | 393 × 852 | Board uses available width, route rails scroll horizontally, sticky actions remain reachable |
| Large phone portrait | 430 × 932 | Same information hierarchy without oversized whitespace |
| Phone landscape | 844 × 390 | Active board workspaces suppress nonessential global chrome and use split board/context layouts |
| Compact tablet portrait | 768 × 1024 | Route-local rails become horizontal or subordinate; board/record gets primary width |
| Tablet portrait | 820–834 × 1180–1194 | Board-first Learn/Play/Review/Library, compact Progress record |
| Compact tablet landscape | 1024 × 768 | Board + context/notation remain side-by-side |
| Large tablet landscape | 1180 × 820 | Three-region layouts permitted where they remain readable |
| Desktop control | 1440 × 900 | P37–P46 desktop composition remains authoritative |

## Cross-route acceptance

- No horizontal page overflow at the target portrait widths.
- Primary touch controls are at least 44 CSS px on coarse pointers.
- Bottom navigation respects `env(safe-area-inset-bottom)`.
- Route-local sticky actions never sit underneath the bottom navigation.
- Active Train and Play hide the bottom navigation.
- Low-height landscape prioritizes the board and makes secondary context independently scrollable.
- No primary route is implemented as a modal.
- Board orientation, move interaction and keyboard behavior remain unchanged.
- Reduced-motion behavior remains authoritative.
- Desktop layouts above the native breakpoints remain unchanged unless a tablet rule explicitly applies.

## Route expectations

### Train

Portrait: session controls and queue are compact/horizontal, then board, then coach/actions.

Landscape active runtime: board on the left, exercise/context on the right, with global chrome removable in constrained height.

### Learn

Portrait lesson: step rail, board, reading.

Landscape lesson: board + reading side-by-side; lesson outline can disappear when height is the limiting dimension.

### Play

Portrait setup: board first, then compact setup controls.

Active landscape game: player strips + board left, move/objective panel right.

### Review

Portrait: board first, bounded move notation second, explanation third.

Landscape: board, notation and insight can coexist across the viewport.

### Library

Portrait resource: board first, controls second.

Landscape resource: board/move strip left, analysis/editor controls right.

### Progress

Portrait/tablet: practical-strength record and trajectory lead. Stage progression becomes horizontally browsable where appropriate; technical planning remains subordinate.
