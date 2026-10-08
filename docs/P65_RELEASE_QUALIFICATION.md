# P65 — Integrated Release Qualification

Status: **NOT RELEASE APPROVED**. Draft PR #50, stacked on PRs #49 → #48 → #47 → #46.

## Exact target and release rules

Chess remains a browser-first application. No PWA/offline-install promise is made in V1.0 without a separate acceptance decision. The user-facing release must not promise THIEPN-wide SSO while Chess is in browser-only guest mode.

All three GitHub checks (Quality, Visual Regression, Device UX Prequalification) must pass on **the same, exact, current commit**. A success on a superseded commit does not qualify a new one. Do not force-merge draft PRs, silently regenerate screenshot baselines, or alter thresholds merely to get a green check. Human experience and accessibility gates are independent of emulated CI.

## Findings and mitigations

| Severity | Area | Finding | Mitigation | Gate |
| --- | --- | --- | --- | --- |
| P0 | P64 / build | The promotion chooser had a missing JSX brace and broke TypeScript builds. | Fixed in P65; require Quality on current SHA. | Automated |
| P0 | P62 / mobile WebKit | Repeated recovery reloads crashed simulated iPhone WebKit after 65 other device journeys passed. | Untimed White games now delay Stockfish WASM until the first move; added test for two idle reloads without worker creation. Re-run **both** recovery and engine journeys. | Automated + physical iPhone |
| P0 | P61 / account | The THIEPN Account database received Chess migrations, but there is no verified deployed OAuth/SSO + browser client integration. | Test against actual deployed identity. Verify two users, account switch, guest migration, two-device save conflict, retry, and restore. | Auth/live |
| P0 | P64 / visual | Updated palette and text intentionally differ from P59 reference screenshots. | Generate new reference images, inspect side-by-side on phone/desktop and approve *before* committing any baseline changes; rerun strict screenshot comparison. | Visual + human |
| P1 | Builds | No committed `package-lock.json`; workflows currently run `npm install`. | Generate and review an npm lockfile, use `npm ci` on identical toolchain, verify Stockfish assets and license. | Reproducible build |
| P1 | P63 / pedagogy | 49/86 lessons have retrieval but no new-position transfer exercise. | Author/vet distinct transfer positions or explicitly label retrieval-only; qualified chess teacher reviews tactical and endgame explanations. | Instructional |
| P1 | Gameplay | Engine crash, clocks, game-finish transfer and resume are mostly automated, not physically qualified. | Run rapid/Fischer/untimed matches under refresh/sleep/airplane-mode and on real hardware. | Gameplay |
| P1 | Accessibility | Physical TalkBack, VoiceOver, keyboard-only, 200% text zoom and forced-colors qualification incomplete. | Complete manual evidence with no keyboard trap or board/promotion focus loss. | Accessibility |

## Acceptance scenarios

### Account / persistence (THIEPN Account)

- Sign in to **A**, edit progress, sign out, sign in to **B**. A's state is neither displayed nor uploaded to B. Reopen A and recover its exact saved state.
- Disconnect from network, make local edits, restore connectivity and verify the saved revision. On another device make a competing edit; require a deliberate conflict choice and backup preservation.
- Recover guest/legacy profiles explicitly (not automatically assigned to the next account).
- Confirm the deployed application's URL and publishable key target the **THIEPN Account** project and no service-role key is shipped to the frontend.

### Play / engine

- Start untimed White with no moves, reload twice, retain board and omit Stockfish startup until first move.
- Start as Black: Stockfish opens without needing a player action.
- Make legal moves (including castling, underpromotion, repetition), reload, verify exact history, FEN and notation.
- Background/foreground 10+0 and 15+10 and compare clocks against elapsed real time, including flag falls and increment.
- Inject corrupted checkpoint; never erase it silently. Preserve export and allow recovery.
- Induce engine failure, retry and confirm no phantom move or double-counted result.

### Learn, review and content

- Validate curated tactical lines and alternative moves at sufficient depth; underpromotions must be distinguishable.
- Validate progress reporting for empty history, actual measured samples and account changes.
- Confirm screen-reader names, focus retention, pointer/touch hit targets, reduced motion and text scaling.

### Visual and responsive

- Review pinned desktop and mobile screenshots on nine core routes, plus live game, analysis board, training lesson and promotion chooser.
- No horizontal scroll, hidden action, giant blank chart, clipped exercise title or inaccessible 7px labels.
- Verify graphite/obsidian/warm-graphite and tournament/walnut/slate are all usable.
- Do not approve an updated screenshot baseline merely because CI produced it.

## Current disposition

- P61 schema: **applied to THIEPN Account; browser/SSO acceptance outstanding**.
- P62: code implemented; simulated WebKit second reload previously crashed.
- P63: mechanical correctness audits added; human teaching validation outstanding.
- P64: appearance branch; prior baseline screenshots need human approval.
- P65: build syntax repair and deferred WASM startup in progress; latest automated results must be consulted before declaring acceptance.

**Decision: NO V1.0 RELEASE** until the above gates are addressed. Production branch remains unchanged.
