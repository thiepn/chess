# THIEPN Chess — Design System V2

Status: **P37 visual architecture lock**

This document is the authoritative visual and interaction contract for the post-P36 redesign. Existing P0–P36 learning, analysis, persistence, accessibility and engine behavior remains product truth unless a later phase explicitly migrates the presentation layer.

## 1. Product identity

Chess is a purpose-built chess application: a digital training table, interactive chess book, playing board, analysis desk and study archive.

It is **not** a SaaS dashboard, AI landing page or generic learning portal.

The primary visual object is the chess activity itself: board, position, notation, move list, lesson content or analysis state.

## 2. Non-negotiable rules

1. No giant sentence-style hero as the default page pattern.
2. No dashboard homepage before useful chess activity.
3. Train is the default product destination.
4. Train, Learn, Play, Review, Library and Progress are route-level pages, not full-screen dialogs.
5. The board receives the most visual weight whenever a chess position is active.
6. Progress may use analytics; the other primary pages must not be forced into dashboard composition.
7. Cards are semantic objects, not the default layout primitive.
8. The app uses graphite / warm ivory foundations with restrained functional color.
9. Primary workflows must remain usable with keyboard, touch, reduced motion and screen readers.
10. Existing learning intelligence stays in the background unless it changes the learner's next action.

## 3. Information architecture

Primary routes planned for P38:

- /train
- /learn
- /play
- /review
- /library

Secondary routes:

- /progress
- /settings

Nested route families:

- /train/session/:id
- /learn/:domain/:lessonId
- /play/game/:id
- /review/:gameId
- /library/repertoire/:id
- /library/model-games
- /library/studies

Desktop uses a compact top application bar. Mobile uses bottom navigation for the five primary destinations. Contextual side rails belong to individual pages and must not become a permanent enterprise-style sidebar.

## 4. Page identities

### Train — focused training room
Board-first. A compact training rail may choose Mixed, Tactics, Calculation, Endgames, Strategy or personal mistakes. Current instruction and coaching sit beside/below the board.

### Learn — interactive chess book
Curriculum/chapter navigation + teaching board + lesson explanation. Editorial typography is appropriate in restrained doses.

### Play — digital tournament board
Board, clocks, players, captured material and notation. Pre-game configuration disappears once play begins.

### Review — analysis desk
Board + notation + critical-moment teaching + evaluation context. This is intentionally the densest workspace.

### Library — study archive
Repertoire trees, model games, saved positions, endgames, games and studies. Opened items become board-centric study workspaces.

### Progress — player development record
The only page where analytics-heavy composition is a natural default. Still prefer chess-specific trends, skill maps and recurring mistakes over generic KPI cards.

## 5. Color contract

All new work must consume the `--chess-*` tokens in `src/design/tokens.css`.

Core foundation:

- app background: #0D0F10
- workspace: #131516
- raised workspace: #191B1C
- primary text: #F0EEE9
- secondary text: #ABA9A3
- muted text: #747570
- separator: rgba(255,255,255,.08)

Functional accent:

- interaction blue: #357BD8
- correct: #5FA77A
- error: #C86464
- concept / candidate: #C99C52

Do not reintroduce pervasive violet/blue radial glow as a page identity.

## 6. Typography

Routine application headings must remain subordinate to the board.

- page title: 24–30px
- exercise / lesson title: 22–28px
- section title: 18–22px
- routine page heading ceiling: approximately 32px

UI typography uses a compact high-legibility sans stack.

Editorial serif is allowed only where chess reading benefits from it: lesson names, openings, model games and major concepts. It must not become another marketing-hero device.

## 7. Shape and material

Prefer flat spatial regions, separators, rails, lists, notation surfaces and board-side tools.

Default radii:

- small controls: 6–8px
- medium controls: 8–10px
- major workspaces: 10–14px
- pills only when the semantic object is genuinely pill-like

Use shadows sparingly. The chessboard may have subtle physical depth; ordinary layout regions should not all float.

## 8. Board contract

**P39 implementation status: complete.** The board now uses the locked visual system:

- warm ivory / graphite default squares
- proper SVG chess pieces; no Unicode piece glyphs in the finished design
- integrated low-contrast coordinates
- blue selected / last-move semantics
- green correct semantics
- gold teaching / candidate semantics
- red danger / check semantics
- legal empty target dot
- capture target ring
- smooth move, capture, castling, promotion and flip animation
- keyboard and screen-reader behavior from P36 must survive the visual migration

## 9. Motion

Motion must explain chess state, not decorate cards.

Target durations:

- piece movement: 140–200ms
- interface response: 120–200ms
- page transition: approximately 150ms and subtle

Reduced-motion preference remains authoritative.

## 10. Responsive contract

Desktop:
- compact top navigation
- board-sized layouts determined by both width and height
- no permanent generic sidebar

Mobile:
- persistent bottom navigation outside active-game distraction-free states
- board uses nearly full width
- contextual content stacks below or beside the board based on orientation
- no stacked desktop dashboard

Tablet:
- landscape favors board + side context
- portrait favors board + contextual flow

Minimum touch target remains 44px; 48px is preferred for high-frequency mobile controls.

## 11. Modal policy

Appropriate modal/dialog use:
- settings
- confirmation
- import
- board/piece theme selection
- keyboard shortcuts
- small temporary configuration

Not allowed as modal-only primary surfaces:
- Train
- lesson
- active game
- game review
- repertoire
- model game
- Library
- Progress

## 12. Migration rule

P37 does not restyle every legacy surface. It introduces the locked contract and new tokens without mapping legacy `--bg`, `--surface` or other old variables to the new system. P38+ must migrate page architecture intentionally.

Do not "modernize" the current dashboard by recoloring it. Architecture changes before cosmetic cleanup.

## 13. Release-level visual acceptance

Before V1.0, the app should score at least:

- immediately identifiable as chess software: 9/10
- board visual quality: 9/10
- Train: 9/10
- Play: 9/10
- Review: 9/10
- mobile: 9/10
- visual identity: 8.5/10
- non-SaaS character: 9.5/10
- accessibility: 9/10

The governing principle is:

> The chess activity determines the interface. The design system supports it; it does not force every activity into the same template.


## P48 material contract

The visual architecture is not card-first. A surface should earn elevation by behavior, not by being a section.

### Default surface hierarchy

1. **Workspace** — app/route background with no container chrome.
2. **Region** — separated by a 1px divider or subtle background shift.
3. **Rail / notation area** — bounded by one or two separators; square or token-radius controls only.
4. **Board frame** — tactile, slightly raised, and allowed a restrained shadow.
5. **Popover / dialog** — legitimately elevated because it overlaps another interaction layer.

Ordinary lesson sections, game context, analytics groups, library rows and review explanations must not become floating cards.

### Shape

- controls: `--chess-radius-control`;
- board frame: `--chess-radius-board` / `--chess-radius-panel`;
- ordinary content regions: no radius by default;
- pills only for compact status/metadata where the pill shape carries meaning;
- no 16px+ radius values in rebuilt route CSS.

### Color and depth

- no decorative gradients in rebuilt route CSS;
- no violet/blue glow surfaces;
- primary blue is functional, not atmospheric;
- semantic green/gold/red indicate chess meaning, not decoration;
- shadows are reserved for the board and legitimate overlap surfaces.

### Legacy-component compatibility

Older training engines may retain behavioral class names such as `hint-card` or `assessment-panel`, but P48 visually normalizes them into notes, rails and side regions. New code must not create new hero/card architecture using deprecated surface classes.

### Enforcement

`npm run design:audit` checks:

- rebuilt route/material CSS for gradients;
- rebuilt route/material CSS for oversized radii;
- active TSX for deprecated hero/card surface classes;
- presence of the final P48 material layer after global styles.


## P49 motion contract

Motion communicates chess state. It does not decorate containers.

### Priority order

1. **Piece movement** — spatially connects source and destination.
2. **Move consequence** — capture, promotion, castling, check and rejection have distinct feedback.
3. **Reveal** — hints, solutions and analysis appear with short, low-amplitude motion.
4. **Navigation** — route transitions are brief and subordinate to content.
5. **Data change** — charts/meters animate only to show measured progression.
6. **Celebration** — optional, restrained, never blocks the board.

### Durations

- press feedback: about 90ms;
- legal-target / hint feedback: 120–170ms;
- route entry: about 150ms;
- normal piece move: about 180ms;
- capture / castle: about 220–230ms;
- promotion: about 270ms;
- chart draw: under 600ms.

### Prohibited motion

- floating card hover animation;
- repeated idle bobbing;
- parallax;
- long page transitions;
- animation that delays the next chess action;
- animation that hides notation or board state;
- rainbow/glow-heavy celebration effects.

### Reduced motion

`data-motion="reduced"` is authoritative. Route transitions bypass the View Transition API and all P49 board-impact, reveal, chart and tactile animations are disabled.

State changes must remain immediate and fully understandable without animation.

### Tactile feedback

Optional haptics/audio distinguish move classes where the chess event carries meaning:

- move;
- capture;
- castling;
- promotion;
- check;
- success/error;
- answer/hint reveal.

Sound remains opt-in. Haptics remain enhancement-only and must never be required to understand state.


## P50 mobile shell invariants

Mobile layout code must use the shared shell tokens rather than route-specific literal offsets:

- `--chess-mobile-topbar-safe-height`;
- `--chess-mobile-nav-safe-height`;
- `--chess-native-gutter`;
- `--chess-native-inline-start`;
- `--chess-native-inline-end`;
- `--chess-touch-min`.

Focused low-height landscape chess workspaces may suppress global chrome when keeping it would cover the board, notation or teaching context. The route must retain its own local exit/back affordance.

Full-bleed sticky regions must negate the actual safe inline gutter, not a hard-coded pixel value.


## P51 large-screen composition

Large screens do not justify unbounded layouts.

### Breakpoints

- below 1536px: P37–P50 normal desktop/tablet/mobile rules remain authoritative;
- 1536px+: large-desktop composition may allocate extra room to board/context tracks;
- 1920px+: ultrawide composition must center and bound the working area.

### Extra-space allocation

Use additional width in this order:

1. preserve comfortable outer margin;
2. allow the chessboard to grow to the route's large-board cap;
3. stabilize notation/context/rail widths;
4. increase separation only modestly;
5. keep prose at a readable measure.

Never make paragraph text or analytics columns expand simply because viewport width is available.

### Large board caps

- general board-centric workspaces: `--chess-board-max-large`;
- Review analysis: `--chess-board-max-review-large`.

Boards remain additionally constrained by viewport height so a wide but short display does not push controls below the fold.

### Ultrawide behavior

At 1920px+ the primary chess workspace is centered. Rails and context columns become stable/fixed-quality tracks instead of absorbing arbitrary extra width.


## P52 accessibility contract

Accessibility is part of the chess interaction model, not a parallel visual theme.

### Navigation and focus

- the app shell must expose a keyboard-visible skip link to `#main-content`;
- route changes update `document.title` and move focus to the main landmark without forced scrolling;
- visible focus must survive component-level `outline: none` rules;
- modal dialogs trap focus, close with Escape and restore prior focus;
- non-modal interaction settings move focus into the dialog but do not trap Tab.

### Chessboard

The board uses one roving `tabIndex=0` square and arrow-key spatial navigation.

Accessible names/status must expose:

- square coordinate and piece;
- selected state;
- legal move/capture target;
- king in check;
- last-move origin/destination and consequence;
- semantic highlight meaning;
- instructional arrows.

Board meaning cannot depend on color, sound, haptics or motion.

### Dynamic feedback

Use:

- `role="status"` / polite live regions for success, readiness and informational change;
- `role="alert"` for actionable errors;
- `role="progressbar"` with numeric values for measurable progress;
- `aria-pressed` for toggle/choice controls;
- `aria-current="step"` for current move/sequence position;
- `role="timer"` with `aria-live="off"` for chess clocks.

### Contrast modes

The default palette remains P37-authoritative. P52 additionally supports:

- `prefers-contrast: more`;
- Windows `forced-colors: active`;
- explicit visible focus rings independent of hue.

### Qualification boundary

Automated/static checks protect structure and regressions. Final release QA should still include manual keyboard-only operation and representative assistive-technology passes (NVDA/JAWS/VoiceOver/TalkBack where available).
