# P88 — Curriculum Transfer Exercise Completion

**Source parent:** P87 PR #74 exact `61edfc71f5ba2870c323ffe41050bee2bfc80bc0`. This is a separate nondeploying, stacked P88 draft (P86 PR #73 unchanged).

## Source-first product work
- Existing authored lessons: 86. Existing curated distinct transfer seeds: 37. **P88 adds 49 original authored positions** with a question, a chess.js legal UCI move, an instructional explanation and skill-specific misconception feedback in `public/data/learning/transfer-v1.json`.
- No historical/GM game or engine-certified unique-best-move claims. Authored candidate moves are curricular answers, **not proof every other legal move is objectively wrong**.
- `src/learning/transferCompletion.ts` validates schema, complete/unique identities, valid FEN and legal move; refuses same model FEN and corrupt inputs; memoizes the successful load and retries failed loads.
- The existing `LessonRunner` injects a **separate real position** at the transfer step. It never presents the old repeated-position fallback as transfer if the file is missing. Escalating hints, actual board attempts, move-specific feedback and error handling reuse the existing native runner.
- Mastery completion is separated from independent mastery. First-try, unaided novel-position transfer is required when transfer is present; assisted answers still receive practice/feedback, but never qualify as independently mastered.
- Existing `applyEvidence` review scheduling and course mastery model remain authoritative. A lesson does **not** falsely credit delayed retention until a later practice supplies time-separated evidence.
- The 49 authored positions are a static local first-party content file, usable offline if included in an available application package; no user records, external API, account rights or additional curriculum authority.

## P87 inherited verified status
- P87 final-head `38296467243`: Quality FAIL on a single stale text expectation (`Last attempt missed` vs `Missed · retry soon`), 331/332 unit PASS. The expectation is fixed in P88.
- P87 Device UX `38296467526`: Chromium and WebKit PASS.
- P87 strict visuals `38296467552`: FAIL, 13 prior unapproved PNG differences, five PASS. This is deliberately unchanged; no baseline or threshold modifications.
- Existing original human decisions: 18 visual and 14 physical device/Account/accessibility/educator acceptance cases PENDING.

## Verification and nonclaims
- Curriculum unit assertions cover all 49 missing IDs, legal move reconstruction, new-model position separation, learner-specific feedback and tampered catalog fail-closed behavior.
- Mastery regression tests prove assisted transfer cannot establish independent mastery.
- Browser journeys exercise a full learner path from an existing lesson into a new position, incorrect legal choice, feedback, correct response and next step; a deliberately unavailable corpus blocks instead of silently substituting same-position retrieval.
- **Qualification still requires exact-head Quality, performance, Chromium/WebKit and visual reports.** Never relax size, security, original screenshot gates or claim physical-device results. No production migration, OAuth activation, deployment, main merge or human sign-off.

## P89 — Puzzle Learning Quality (NOT STARTED)
Tactic-specific mistaken-move reasoning, opponent best-reply explanations, challenge calibration, bounded spaced puzzle replay, and mistake-to-game transfer via the existing puzzle and Review pipeline.
