# THIEPN Chess P118 — Historical Reconstruction, Legal Resistance and Study Continuity

## Source and stack
- Exact parent: P117 draft PR #105, `p117-independent-strategic-transfer-continuity`, SHA `ede7c4ae31dd577cf6dbe8ca4a18bb45f7ac269b`
- Child: `p118-source-reconstruction-and-opponent-resources`, draft PR stacked directly on the above parent
- No earlier stacked branch, main or production changed

## Delivered learner-facing functionality

**48 revised source-anchored board tasks across 24 historical pairs.** The original P115 challenge catalog now includes original `reconstruction.first`, `reconstruction.second`, and `reconstruction.after` prompts. These ask the learner to identify legal threats and center/king-safety features *before* moving, make both an initiating candidate and opponent's response, and write a board-specific comparison with the historical three-ply score. The 24 themes retain P113 source game, checkpoint and legal ply IDs, and the previous P114/P115/P117 prompts are preserved. Reject any challenge whose new instructional source is missing or malformed.

**Reconstruct → resist → revise.** P115's existing side-by-side ChessBoard now begins each original or alternative candidate with an independent pre-move written analysis. The active status distinguishes initial candidate, opponent response and revision. After moves are entered, the learner can inspect previous/next legal board positions, see the exact original SAN sequence, and continue a different line from the selected legal position by truncating only that specific candidate. Other candidates and the opposite side of the paired lesson are untouched. The existing six-ply limits and original Chess.js move legality remain binding.

**Rule-legal opponent resources.** The learner can request checks and captures or all legal moves for the actual board position, with a playable compact SAN button interface usable with a keyboard and on mobile. The list is derived exclusively from the *existing* Chess.js rules. Checks/captures are not a chess-engine score, tactical proof, optimal-defense recommendation, or simulation of an opponent. Unshown moves remain playable through the original board. The current history and historical source views are read-only until the learner explicitly chooses to continue a line.

**Continuity and recovery.** The existing owner-scoped, 24-hour P113/P114 session draft now persists original pre-move reconstruction for both source positions, in addition to up to four independently legal variations and revised plans. Source-verified 30-day portable notes retain the same information; older P117 portable notes without the two optional fields still restore. The P114 comparative picker now resumes a locally self-marked retry or partially authored record automatically when the account's prior session notes are restored. Import warns before overwriting any existing written work, candidate SAN, reveal state or self-check; the prior P117 warning checked only nonempty strings. Both source-fetch pathways have explicit retry actions without fabricated source fallback or Account writes.

## Technical integrity
- Original Chess.js and existing P113–P117 checked source IDs, strict PGN validation and verified P114/P115 content gates retained.
- Authoritative THIEPN Account, learner state, review/Elo and grading remain unchanged. No new database, mastery/score ledger or simulated defender.
- New legal move menu is exhaustive in its rule authority; on-screen listing is capped at 24 entries for practical mobile controls and is never called "best".
- Reuses canonical existing `MasterDraft`, `restoreMasterDrafts`, `masterDraftKey` and P117 `exportPairNotes`/`importPairNotes` for all personal content.
- All novel educational prose is an externally served P115/P118-authored JSON extension, not new JavaScript-bundled original game text. No historical lines were invented.
- Unverified screenshot differences: P117 Visual Regression failed on already-existing Learn/Review/Library screenshot baselines; P117 automated Device UX passed. P118 does not assert unrelated screenshot fixes or regenerate any baselines.

## Verification limits
No manual tests, builds, CI dispatch, audits, screenshots, deployment, migration, merge, credentials or paid services. Focused new regression tests are written but not manually executed; only automatic workflows may establish exact-head PASS. Fixed original compressed budgets of **260 KiB initial and 321 KiB total JS+CSS** are not raised. Any failure must be reported, not waived.

## Source files
- `public/data/model-games/p115-counterfactual-v1.json`
- `src/components/CounterfactualLab.tsx`
- `src/components/CrossGameTransferLab.tsx`
- `src/model-games/counterfactualBranches.ts`
- `src/model-games/masterGames.ts`
- `src/model-games/transferCapsule.ts`
- `src/model-games/transferCapsule.test.ts`
- `src/model-games/p118Reconstruction.test.ts`
- `src/styles/p115-counterfactual.css`
- `docs/P118_HISTORICAL_RECONSTRUCTION.md`
