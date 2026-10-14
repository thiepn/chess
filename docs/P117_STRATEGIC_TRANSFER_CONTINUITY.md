# P117 — Comparative Strategy Expansion, Branch Alternatives and Portable Study Continuity

## Verified stack
P116 [draft PR #104](https://github.com/thiepn/chess/pull/104), branch `p116-lesson-data-delivery-and-budget-recovery`, verified exact head `f56f8bb19a65371f5fe62039f5e2512675caac55`. P117 new branch `p117-independent-strategic-transfer-continuity` is a direct child, not a rebase of or edit to previous draft PRs. Main and production unchanged.

## Implemented source-grounded teaching
The existing original P114 comparative catalog has **24 distinct authored pairs**, double its preceding 12. Its original 12 records remain unmodified in identity, prose and source anchor. The new 12 pairs supply original specific contrast questions, model explanations, two independent progressively useful hints, real-opponent resistance prompts, misconception-targeted repairs and independent transfer prompts. Every case references two exact original P113 master-game ID/checkpoint ID/historical ply/SAN-reply-SAN-next-move identities. It adds no new games, unauthorized sources, recordings or third-party prose.

The original P115 challenge archive now has **24 paired decision journeys**, each with two position-specific independent candidates for **48 anchored exercises**, written opponent-resistance prompts and revision/reflection. It retains P113 PGN validation, P114 source hydration, original Chess.js rules and existing canonical game positions; no best-move or rating claims.

## Learner-facing interaction
The native P115 source-pinned board lab now provides **two separately reversible candidate variations on each historic position**. The learner chooses moves for both sides for up to six legal plies in each branch, can undo/reset independently, inspect legal board facts and compare the two SAN sequences. Opponent resistance is entered by the learner, never invented by an engine. Existing P114 independent comparison and source reveal, written revision, and P113 full-game handoffs remain available.

To support intentional cross-session continuation without adding a new account store, the P114 workspace includes an **explicit portable study note** per paired source. Clicking Prepare copies no data externally: it creates visible text containing only user-entered writing, self-mark and up to four SAN branches, plus original source identities and timestamp; **never an account identifier**. The user manually copies the note to a private place and can paste it back in a later session. Import requires the same source pair and exact checkpoints, a note no older than 30 days, bounded text and board-legally replayable moves for each branch. Replacing existing unsent work requires user confirmation. Normal short-lived, owner-scoped session-draft restoration remains the sole automatic local authority. The portable text is not encrypted and anyone holding it can read the learner's notes; the app does not claim cloud sync or private-account portability.

Resume review in P114 selects the first learner-marked retry, otherwise the first unmarked pair. This is navigation convenience and **not** evidence of proficiency, achievement, graded quality or completion.

## Other limits and confidence
P116's exact-head automatic Quality result: **445 passing tests**, TypeScript + Vite build pass, initial gzip **216.8/260 KiB**, all-app JS+CSS **321.0/321 KiB**. The current total budget has effectively no headroom. P117 retains the 260/321 KiB checks unchanged and its own exact-head automatic result is required before any pass claim. No manually dispatched tests, builds, CI, audits or qualification activities.

P116 automated Device UX Prequalification **passed**; its Visual Regression workflow **failed approved screenshot comparisons** in previously existing Learn, Review and Library UI. These failures are not attributable to the P117 comparative lab on the available evidence. No arbitrary baseline regeneration or waiver is performed. P117 human mobile/keyboard acceptance remains unverified.

## Files
- Modified `public/data/model-games/p114-transfer-cases-v1.json`
- Modified `public/data/model-games/p115-counterfactual-v1.json`
- Modified `src/components/CrossGameTransferLab.tsx`
- Modified `src/components/CounterfactualLab.tsx`
- Modified `src/model-games/masterGames.ts`
- New `src/model-games/transferCapsule.ts`
- New `src/model-games/transferCapsule.test.ts`
- Modified `src/model-games/crossGameTransfer.test.ts`
- Modified `src/model-games/counterfactualBranches.test.ts`
- Modified `src/styles/p114-cross-game-transfer.css`
- New `docs/P117_STRATEGIC_TRANSFER_CONTINUITY.md`
