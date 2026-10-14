# THIEPN Chess P121 — Defender Forks and Source-Pinned Variation Continuity

## Verified stack and authorities
Exact stacked parent: P120 draft PR #108, branch `p120-opponent-decision-cards-and-compact-study-ui`, SHA `b0cb51a9b67e8fb6967898d205ffcd9f7f365973`. The new development branch `p121-defender-fork-and-continuity-recovery` is an exact child; no prior PR, main, or production is modified.

P113 original complete historical Chess PGNs, game IDs, 32 original source decision checkpoint IDs, legal source FEN/SAN, P114 comparison identities, P115–P120 prompts, native Chess.js move authorities and THIEPN Account ownership all remain canonical. No game engine, duplicate review engine, opponent simulator, achievement/proficiency/move-quality score, hidden answer or account writer is added.

## P121 learner-facing functionality

**Fork a legal branch from any selected history ply.** For either original board, select one of the existing original/alternative candidate lines, play one or more legal plies, rewind using the original P120 jump-to-ply controls and choose *Fork selected ply into other line*. Only a Chess.js-verified SAN prefix is copied to the other original P117 candidate slot. Existing original SAN is never modified by the fork, and the target line requires explicit replacement confirmation if it already has saved moves. The learner is switched to the forked target to try a different *legal* defender's reply; reverting to the original shows the unmodified initial path. An unplayed candidate, invalid SAN, wrong cursor, or illegal source is rejected.

**Concrete historical counterplay teaching.** The same external source-bound P115 JSON corpus has four original prompts per existing comparative case: pre-fork resistant-plan framing, source-observed responses distinguished from a forced solution, opponent counter-plan repair, and conditional transfer to the related original historic position. This adds 96 original instructional fields over 24 pairs, each grounded in the unchanged P114 source and its actual SAN triple; original historical source IDs remain unchanged. The P121 stricter validation rejects missing/short fork witnesses without inventing replacement instruction. No engine-derived advantage claims.

**Independent learning continuity.** The fork writes to the original `branchA/B` and `branchAltA/B` arrays via original owner-scoped P113/P114 short-lived `MasterDraft` sessionStorage. Existing P119 per-case interruption recovery and P117–P120 manual 30-day, exact-source, SAN-verified portable notes automatically carry these original arrays; no extra store or schema migration. The original P118 step-by-step board state, six-ply limit, complete P120 legal response paging (including quiet moves), P119 capture/check evidence, historic comparison and independent writing remain available.

**Accessible original controls.** Uses existing keyboard-operable original/alternate selector, history position buttons, native disabled states and source legality. A fork confirmation protects pre-existing alternate SAN. Mobile board layout stays original; no unrelated visual redesign or screenshot-baseline regeneration.

## Bundle and verification
P120 automatic Quality passed 460/460 tests, TypeScript/Vite and 230.6 / 260 KiB initial, 320.9 / 321 KiB total JS+CSS gzip. P120 automatic Device UX succeeded on Chromium and iOS WebKit. Its Visual Regression failed on already-existing Learn, Review and Library screenshot baselines, so no unsupported claim those are fixed by this separate feature. User-original budget caps of 260 KiB initial and 321 KiB total remain unchanged. New instructional content is delivered as external source JSON, not literal JS/CSS; source JSON bytes are network transfer and **are not included** in the JS/CSS budget.

No manually triggered tests, builds, typechecks, CI, audits, migrations, merges, deployments, credentials or paid services. Focused test cases are authored but NOT_TESTED manually; only automatic PR workflows may establish exact-head PASS. Independent human mobile/keyboard acceptance is NOT_TESTED. Report bundle measurements and any failures at final commit before claiming acceptance.

## Changed source
- `public/data/model-games/p115-counterfactual-v1.json`
- `src/model-games/counterfactualBranches.ts`
- `src/components/CounterfactualLab.tsx`
- `src/model-games/p121Fork.test.ts`
- `docs/P121_DEFENDER_FORKS.md`

## Targeted package recovery
The initial P121 automatic run reported 464/464 tests passing but a JSX delimiter error in the newly added variation button (corrected at a follow-up commit). The next automatic build passed TypeScript and Vite but failed the exact original **321 KiB** total JS/CSS budget, measuring **321.2 KiB** (initial **230.9 KiB**). No cap or test was changed.

The original P115 external instruction asset now also owns the existing master-study interface's long instructional/control labels. Its full expected field inventory is validated before presenting source-pinned exercises, instead of duplicating the text in startup JavaScript. Repeated two-board state updates share one small tuple update helper; legal SAN fork validation reuses one authoritative Chess.js replay rather than a second redundant replay. No historical source data, lesson meaning, owner-scoped writer, legal board behavior or historical source integrity has been removed. Exact final-head automatic Quality and bundle measurements are required to establish compliance. Source JSON is a real network transfer and is not included in the JS/CSS cap.
