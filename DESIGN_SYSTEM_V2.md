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

P39 will replace the legacy visual board system. The target behavior is already locked:

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
