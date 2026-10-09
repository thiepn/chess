# P70 — Release Blocker Closure & V1.0 Qualification

**Disposition: HOLD — draft, do not merge, tag, activate Chess OAuth, or deploy.**
P70 is stacked on [P69C #56](https://github.com/thiepn/chess/pull/56), itself stacked on P61–P69B. The initial P70 base is P69C head `d05c3d2a0ee7890f86cf8fa8d101ae37f879cfd4`; `main` remains P60 `f2650a63d83bd0280a257c609731c9e07bc838ae`.

## Confirmed P69C evidence before P70

| Check | Workflow/run | Outcome |
| --- | --- | --- |
| Quality | [37914137611](https://github.com/thiepn/chess/actions/runs/37914137611) | PASS |
| Device UX Prequalification | [37914137684](https://github.com/thiepn/chess/actions/runs/37914137684) | PASS (emulated devices only) |
| P67 Visual Candidates | [37914137632](https://github.com/thiepn/chess/actions/runs/37914137632) | PASS; captures **unapproved** |
| Visual Regression | [37914137617](https://github.com/thiepn/chess/actions/runs/37914137617) | FAIL; existing P59 baseline differs from P64 design |
| Deploy Pages | Main workflow [37914493238](https://github.com/thiepn/chess/actions/runs/37914493238) | SKIPPED |

These checks predate P70; **none certify P70's new commit**. On Visual Regression P69C the desktop Train screenshot diverged by 131,775 pixels (~11%); several other pages diverged. Do not increase Playwright image tolerance or auto-approve current pixels to make the check pass.

## P70 verified defects and implemented controls

1. **False image provenance:** P67 candidate workflow used default `pull_request` checkout (synthetic GitHub merge ref) while labeling evidence with `github.event.pull_request.head.sha`. It now explicitly checks out the immutable PR head and verifies `git rev-parse HEAD` before build. The candidate hash report uses that same immutable SHA.
2. **Same-commit ambiguity in automation:** Quality, Device UX, and strict Visual Regression explicitly check out and assert the PR head or the main push commit. The release gate still requires three successful **main push** checks on the same exact release SHA; PR checks do not authorize deployment.
3. **Weak visual artifact validation:** paired screenshots now require a full lowercase 40-character head SHA, PNG signature/IHDR, matching nonzero dimensions and identical names/count; CI demands all 18 core reference pairs. Corrupt, mismatched, incomplete, or unattributed artifacts fail closed.
4. **P70 captures:** the unapproved candidate workflow includes P70 and its own test-script changes. No candidate image is committed as an approved golden reference.
5. **Regression tests:** tests cover mismatched PNG dimensions, invalid screenshot input, malformed SHA, missing reference and incomplete inventory. Node-native tests run in the existing Quality gate.

## Machine qualification matrix — record after the final P70 push

| Gate | Required acceptance |
| --- | --- |
| Build and TypeScript | Green Quality on final immutable P70 head |
| Unit/content/design/lockfile/performance/asset-security | Green Quality on same head, no silenced failures |
| Chromium + isolated WebKit journeys | Green Device UX on same head |
| Candidate review artifact | SHA matches head; exactly 18 comparable before/after pairs; **UNAPPROVED** |
| Visual Regression | **Remain failed** until independently approved P64 images are deliberately reviewed, committed and strictly re-tested |
| Production | **Must remain blocked** until OAuth, visual, real-device, pedagogy and exact-SHA approvals |

A generated image manifest means the comparison is mechanically reproducible, **not** that the appearance has been approved. Obtain an individual reviewer decision for every changed baseline and representative interaction state; commit only accepted images, with strict unchanged thresholds. Then rerun all three mandatory checks on the final commit.

## Human-only Chess OAuth acceptance (NOT MET)

- THIEPN Account `chess` app remains inactive; Chess first-party OAuth client registry has **zero entries** in the P69C inspection. RLS and three owner policies are installed, but this is not live login verification.
- Authorized operator must register exactly one Chess public OAuth 2.1 Authorization Code + PKCE S256 client (no secret), origin `https://chess.thiepn.dev/`, exact redirect `https://chess.thiepn.dev/auth/callback/`; bind the issued UUID in the Account registry and enable the app only after reviewed interactive probes. Never use another THIEPN app's UUID; no automatic dynamic client registration.
- Qualify guest, signed-in Account auto-attach and explicit connect, strict callback replay/state, A → B → guest partitioning, cross-tab sign-out/rotation, offline/revoked token, grant revocation and disconnect/reconnect.
- On **two physical devices**, test same-account revision-safe saves, concurrent writes, both conflict resolutions, guest/legacy recovery, backup export and no account A data when B signs in. Attach observable evidence.

## Human-only visual, teaching and hardware acceptance (NOT MET)

- Sign off desktop and phone board/notation contrast, typography, Train queue readability, Learn/Review, Progress empty-history truth, promotion picker, keyboard focus, overflow and 200% text zoom **from candidate screenshots and real interaction**, not CSS changes alone.
- Android Chrome, iPhone/iPad Safari, desktop Edge/Chrome: actual Stockfish game to completion, full game recovery/reload/background resume, 10+0 and 15+10 clocks, network interruption, touch promotion and analysis handoff.
- Screen readers TalkBack/VoiceOver/NVDA, touch keyboard, reduced motion, system text scaling; note exact device, OS, browser and tested commit.
- Chess educator review of all high-impact instructional claims, alternative moves, engine-verified tactics and the **49 of 86 lessons with retrieval-only rather than independent transfer evidence**. Either author truly distinct valid transfer positions or publish with honest retrieval-only labeling.

## Release authorization rule

Keep P70 draft stacked on P69C. Obtain all human sign-offs and all same-head automated gates, fix any confirmed remaining defects, merge the stack in order only after acceptance, and verify three required checks on the merged `main` SHA. The operator must separately set `CHESS_RELEASE_APPROVED_SHA` to that *exact* main commit after approving all human gates. Pages must stay skipped until then. Production smoke-test, record the rollback revision and do not advertise V1.0 beforehand.

**Next phase: P71 — Human Acceptance Evidence, Visual Approval & Controlled Release.** P71 begins only after P70's automatable QA passes; P71 must not substitute mock proofs for real OAuth and device acceptance.
