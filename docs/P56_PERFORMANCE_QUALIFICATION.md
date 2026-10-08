# P56 — Performance & Route Optimization

## Scope and implementation

P56 optimizes fetch, execution and UI work without changing the established chess-specific route layout.

- Ten training/runtime components, including GameArena, are imported lazily by Train. GameArena is also lazy in Play, with hover/focus intent warm-up. Review lazily loads the deep GameStoryView workstation, keeping the history index lighter.
- Existing Learn, Review, Play, Library, Progress and Learn-subsection routes remain dynamically imported.
- A single likely next route is preloaded after 2.4 seconds on Train, Play, Review or Library. Prefetch is canceled when the route changes; `saveData`, effective 2G or background tabs suppress it.
- ChessPiece is React-memoized, retaining the same SVG, geometry, role and accessible labels.
- Review history and Library study/game collections show 40 entries initially and expose remaining entries in bounded increments. All collections remain reachable; changing Library collection/search resets visible entries.
- Library sorts game history once per changed `games` collection.

## Production enforcement

Vite writes `dist/.vite/manifest.json`. The existing `npm run perf:budget` additionally asserts training-only modules are dynamic entries. It already enforces:
- individual JS chunk <= 260 KiB gzip
- individual CSS chunk <= 42 KiB gzip
- initial app JS/CSS <= 260 KiB gzip
- aggregate app JS/CSS <= 315 KiB gzip

`npm test` covers the progressive-window boundary and exhaustion behavior. GitHub Quality runs tests, builds, accessibility, content and performance audits before deployment.

## Explicit release limits

P56 does not claim a quantified LCP/INP improvement or reduced wall-clock time without measured device/browser traces. P58 should compare cold and warm load, first-move responsiveness, Train-to-activity latency, Review with 500+ games, Library search, low-end Android and offline/weak-network navigation. P57 should capture visual states including Show more controls and loading fallbacks.
