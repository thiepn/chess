# P48 Material Contract

P48 is the cleanup layer after the route redesign. It prevents THIEPN Chess from drifting back toward generic SaaS cards, dashboard panels, glass surfaces and gradient decoration.

## Core rule

**The chess activity determines the surface.**

Content does not automatically receive a card. Most UI should live directly on the graphite workspace and gain structure through spacing, typography, separators, board frames, notation regions and narrow contextual rails.

## Surface types

| Surface | Material |
| --- | --- |
| App workspace | `#0D0F10`, no decorative gradient |
| Primary region | transparent / workspace background, separators as needed |
| Raised working region | `#191B1C` only when functional separation is necessary |
| Board | tactile frame + restrained shadow |
| Side tool / notation | flat, separated by 1px rule |
| Hint / concept note | flat with semantic left rule |
| Error / repair | flat with red/gold semantic rule |
| Popover / dialog | restrained raised graphite, token radius, modest shadow |

## Prohibited defaults

Do not introduce these as ordinary page composition:

- hero banners;
- marketing-style headline surfaces;
- generic session cards;
- KPI cards as default grouping;
- glassmorphism;
- blue-purple gradients;
- decorative radial gradients;
- glow shadows;
- 16–32px corner radii on normal content;
- every section inside an outlined rounded rectangle.

## Allowed exceptions

- the chessboard may have a tactile frame and restrained depth;
- a modal/popover may be raised because it overlaps the current layer;
- small status pills may use pill radius;
- semantic board highlights may use inset shadows;
- focus rings and check indicators may use temporary outline/glow effects for accessibility or chess state.

## Runtime compatibility

Some mature runners predate the P37 redesign. Their behavioral class names are retained to avoid risky logic churn, but P48 overrides their material presentation:

- `hint-card` → semantic note;
- `assessment-panel` → board-side assessment region;
- `game-side-panel` → board-side game region;
- `game-profile-card` → opponent context strip;
- `game-result-card` → result region;
- `endgame-technique-card` → technique note/row;
- `review-transfer-card` → transfer region;
- `lichess-card` → connected-service region;
- `model-game-card` → study/archive row.

New components should use semantic names rather than extending these legacy names.

## Regression gate

Run:

```bash
npm run design:audit
```

The Quality workflow runs this automatically.

The audit blocks:

- gradients in the rebuilt route/native/material CSS files;
- explicit border-radius values of 16px or larger in those files;
- deprecated hero/card classes in current TSX;
- accidental removal of the final P48 material layer.

## Cleanup performed

P48 removes obsolete CSS for the superseded curriculum browser, old Review dashboard, old Progress dashboard and P16–P25 analytics/planning presentation layers. This removes roughly 66 KB of raw CSS while preserving the underlying learning, analytics and planning logic.
