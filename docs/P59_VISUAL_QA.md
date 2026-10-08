# P59 — Visual QA Against the Frozen P37 Design

## Evidence and limits

Inspection basis: 18 checked-in P57 Chromium visual-reference screenshots
(1440 × 900 desktop and 393 × 852 phone), P37/P48–P58 design contracts,
the shipped CSS and the automated CI journeys. Scores are **reviewer
judgments**, not statistical measurements or evidence of testing on physical
hardware. A passing screenshot regression means the image has not drifted
unapproved; it does not mean the design is excellent.

## P37 acceptance audit

| P37 category | Locked target | Initial screenshot review | Evidence / issue |
| --- | ---: | ---: | --- |
| Identifiably chess software | 9 | 9 | Boards, notation and chess-specific navigation dominate |
| Board visual quality | 9 | 8 | Strong chess silhouette, but limited polish of SVG pieces and frame |
| Train | 9 | 8 | Strong board-first layout; rail metadata too small |
| Play | 9 | 8.5 | Board-centric and recognizable, but configuration metadata tiny |
| Review | 9 | 7.5 | Detailed game page good; index opens on a dominant PGN form |
| Mobile | 9 | 7 | Library top spacing, reading bar occlusion, microscopic metadata |
| Visual identity | 8.5 | 8 | Distinct graphite/ivory, but insufficient reading contrast |
| Non-SaaS character | 9.5 | 9.5 | Purpose-built chess pages; no generic hero/card dashboard |
| Accessibility | 9 | 7 | Screen-reader and physical-device testing pending; numerous 7–9 px labels |

Scores intentionally remain **below target** where the evidence does not
justify a release-grade rating.

## P59 repairs

1. Mobile Library archive rail gets a single clear title/action row, followed
   by the collection scroller and study links. A browser geometry probe
   identified the actual 80px gap: `position: relative` retained a legacy
   `top: 80px` from the former sticky rail. Override to static positioning
   and keep the archive's H1 available to screen readers while visually
   de-duplicating it.
2. Mobile lesson Previous/Next controls follow the reading content instead of
   covering it when the user reaches the board and explanation.
3. Increase supporting metadata on Learn, Review, Library and Progress to
   readable sizes and improve contrast for important explanatory text.
4. Add geometry regression checks and update the approved screenshot
   baselines after reviewing the changes; do not auto-update ordinary PRs.

## Post-repair visual recheck

The refreshed mobile Library image now starts directly below the topbar; the
misapplied 80px relative offset is gone. The archive rail combines the title
and Analysis board action without repeating the primary page heading. The
lesson detail capture no longer shows Previous/Next controls obscuring the
teaching paragraph, and Library metadata is more legible on desktop and phone.

Qualitative recheck: **mobile approximately 8/10, Library approximately 8/10,
visual identity approximately 8/10**. These are improvements, not the P37
release-level 9/10 target. Other initial grades remain provisional until
deliberately re-reviewed at all required workspaces and device sizes.

## Explicit remaining work for the release gate

- Board/piece artwork and presentation should be reviewed against premium
  chess-app references; this phase does not claim subjective 9/10 board polish.
- Review index is still led by PGN import instead of the existing analyzed
  game; improve review-first hierarchy without hiding import.
- Text scales and contrast need quantitative checks in each route, including
  200% zoom and system font size changes.
- Real device, TalkBack/VoiceOver/NVDA keyboard qualification is still P58
  **NOT TESTED** and must not be implied by green CI.
- Conduct human visual acceptance against every P37 threshold and log dated
  screenshots, not scores based exclusively on code tests.

**Decision:** Visual improvements are appropriate to merge, but P59 does not
grant a design or physical-device release PASS until unmet thresholds are
demonstrably addressed.
