# THIEPN Chess P120 — Counterplay Decision Studio and Bundle-Safe Source Delivery

## Parent and isolation
Verified parent P119 draft PR #107: `p119-opponent-reply-repair-and-source-contrast`, exact commit `22fe22b48906cb42e0eb56d82bd5945ae1f9a194`. New stacked child `p120-opponent-decision-cards-and-compact-study-ui`. Preserve main, production, original P113–P119 IDs and every original user-state authority.

## Working learner functionality

**24 original historical studies, 96 new staged counterplay decisions.** Original source-linked P115 archive gains four authored, comparison-specific activities for each validated P114 pair: decision under defender resistance in the first game, second game's distinct reply, alternative defensive repair and transfer limitations. The original P113 PGN move/ply/checkpoint identities are reused, not copied into a new game engine. Original P115–P119 content remains intact. Any missing or short decision or source guidance fields are rejected explicitly by the existing source hydration check.

**No prematurely asserted 'best defense'.** The learner first identifies candidate and opponent threats. Stage-specific recorded-source explanations appear only after the existing historical reveal action. Before reveal, the screen prompts an independently identified forcing/quiet defender and revision of the plan, not a move claimed optimal. No engine, simulated opponent, grade, evaluation, Elo or mastery is created.

**Complete mobile/keyboard-accessible legal move chooser.** The prior P118 source-legal SAN buttons silently capped the menu at the first 24 items, even when the board had more legal responses. P120 pages **all legal moves in 12-move groups**, with previous/next controls and explicit shown range, while retaining ChessBoard interaction, source legality and the distinction between checks/captures versus quiet moves. Learners can also jump to **any prior ply** by its notation; this only selects a history position, and the existing 'Continue from this position' remains an explicit, reversible user-directed truncation of the active candidate.

**Independent defender analysis and continuity.** Source-position defender reasoning is captured in `branchThreatA/B` alongside existing `branchPlanA/B`, `branchNoteA/B`, four SAN candidate lines and manual revision. All use original owner-scoped P113/P114 24h sessionStorage draft authority. The original portable-note importer accepts old P117, P118 and P119 notes with missing optional P120 fields and remains bounded, source-verified, legal-SAN checked and 30-day constrained. No new database, cross-account writer or automated cloud sync.

**Compact textual instructional delivery.** Shared instructional guidance is now bundled with the original external `p115-counterfactual-v1.json` authoring archive, replacing repeated prose in the initial master-study JavaScript. All 24 source-linked new decision/repair prompts also live in this independent JSON source rather than in JS strings, making further original content additions possible without proportionate application-bundle growth.

## Scope and remaining limits
P119 automatic Quality **456/456**, build PASS; 230.5 / 260 KiB initial, 320.8 / 321 KiB total gzip. P119 automatic Device UX PASS; Visual Regression FAIL for previously existing approved screenshots. No arbitrary baseline regeneration, visual redesign or claim of unrelated repaired screens. P120 original initial/total budgets remain unchanged, and source asset transfer size is not included in JS/CSS checks.

No manual tests, builds, CI dispatch, audits, screenshot generation, merges or deployments. Focused tests authored but NOT_TESTED manually; report only exact-head automatic results. Preserve original legal rules and copyright/source qualification. No credentials or paid services.

## Files
`public/data/model-games/p115-counterfactual-v1.json`
`src/model-games/counterfactualBranches.ts`
`src/components/CounterfactualLab.tsx`
`src/model-games/masterGames.ts`
`src/model-games/transferCapsule.ts`
`src/styles/p115-counterfactual.css`
`src/model-games/p120Decision.test.ts`
`docs/P120_COUNTERPLAY_STUDIO.md`
