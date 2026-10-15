# THIEPN Chess G1C — Exact-Head Qualification Attempt and Native Session Repairs

## Verified ancestry and scope

- G1B parent draft PR #117, branch `g1b-beginner-legality-and-depth-completion`, exact verified head `bc9b503bdc2406b9d5de1fd15cc60fb075ff4f16`.
- G1C independent child `g1c-beginner-executable-qualification-repairs` is stacked on this exact revision, with no historical PR, `main`, or production changes.
- Historical 86 skill identities, 86 P116 lesson scripts, original 49 P88 transfer records and original transfer grades, G0/G1/G1B beginner source positions, Chess.js library version in project dependencies, review authority, private Account ownership, and 260/321 KiB performance thresholds remain unmodified.

## Demonstrated source defects repaired

1. **Lesson state/owner continuity across active sessions.** The previous `src/App.tsx` rendered `<LessonRunner activity={active} skill={activeSkill} />` **without a React key**, even though the same runtime branch keyed existing calculation and owner-bound mistake workspaces. `LessonRunner` retains `stepIndex`, `results`, hint counts, selected answers and source hydration in component state. Its reset effect depends on `lesson.id`, which runs only after render. When the runtime reuses the component for another activity/skill/Account, a stale step index can be evaluated before that effect, and stale step/results must not carry into another owner or task. G1C now keys the original `LessonRunner` using owner, activity ID, skill ID and activity type and rejects an `onComplete` result if the currently authenticated owner differs from the owner of the rendered session. It still delegates successful results to the *same* `completeActivity` and Review writers, with no new grading engine or storage.
2. **Fail-closed lesson-depth anchoring.** In `src/learning/beginnerPractice.ts`, `withBeginnerPractice` previously silently returned a lesson unchanged if the expected original `transfer` / `transfer-depth` step was absent. It also did not check that G1/G1B "independent" boards were distinct from *that skill's* original lesson model/transfer boards when adapting the script. G1C rejects a missing/ambiguous anchor and same-skill board overlap before returning the lesson. The original G1 fourth and G1B eighth transfer steps keep their IDs, original support status, and original weighted quality/clean-transfer rules.
3. **Focused regression cases** added to existing `src/learning/g1bBeginnerDepth.test.ts`: absent transfer anchor, duplicated original anchor and reused independent board must fail closed; existing 128-record exact Chess.js, legal alternative, source outcome and mastery checks remain.

## Actual qualification attempt

- GitHub connector verified **exact G1B PR, branch SHA, tree and `main`** before writing child source.
- Local execution runtime has Node 22.16.0, npm 10.9.2, git 2.47.3, global TypeScript and Chromium.
- Full GitHub checkout **BLOCKED**: terminal GitHub and codeload DNS resolution fail; GitHub connector `fetch`/blob supports text and metadata but rejects non-UTF8 or large/binary archive responses. No `chess.js`, Vite, Vitest, Playwright project packages or complete project checkout found in the current runtime. The available P121 visual evidence ZIP contains old screenshots/traces, not an exact G1B source checkout; it is not an acceptable substitute. Attempted direct archive source retrieval was unsuccessful.
- **PASS — source assertions:** parent exact identity/branch, changed-file scope, stable React key and active Account guard, adapter's independent-anchor and duplicate-board fail-closed checks, existing G1/G1B source and historical corpus files unchanged.
- **NOT_TESTED:** Actual G1C exact-head `chess.js`/Vitest of 128 authored moves + 32 alternatives; all check/checkmate/draw/castling/promotion outcomes; G1 fourth + G1B eighth transfer; original Review and delayed retention behavior; `tsc -b`; Vite build; unchanged 260 KiB initial / 321 KiB total compressed JS+CSS budgets; Chromium desktop/mobile/keyboard responsive lesson switching.
- The G1B predecessor independently implemented source-position checker had previously accepted 128/128 answer moves, 32/32 alternative moves and 8 each check/mate/draw/castle/promotion patterns. **That is not actual Chess.js execution** and is not carried forward as a release PASS.
- GitHub draft-PR automatic checks that are skipped do not qualify a release; no manual CI dispatched.

## Exact checkout release checks to execute before release approval

1. Obtain a **complete, authentic checkout** at the G1C SHA with the repo's locked dependencies; do not use reconstructed partial files or a different revision as exact-head acceptance.
2. Run `npm ci`, `npx vitest run src/learning/g0BeginnerTransfer.test.ts src/learning/g1BeginnerPractice.test.ts src/learning/g1bBeginnerDepth.test.ts`, and relevant historical lesson/mastery/Review tests. Inspect the first actual Chess.js invalid exercise if a test fails; repair content or source rather than weakening legality criteria.
3. Run `npx tsc -b`, then `npm run build` with the unchanged original source puzzles and Vite settings; run `npm run perf:budget` using **actual exact-head outputs** and preserve 260/321 KiB gzip thresholds.
4. Start the exact production app in Chromium desktop and mobile. Verify original lesson startup, first-four + new fifth-to-eighth step advancement, source-matched feedback on off-task legal moves, hint-assisted non-mastery, activity/skill switching while on late step, Account switch with unsent study progress, legal queen-promotion and black/white castling, keyboard controls and real return/Review after interruption. Do not rebaseline historical screenshots without independently established visual justification.
5. Mark only genuinely executed green gates **PASS**. Keep release **HOLD** for every missing or failing gate.

**Status:** Source repairs committed to a stacked draft only; genuine executable release qualification still BLOCKED/NOT_TESTED. No merge, deployment, production SQL, credential or paid resource.
