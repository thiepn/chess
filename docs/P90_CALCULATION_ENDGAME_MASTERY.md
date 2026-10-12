# P90 — Calculation & Endgame Mastery

Stack: P90 isolated source-only branch from P89 draft PR #76 at exact `8d89b9ff5104fcafd68f22c6721656de1c184d03`. Preserve P88 #75, P87 #74, P86 #73, main and previous drafts.

## P89 handoff: verified actual run outcomes
- Quality `38313396094`: 340/340 unit tests, TypeScript/build and audits PASS, but **FAIL 322.0 KiB gzip against unchanged 321 KiB total budget**.
- Device `38313396087`: WebKit FAIL (three course/puzzle navigation journeys), Chromium had not finished in the initial inspection; never imply PASS. The pre-navigation session cleanup observed in `App.tsx` could clear newly selected manual activities before route updates. P90 only clears sessions on an actual exit, while owner-change cleanup remains strict.
- Strict Visual `38313396101`: **FAIL 14/18 screenshots**, including one more than the P88 inherited 13; preserve exact baselines, no threshold edits or claimed approvals.

## Real learner-facing source work
- Four original authored legally replayable 3-ply calculation cases: rook cutoff, king tempo/opposition, promotion checks, and simplifying rooks. Each presents a concrete question, the recorded opponent reply, follow-up move, instructional rationale and explicit limits on what is proved.
- Three new interactive endgame situations: rook checking distance and pawn support, active rook defense under local engine opposition, and key-square king/pawn timing. Each has three misconception-aware recognition choices, a practical goal, staged cues and technique-specific success/failure explanation.
- Native calculation runner now rebuilds every principal-variation ply with chess.js before allowing scored progression, displays a player/opponent tactical storyboard, and attributes errors to main move, reply or next continuation.
- Native endgame runner adds actionable mistaken-choice feedback and the legally played SAN history; owner-authoritative completion handler replay-verifies that history, position ID and declared outcome before writing progress.
- Endgame delayed-retention evidence is granted only after a successful, unaided, recognition-correct time-separated return. Assisted/incorrect attempts remain practice, not verified retention.
- Source-directed unit tests cover legal lines, invalid replies, false endgame-win/survival claims and misconception guidance. Browser checks must demonstrate actual mobile route acceptance; older failures remain unqualified until source-fixed evidence exists.

## Known constraints
P90 exercises are original instructional positions, not externally certified engine-unique best moves or tablebase assessments. Practical survival vs local Stockfish is not a theoretical drawn-position proof. Owners, learning storage, original engine and mastery systems stay independent and unchanged in authority.
Do not change performance budgets, visual goldens, credential access, OAuth, production data, schemas, main or approvals. 18 original human visual decisions and 14 physical/Account/accessibility/educator gates remain PENDING.

P91 proposal: **Strategic Game-to-Training Transfer & Verified Readiness** — source-verified game-derived learning missions, balanced strength feedback and honest release readiness. NOT STARTED.
