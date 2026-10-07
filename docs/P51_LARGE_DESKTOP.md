# P51 Large-Desktop Composition

P51 qualifies THIEPN Chess for large and ultrawide desktop displays without changing the product into a dashboard.

## Viewport tiers

### Normal desktop

Below 1536px, the existing P37–P50 layouts remain authoritative.

### Large desktop — 1536px+

Large screens may:

- grow board-centric working lanes;
- stabilize rails and context panes;
- expose more notation/context at once;
- use slightly larger outer workspace caps.

They should not increase prose line length or introduce giant gaps.

### Ultrawide — 1920px+

The working composition becomes explicitly bounded and centered.

Extra monitor width becomes peripheral breathing room instead of content stretch.

## Shared caps

P51 adds:

- `--chess-board-max-large: 48rem`;
- `--chess-board-max-review-large: 46rem`;
- `--chess-context-width-large: 24rem`;
- `--chess-rail-width-large: 12.5rem`;
- `--chess-workspace-max-wide: 104rem`;
- `--chess-workspace-max-analysis: 100rem`;
- `--chess-reading-max: 68ch`.

## Route behavior

### Train

1536px+:

`session rail | board | coach`

The board lane receives most flexible width. Rail and coach remain stable.

On tall displays the board may reach 48rem.

### Learn

Course pages keep the reading/content area bounded.

Lesson pages use:

`lesson rail | board | reading`

The reading pane remains approximately 320–390px and lesson prose is line-length constrained.

### Play

Setup and live games use:

`board | setup/context`

The board can grow on tall displays while opponent/setup controls remain a stable 360–380px pane.

### Review

Analysis uses:

`board | notation | insight`

Notation remains narrow and scan-friendly; teaching insight remains bounded. Review board cap is 46rem.

### Library

Archive pages do not stretch collection rows indefinitely.

Analysis uses:

`board | analysis/editor controls`

The editor/control pane remains stable while the board receives flexible width.

### Progress

Progress may use more width for charts and quantitative comparisons.

Textual explanation retains the shared reading measure.

## Tall displays

Large-board growth is enabled only where viewport height supports it.

Wide-but-short screens remain height-bounded to keep controls and notation accessible without unnecessary scrolling.

## Code splitting

P51 styles are route-specific:

- `p51-learn-large.css`;
- `p51-play-large.css`;
- `p51-review-large.css`;
- `p51-library-large.css`;
- `p51-progress-large.css`.

Only `p51-train-large.css` loads with the default App/Train chunk.

## Automated gate

Run:

```bash
npm run desktop:audit
```

The gate verifies:

- 1536px+ large-desktop rules;
- 1920px+ ultrawide rules;
- no mobile/tablet breakpoints in P51 files;
- route-local CSS imports;
- bounded board tokens;
- bounded Learn/Progress reading measures;
- material compatibility.

P51 does not claim physical inspection on every ultrawide monitor. Real-device/browser qualification remains part of the later release QA phases.
