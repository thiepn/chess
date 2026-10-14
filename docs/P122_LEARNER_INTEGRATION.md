# Chess P122 — Learner Continuity and Development Integration

P122 is an exact child of P121 draft PR #109, commit `a7e4fbbd5f213fb49db1b8136c42a1a1631dbea5`. It does not merge or modify `main`, earlier stacked branches, production, source identities, native grading or owner-scoped authorities.

## Confirmed source defects repaired
- P113 complete-game drafts were rendered using stale `drafts` before the asynchronous account switch restoration had run. All previously visible notes, decision marks and counts are now scoped to the exact encoded owner+game session key and edits fail closed until restoration completes. Unavailable sessionStorage writes now show a visible warning instead of silently implying recovery.
- P114 paired-game notes now warn if browser session storage refuses writes, while retaining the original manual source-verified, unencrypted private portable-note path. Reset of a nonempty pair asks for explicit confirmation.
- P115/P121 comparison disclosed exact historical SAN in `reconstruction.after` and other source-relative transfer text before `draft.revealed` was true. Those source interpretations now display only after the existing answer-before-reveal action; independent opponent-defense framing stays visible.
- The P121 six-ply candidate board used the changing current FEN in the React `key`, unmounting the board after each move and discarding native keyboard focus. Keys now change on source/selected variation, not on every ply. The original ChessBoard already handles FEN updates without remount.
- `Continue from this ply` previously discarded all later saved SAN silently, and clearing a branch discarded all moves. Both operations now require explicit confirmation without altering the other candidate or source PGN.

## Integrated parent/main difference, without a merge
Main at `3b947d336591949965cf7c36d62c2456898cb873` is one commit ahead of the shared merge-base `f2650a63d83bd0280a257c609731c9e07bc838ae`. Its only changes are workflows to skip Quality for draft PRs and disable expensive automatic device/visual PR jobs. P122 transplants exactly those three workflow changes into the existing stack without touching main, weakening test assertions, or manually running CI. Merging or deploying is not authorized.

## Startup
The advanced unscored `StrategicStudyLibrary` is now lazily imported into the Train page's existing React suspense flow. This removes its UI implementation from the mandatory entry import graph, without modifying study data or grading. The exact final bundle delta and original hard caps (260 KiB initial and 321 KiB all app JS/CSS gzip) require an independent production build; do not claim numerical savings without one.

## Exact P121 evidence and outstanding blockers
P121 automatic Quality: 464/464 tests, build and performance budget PASS at 230.5/260 KiB initial and 320.7/321 KiB total. Device UX: 180 Chromium and 36 WebKit browser checks PASS. Visual Regression: 14 screenshot comparisons FAIL across Train, Learn, Play/Review, Progress and Library views, with evidence of divergent approved snapshots but not proof that any particular visual delta is incorrect. Do not regenerate or approve goldens based on these failures. Offline candidate workflows were skipped.

Human visual decisions, real phones and screen readers, true first-party Chess OAuth registration and A/B cross-device isolation, real Stockfish/offline acceptance, release authority and exact-head P122 automated qualification remain outstanding. P122 source changes are not independent human acceptance; no merge, production mutation, deployment, premium service or migration.
