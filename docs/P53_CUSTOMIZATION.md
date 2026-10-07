# P53 Theme & Board Customization

P53 adds a deliberately small customization layer to the stable THIEPN Chess visual system.

## Why the set is small

The goal is not a theme marketplace.

Customization should let a player make the training table feel more comfortable without:

- changing route architecture;
- weakening the THIEPN identity;
- making semantic feedback inconsistent;
- adding novelty skins;
- creating a maintenance matrix of dozens of combinations.

P53 therefore ships 3 × 3 × 3 curated appearance choices.

## App finish

### Graphite

Default.

- app: `#0d0f10`;
- workspace: `#131516`;
- raised: `#191b1c`.

This remains the reference theme for visual QA.

### Obsidian

A deeper neutral finish for users who prefer near-black surfaces.

It changes neutral backgrounds and separators only.

### Warm graphite

A slightly warmer charcoal finish intended for long reading/study sessions.

It remains low-chroma and does not become brown/orange UI chrome.

## Board palettes

### Tournament

Default:

- light: `#d5cebd`;
- dark: `#62665f`;
- frame: `#171918`.

### Walnut

- light: `#d9c5a5`;
- dark: `#805f45`;
- frame: `#211915`.

There is no simulated wood texture. The board remains crisp and digital.

### Slate

- light: `#cbd1ce`;
- dark: `#59666a`;
- frame: `#121719`.

## Piece treatments

All options use the same deterministic SVG Staunton geometry.

### Classic

The P39 reference treatment.

### Club

- slightly larger visual scale;
- stronger outline/detail weight;
- higher-contrast light/dark piece treatment.

### Minimal

- slightly smaller visual scale;
- quieter outline/detail weight;
- reduced visual density for analysis-heavy work.

These are piece treatments rather than novelty piece sets.

## Semantic colors are locked

P53 does not expose controls for:

- `--chess-color-accent`;
- `--chess-color-correct`;
- `--chess-color-error`;
- `--chess-color-concept`.

Selection, correctness, danger/check and hint meaning therefore remain stable across every combination.

## Persistence and migration

The fields are stored in `ExperienceSettings`:

```ts
appTheme: "graphite" | "obsidian" | "warm-graphite"
boardTheme: "tournament" | "walnut" | "slate"
pieceStyle: "classic" | "club" | "minimal"
```

`normalizeExperienceSettings()` upgrades older persisted objects by filling missing values.

Unknown/corrupt future values fall back individually to:

- Graphite;
- Tournament;
- Classic.

Changing any Experience setting writes the normalized full object back through the normal repository persistence path.

## Application model

`ExperienceProvider` publishes:

- `data-app-theme`;
- `data-board-theme`;
- `data-piece-style`;
- existing `data-motion`

on the document root.

Board palettes are implemented as CSS variables, so Train, Learn, Play, Review, Library and all training runtimes receive the same board automatically.

Piece style is also passed explicitly to rendered SVG pieces so previews and non-board player markers are consistent.

## Experience dialog

Appearance controls use real buttons with `aria-pressed`.

Each option exposes:

- human-readable label;
- descriptive accessible name;
- compact visual preview.

**Reset appearance** resets only:

- app finish;
- board;
- pieces.

It does not reset motion, sound, haptics or celebrations.

## Accessibility and forced colors

The P53 stylesheet loads before P52.

P52 therefore remains authoritative for:

- focus indicators;
- `prefers-contrast: more`;
- Windows forced colors;
- selected/current non-color indicators.

The theme selector itself also preserves a visible pressed-state border in forced-colors mode.

## Automated qualification

Run:

```bash
npm test
npm run theme:audit
```

Vitest verifies:

- the exact curated option sets;
- pre-P53 saved-setting migration;
- valid saved customization;
- invalid-value fallback.

The theme audit verifies:

- persisted type fields/defaults;
- normalization wiring;
- root data attributes;
- accessible selector state;
- board/piece integration;
- presence of every theme selector;
- protected functional semantic colors;
- P53/P52 stylesheet ordering.

The existing material, accessibility, mobile, desktop and motion audits remain active for all P53 changes.
