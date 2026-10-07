# P52 Accessibility Requalification

P52 requalifies accessibility after the P37–P51 structural, responsive, material and motion migrations.

## Keyboard navigation

### App shell

- A visible-on-focus skip link targets `#main-content`.
- Primary top and mobile navigation remain keyboard-operable.
- Route changes move focus to the main landmark.
- Route changes update the document title.
- The global Train shortcut ignores text inputs, contenteditable controls and dialogs.

### Chessboard

The board preserves the existing roving-tabindex model:

- Arrow Left / Right — adjacent visible square within the rank;
- Arrow Up / Down — same file on the adjacent visible rank;
- Home / End — first/last square in the current visible rank;
- Enter / Space — select piece or destination;
- Escape — clear current board selection.

The orientation-specific square list means keyboard movement follows the visual board orientation.

## Screen-reader board semantics

The grid exposes:

- orientation;
- keyboard instructions via `aria-describedby`;
- 8 row / 8 column counts;
- one tabbable gridcell at a time;
- square coordinate, piece and color;
- selected square;
- legal move vs capture target;
- check state;
- last-move origin/destination;
- capture/promotion/castling consequence;
- focus/good/danger/hint semantic highlights.

A polite atomic live region announces selection, legal-move counts, check, move consequences and instructional arrows.

Disabled/presentation boards announce themselves as previews and remain inspectable with arrow keys.

## Focus management

### Route changes

Focus moves to the main landmark using `preventScroll: true`.

### Interaction settings

The trigger exposes:

- `aria-expanded`;
- `aria-controls`;
- `aria-haspopup="dialog"`.

Opening the panel moves focus into the first control. Escape closes it and returns focus to the trigger.

### Coached Review modal

The true modal:

- has `aria-modal="true"`;
- is labelled by its visible heading;
- receives initial focus on the close control;
- traps Tab / Shift+Tab;
- closes on Escape;
- restores the previously focused control on unmount.

## Dynamic feedback

P52 adds programmatic status semantics to:

- lesson success/error/hints;
- puzzle success/error/hints/engine verification;
- opening hints and concept feedback;
- endgame recognition/status/results;
- calculation current stage/results/engine status;
- assessment progress/results;
- Review analysis progress/errors/batch state;
- Lichess sync/error state.

## Selected and current state

The following no longer rely on color alone:

- Play side/time/opponent/scenario selection — `aria-pressed`;
- Review player color — `aria-pressed`;
- Review phase and preview mode — `aria-pressed`;
- Review notation/current critical moment — `aria-current="step"`;
- Endgame recognition choice — `aria-pressed`;
- Library favorite — `aria-pressed`;
- Library current move — `aria-current="step"`;
- Calculation current phase — `aria-current="step"`.

## Timers and progress

- game clocks use `role="timer"` with accessible labels and `aria-live="off"` to avoid per-second screen-reader spam;
- Review analysis uses numeric `role="progressbar"` values;
- Assessment uses numeric `role="progressbar"` values.

## Focus visibility and contrast

`src/styles/p52-accessibility.css` loads after material/motion CSS.

It guarantees focus-visible treatment for:

- anchors;
- buttons;
- inputs;
- selects;
- textareas;
- summaries;
- explicit tabindex targets;
- chessboard squares.

It also adds:

- `prefers-contrast: more` separator/text strengthening;
- `forced-colors: active` board-selection/legal-target/focus handling.

## Existing contracts preserved

P52 retains:

- 44px coarse-pointer minimum targets from P47/P50;
- reduced-motion behavior from P49;
- color-independent text/status labels from the rebuilt route architecture;
- safe-area behavior from P47/P50.

## Automated gate

Run:

```bash
npm run a11y:audit
```

The audit checks the structural contract for:

- skip navigation;
- route focus restoration;
- board screen-reader semantics;
- dialog ownership/focus behavior;
- modal focus trapping;
- live feedback;
- progress bars;
- selected/current states;
- game timer semantics;
- Lichess field/feedback naming;
- focus/contrast CSS.

The normal Vitest suite continues to exercise board keyboard-navigation logic.

## Manual qualification still required

P52 does **not** claim that physical assistive-technology environments were operated where they were not available.

Before the final release candidate, representative manual passes should include:

- keyboard-only desktop traversal;
- NVDA + Chromium/Firefox where available;
- VoiceOver + Safari where available;
- TalkBack + Android Chromium where available;
- browser zoom at 200%;
- Windows High Contrast / forced colors;
- system reduced motion;
- touch + screen-reader focus on a mobile device.

Any issues found there should be fixed as release defects without reopening the product architecture.
