# P58 — Device UX Qualification

## Claim boundary

**Automated browser prequalification is not real-device acceptance.** No real
Android phone, iPhone/iPad, Windows touch laptop, or Safari-on-iPad result may
be recorded as passed based on CI emulator runs alone. The release gate is
still open until the hands-on matrix below has dated observations.

## Automated coverage

Run `npm run build && npm run ux:verify` after `npm install` and
`npx playwright install chromium webkit`.

- Chromium 360 × 800 compact Android profile and 393 × 852 Android profile
- Chromium 768 × 1024 and 1024 × 768 tablet orientations with touch emulation
- Chromium 1440 × 900 desktop with pointer/keyboard
- WebKit 390 × 844 emulated iOS Safari
- Nine routed workspaces: Train, Learn, Play, Review, Library, Progress, lesson,
  saved game analysis and saved study.
- Keyboard route activation, Back/Forward, adaptive training enter/exit,
  game enter/exit, persisted Review/Library deep links and touch targets
- Console-recorded route durations and per-project JSON artifacts; these timings
  are CI diagnostics and do not establish physical-device INP, LCP or FPS.

## Hands-on acceptance matrix (unverified until performed)

| Hardware/browser | Viewports & scenarios | Evidence | Result |
| --- | --- | --- | --- |
| Samsung Galaxy / Chrome Android | Portrait, landscape, home-screen PWA; Train, Play with actual moves, Review, return to Train; bottom controls above OS bars | 30 s screen recording + notes | NOT TESTED |
| Small Android (360 px class) | Long lesson, Review, Library, keyboard open/closed, scroll and touch targets | screen recording + notes | NOT TESTED |
| iPhone / Safari | Overscroll, notch/safe areas, browser bars, route/back/forward, gestures | recording + notes | NOT TESTED |
| iPad / Safari | Portrait + landscape, Split View, board tap targets, input focus | recording + notes | NOT TESTED |
| Windows laptop / Edge/Chrome | Mouse, Tab/Enter, Zoom 200%, engine analysis, saved notes across reload | screen recording + notes | NOT TESTED |
| Desktop monitor 1440+ | Route composition, keyboard navigation, deep study and game pages | screenshots + notes | NOT TESTED |

## Acceptance cases

1. First cold app open over Wi-Fi and throttled cellular; record *observed*
   navigation and first interactive chessboard, not an estimated score.
2. Learn → Train → back to same lesson; Review → replay a mistake → return
   to exact reviewed game; Library → saved study → Train and back.
3. Play an actual game against Stockfish, resign or finish it, confirm the
   result is saved and opens the correct Review page.
4. Scroll long collections and notes. Open keyboard; fields, Save and game
   controls remain reachable without being covered by nav or system bars.
5. Switch orientation mid-game and after navigating to Review. Check board
   legality, drag/tap, notation and timer without losing the game.
6. Disconnect network after initial warm load. Record what works and what
   cannot load; do **not** claim offline support without a dedicated test.
7. Check screen reader (TalkBack/VoiceOver where available), 200% text zoom,
   reduced-motion system setting, focus order and contrast.
8. Check PWA launch, deep-link recovery, back navigation, reload and
   persistence under the actual deployment URL.
9. Record a crash, loading stall, unexpected scroll or invisible board as
   a release blocker; retest the exact failing device after fixing it.

## Sign-off record template

- Device model/OS/browser + build revision:
- Date, tester, connectivity and orientation:
- Screens/videos or defect references:
- Routes and actions exercised:
- Pass/fail with observed failure details:
- Verified fix SHA and retest (if applicable):
- Release decision: **PENDING REAL-DEVICE TESTS**.

The P58 CI workflow can pass while hardware acceptance is still pending.
P59 visual-design scoring and P60 release sign-off must not inherit a
physical-device PASS from this automated evidence.
