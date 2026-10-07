# P49 Motion Contract

P49 makes movement explain chess state. Motion is not a generic polish layer.

## Chess-first motion

### Piece move

A piece visibly travels from its source square to the destination. The destination receives a brief impact treatment so the eye can settle on the new state.

### Capture

Capture uses a slightly firmer arrival and a red-tinted destination impact. It is still brief enough that the next move can begin immediately.

### Castling

King and rook share the existing dual-move behavior. P49 gives the action a distinct settle treatment and dedicated optional haptic/audio signature.

### Promotion

Promotion uses a stronger scale/opacity transition because the piece identity changes at the destination. It also receives its own optional tactile signature.

### Check / illegal move

Check remains a board-state ring. Illegal moves use a short rejection shake. These are separate from move-success motion.

### Board flip

Orientation changes use a short fade/scale settle. Pieces are never visibly rotated upside down.

## Reveal motion

Use short reveal motion for:

- lesson hints;
- successful lesson feedback;
- puzzle explanation;
- coached best-move reveal;
- Review comparison/continuation;
- Library engine analysis result.

The motion should make the newly available information easy to locate, not dramatize it.

## Navigation

Primary route transitions use the browser View Transition API when available.

Fallback behavior is immediate. The application must never depend on animation support.

## Progress/data motion

Progress animation is reserved for quantitative change:

- mastery/retention/transfer trend draw;
- weekly training completion;
- phase performance;
- allocation meters;
- certification state.

## Touch

Touch controls receive a subtle press scale in addition to optional device haptics.

No interaction requires haptics or audio.

## Celebration

Celebrations remain optional and are intentionally restrained. Particles use chess/app colors (blue, ivory, gold) instead of generic rainbow confetti.

## Reduced motion

When `data-motion="reduced"` is active:

- route View Transitions are bypassed;
- piece/impact animation is disabled;
- arrows/legal-target entrance animation is disabled;
- solution/analysis reveal animation is disabled;
- chart/meter animation is disabled;
- control transitions are disabled;
- celebrations do not render.

The resulting application remains fully functional and visually explicit.

## Regression gate

Run:

```bash
npm run motion:audit
```

The audit verifies:

- route View Transition support and reduced-motion bypass;
- board origin/destination impact state;
- distinct castling/promotion feedback;
- answer/hint reveal feedback;
- P49 motion-layer loading;
- reduced-motion coverage.

The standard material audit also covers `p49-motion.css`, preventing gradients and oversized radii from entering the motion layer.
