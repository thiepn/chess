# P59B — Review-First Visual Refinement

## Intent and frozen contract

P37 remains authoritative. Train remains the landing route; the chessboard,
notation and instructional material—not marketing banners or generic dashboard
cards—determine page structure. The P59 review measured board visual quality
near 8/10, Review near 7.5/10 and accessibility below the 9/10 target.
This phase addresses concrete issues without claiming a new score that has not
been verified on physical hardware.

## Changes

1. **Review-first landing.** With an already analyzed game, display the first
   critical chess position read-only, players, context, and a one-action deep
   link to the full game review. Existing history and repair rails remain.
2. **Import as a secondary workspace.** PGN, Lichess and file import live in
   a native keyboard-operable disclosure under the game board. If no analyzed
   game exists, the import drawer starts open; there is no empty teaser board.
   The existing analysis and import handlers remain intact.
3. **Board material.** Restrained frame edge and SVG piece fill/stroke tuning;
   no gradients, glows, or animation unrelated to moves. The board retains
   the P37 default palette and P53 customization.
4. **Readability.** More useful font sizes for review history, game status,
   form labels and analysis copy; 16px phone inputs avoid automatic mobile
   Safari zoom. Five-tab mobile navigation has legible labels.
5. **Regression checks.** A real browser journey checks the saved-game board,
   disclosure open/close, and navigation to the right reviewed game. The
   approved desktop and phone screenshots must be visually re-reviewed and
   updated only on the temporary branch. Permanent PR checks stay read-only.

## Acceptance boundaries

- Review with/without a previously analyzed game: browser regression (saved-game
  fixture and isolated new-user context) plus later manual hardware smoke.
- All 18 reference snapshots, standard Quality checks and the P58 simulated
  device UX matrix must pass before merge.
- Screen readers, 200% text zoom, physical-device interaction, and the
  P37 subjective score thresholds **remain independent manual gates**.
- A successful CI run must not be described as physical-device sign-off or
  automatic 9/10 visual quality.

## Hands-on follow-up

Check Review with (a) no games, (b) imported but not yet analyzed games,
(c) fully analyzed games, (d) 50+ games, and (e) offline cached data.
On actual Android, iPhone Safari, iPad portrait/landscape and desktop,
verify focus/scroll position, board contrast, the closed import drawer and
the keyboard-accessible action. Check text contrast and 200% system zoom
before claiming the release threshold.
