# Chess P116 — On-Demand Lesson Corpus and Budget Recovery

## Verified parent
P115 draft PR #103, `p115-independent-counterfactual-branch-rehearsal` at `0cb6cd357995104e8e4113900943196b2642c5ba`. Separate child branch `p116-lesson-data-delivery-and-budget-recovery`, targeting only that parent.

## Actual implementation
**No learner content was deleted or shortened.** The original 86 primary lesson records and 37 explicit transfer records have been copied intact from `src/learning/lessons.ts` into `public/data/lessons/p116-lesson-content-v1.json`, with the original FEN constant values resolved into their literal board strings. Every original skill ID, title, explanation, move, hint, transfer prompt and success message remains an independently inspectable value.

The established original `lessonForSkill`, `lessonScripts`, `deepTransferSkillIds`, move-hint builder, eight-stage lesson builder and legality checks retain their existing behavior. The authoritative lesson script is still created by the original P1–P115 lesson compiler: the only difference is that the authored *data* is now loaded on demand from the versioned HTTP asset, without being bundled into every JS download. No new course, mastery writer, rating engine or lesson state store has been introduced.

- Native `LearnView` and `LessonRunner` were already lazily imported by App and therefore load the authored lesson corpus only when their modules are actually requested.
- `App` no longer eagerly imports all authored lesson content solely for a training-session preview. That preview now dynamically imports the original authoring module on demand, with unmount/navigation cancellation.
- The same `import.meta.env.BASE_URL` prefix used by other data catalogs permits nested Vite deployments.
- In the existing Vitest source environment, the same JSON is read through Vite's static JSON handling, so test imports do not attempt a Node-side relative network fetch. No manually triggered tests or CI.

### Validation boundaries and risks
The lesson asset is loaded via browser HTTP when lessons are needed. With the response unavailable (offline before the first cached fetch, interrupted network, or a missing deployed asset), the module cannot show its authored lesson; no invented substitute lesson is displayed. The original app's offline/cache behavior remains dependent on normal browser/CDN caching and deployment of the complete `public/data` tree. This is not a claim of independently verified offline acceptance.

The previous P115 automatic exact-head run passed 441 tests and TypeScript/Vite build but failed **335.7 / 321 KiB gzip all JS+CSS** while the initial app was **232.9 / 260 KiB gzip**. P116 retains the exact original 260/321 KiB budgets; any recovered margin must be reported from its own automatic exact-head build, never estimated from source sizes. P115's visual regression failure and independent device acceptance remain separate.

No manual tests, new CI workflow, test dispatch, branch merge, migrations, credentials, paid services or production changes. Existing P33/P113–P115 and TMS/training authorities are not rewritten.

## Original assessment construction without eager lesson fetching
The first automatically triggered P116 build passed the unchanged **321 KiB** total package budget, but revealed that `assessment/engine.ts` still imported the full authored lesson factory eagerly during application bootstrap. To preserve an offline-capable synchronous placement/checkpoint constructor and prevent a pre-launch HTTP dependency, the child now uses a **compact, exact 86-skill primary-FEN/move projection** in `assessment/primaryLessonMoves.ts`. This projection is derived from the exact original seed identities and strictly compares to them in focused source tests. It has no independent exercise, scoring or mastery authority.

Only actual Learn/Train lesson route entry or the visible Train preview loads the full authored course archive; unrelated pages no longer trigger it. The original synchronous `buildPlacementAssessment`, `buildStageCheckpoint` and their outcomes remain unchanged. This can change the JS/CSS total slightly, so the latest exact-head automated budget remains the only valid performance result.

## Budget-preserving deduplication
The second exact-head automatic workflow passed **445 tests**, TypeScript and the production build, but measured **322.3/321 KiB** all-app JS+CSS with the new synchronous assessment projection. The projection is now compactly encoded **in canonical `skills` order**, which is verified to match the existing 86 `seeds` IDs. It does not duplicate each skill ID in another index.

Additionally, 52 original reusable lesson instruction/feedback text segments are stored **verbatim as text data** in `p116-lesson-content-v1.json` rather than compiled JavaScript. The original lesson compiler uses these source strings, keeping the same user-visible prompts and misconception feedback. Neither curriculum content nor the fixed performance limits were removed. Only exact-head quality results can establish whether this revision falls within the unchanged 321 KiB cap.

The third P116 exact-head automatic Quality workflow passed **445 tests and production compilation** but measured **321.2/321 KiB** total gzip, a remaining ~0.2 KiB. Further unchanged explanatory prose and diagnostic template fragments were therefore placed in the same external authored-text asset, keeping their exact output through interpolation. No budget value was modified; only the next exact-head automatic build can verify final compliance.
