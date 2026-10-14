# THIEPN Chess P119 — Source-relative counterplay, reasoning repair, and connected study

## Stack and source integrity
Direct child of P118 stacked draft PR #106, branch `p118-source-reconstruction-and-opponent-resources`, exact verified parent SHA `722ea683ac0770123bd7df6c97a51a58caa054ee`. New development branch `p119-opponent-reply-repair-and-source-contrast`. Original P113 historical PGNs and checkpoints, P114 24 comparisons, P115–P118 48 position prompts, Chess.js replay/legality, owner-scoped P113/P114 sessionStorage keys and user-written portable notes are retained.

## Learner-facing implementation
- Original JSON lesson corpus extended with **four substantial source-specific repair prompts per comparison (96 prompts)**: opponent reply after Position A, Position B, reconstruct after multiple moves and cross-board transfer condition. Explicit historical move/reply identities and source concepts come from the same checked P114 records. The P115 validation rejects incomplete repair witnesses.
- New Chess.js-derived **factual branch evidence** compares a learner's legal SAN history to the recorded three-ply historical continuation and the independently entered alternate branch. It identifies the number of shared plies, whether actual moves diverge, when a candidate has not yet faced a defender, and exact capture/check/promotion occurrences by move. These are game-law and source facts, not an evaluation of a move's quality. Source-sensitive detailed teaching appears only after the learner reveals the existing historical model. Before reveal, independent repair guidance asks for a concrete reply and reasoning rather than spoiling the historical continuation.
- Existing P118 six-ply board exploration, before/after navigation, actual legal reply controls and independent pre-move writing stay intact. Staged prompts now direct continuation after the first opponent reply and after a longer line. The original per-position `branchNoteA/B` fields hold revision; no new grade or false mastery claim.
- Cross-study navigation recommends an unreviewed paired source sharing at least one **original historical game ID**, connecting independent comparison with other verified positions, not assuming the same move works.
- In the original P114 owner-scoped session-draft authority, source pair drafts are now stored per original case whenever modified, not only when that case is currently selected. A transient reference avoids rewriting unchanged case drafts on each keystroke. Switching Account owners clears the reference and uses the existing owner gate; no separate persistence engine or cross-account state authority has been introduced. P117/P118 manual portable-note workflow remains compatible.
- No new engine, opponent simulation, guessed chess strength, best moves, scores, remote data, study authority, Account changes or content licensing claims.

## Verification boundaries
The exact P118 parent auto Quality result passed **452/452 tests**, TypeScript/Vite build, initial JS+CSS **229.7/260 KiB**, total **320.0/321 KiB**. P118 automated Device UX passed; Visual Regression failed on 14 screenshot expectations on preexisting Learn, Review and Library screens. Those images/baselines are untouched by P119; without evidence linking the failure to this original study workspace, no arbitrary screenshot replacement or design redesign occurs.

P119 original budgets remain **260 KiB initial / 321 KiB total JS+CSS gzip**. External teaching JSON should not be counted as JavaScript/CSS, but it still downloads when the archived learning source is requested; actual network volume is not claimed to decrease. Source tests written but NOT_TESTED manually; any exact-head automatic GitHub results must be reported, including failures. No manual tests, builds, CI dispatch, audits, migration, merges or deployments.

## Files
- `public/data/model-games/p115-counterfactual-v1.json` (external authored repair)
- `src/model-games/counterfactualBranches.ts` (source validation and legal facts)
- `src/components/CounterfactualLab.tsx` (staged source-relative feedback)
- `src/components/CrossGameTransferLab.tsx` (related study handoff and original-draft continuity)
- `src/model-games/p119Repair.test.ts` (focused source and chess-law regression)
- `docs/P119_SOURCE_RELATIVE_REPAIR.md`
