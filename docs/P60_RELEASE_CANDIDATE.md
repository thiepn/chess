# P60 — Defect-Only Release Candidate

## Release designation

**Candidate (code/CI qualified only). NOT APPROVED FOR V1.0.**
The P37 visual acceptance scores and P58 real-device qualification are **open**.
No claim of successful human physical-device testing, screen reader testing,
or a production release tag is made here.

## Feature freeze

No additional game modes, social features, analytics dashboards or new
planning abstractions. P60 changes are limited to correcting risks already
found in the released code and release process.

## Defects corrected

**Release gate bypass (P60-RC-01, high):** Deploy Pages previously listened
only for the Quality workflow and could publish a commit whose Visual
Regression or Device UX check was still running or had failed. It now starts
after a successful main-branch Device UX *push* and independently requires
Quality, Visual Regression, and Device UX all to have succeeded for the
identical main-branch commit SHA. Manual dispatch follows the same gate.
Superseded commits are skipped rather than rolled back into production.
All three workflows run on every push to main, including documentation-only
changes, so there is no missing gate because of path filtering.

**Cloud/local data retention (P60-RC-02, high):** Successful cloud saves did
not refresh the local fallback, so a later offline load could restore stale
chess learning state. Save now immediately mirrors locally, retains a pending
marker until a successful remote response, preserves pending offline edits
against stale remote data on reload, and serializes remote writes so older
responses cannot overwrite newer saves. Remote loads refresh the local cache.

**Recovery follow-up (P60-RC-03):** A dirty local mirror was only retried
on another edit or full reload. Pending writes now retry on browser reconnection,
window focus, or return from a background tab. The retry waits behind all
outstanding saves and reads the most recent local snapshot. Repeated retries
are harmless once the pending marker is cleared. This is client lifecycle
recovery, not a promise of background synchronization after the page is closed.

The dirty marker is a single-device recovery safeguard, **not** a conflict-
free cross-device merge algorithm. When two devices make different edits
offline, the product does not claim to merge them. That limitation remains a
manual acceptance and product-policy issue, not something masked by green CI.

## Automated required evidence

| Gate | Evidence | Required status |
| --- | --- | --- |
| TypeScript + production build | Quality | PASS |
| Unit and release-evidence tests | Quality | PASS |
| Content, accessible markup, performance and architecture audits | Quality | PASS |
| 18 locked Chromium baseline screenshots | Visual Regression | PASS |
| Six Chromium/WebKit configurations; gameplay, training, Review, Library and first-time-user flows | Device UX Prequalification | PASS |
| Static Pages artifact with `index.html`, `404.html`, Vite manifest and engine assets | Deploy Pages | PASS |
| All 3 checks have same `main` push SHA | Deploy Pages release gate | PASS |

CI links must reference the *merge commit*, not old PR checks. A browser
emulation pass does not satisfy actual iPhone/Android/desktop qualification.

## Unresolved release blockers (explicitly not verified)

1. **P58 physical-device qualification.** Android phone, iPhone Safari,
   iPad Safari and desktop input modes (keyboard/mouse) need recorded human
   tests under `docs/P58_DEVICE_QUALIFICATION.md`.
2. **Accessibility.** Actual TalkBack/VoiceOver/NVDA reading order, focus
   trapping, 200% text zoom, OS font enlargement and live game interaction.
3. **P37 visual design targets.** P59 scored several categories below the
   locked thresholds. P59B fixed deficiencies but no evidence establishes
   that every category now meets the required 9/10.
4. **Cloud sync conflicts.** Simultaneous edits on multiple offline devices
   have no conflict-free merge; confirm documented expected behavior before
   presenting cloud sync as reliably conflict-resolving.
5. **End-to-end engine gameplay on real hardware.** Make real legal moves,
   continue a game after reload, finish it, and verify Review records.

## Promotion rule

**Do not tag, label, or announce V1.0** until an operator records device
model, OS/browser, date, screenshots/screen recordings, exact tested git SHA,
P37 scores and keyboard/screen-reader outcomes for every blocker above.
Code CI success proves a reproducible build candidate, not full user
acceptance. Only defect fixes are permitted before that gate closes.

For any new defect, identify a reproduction, regression test, fix commit and
specific retest. Avoid reopening P37 design direction or feature scope.
