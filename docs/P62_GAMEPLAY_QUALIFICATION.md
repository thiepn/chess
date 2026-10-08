# P62 — Gameplay, Clocks and Recovery

Status: code candidate. Requires full CI and real-device acceptance before release.

## Game persistence

Standard and scenario games started in Play use a browser-local, P61 account-scoped record. Each checkpoint captures original FEN, complete legal UCI move history, clock state, and terminal result. Starting a new game replaces the previous active checkpoint for that profile. Explicit Exit removes it. Navigating away without exiting preserves it and Play presents Resume.

Reload reconstructs the board by replaying every move rather than overwriting the FEN. This preserves repetition history, castling rights, en passant eligibility, promotion, and notation. Invalid snapshots are retained, and a JSON recovery export is available instead of silently starting a fresh game.

## Clock semantics

10+0 / 15+10 use elapsed wall-clock milliseconds, not a fixed decrement per timer callback. Clocks continue across background suspension or reload, with an increment only after a completed legal move. The engine-loading/error interval pauses both clocks. An expired move is undone before recording the timeout result. Untimed sessions never drain clocks.

## Engine and Review

The active engine refuses stale responses from a position that has already changed. When the worker fails or times out, the user may retry the opponent. On completion, the checkpoint records terminal metadata before Review analysis begins. Review retries do not duplicate completed training evidence. A timeout before any moves is retained as a terminal state without inventing an invalid PGN.

## Automated tests

- Legal replay across castling/repetition/promotion positions
- Invalid snapshot preservation and mismatch detection
- Wall-clock drift and increment accounting
- Exact Play route restoration after browser reload
- Corrupted game export in the browser
- Existing app Quality, Visual Regression, and Device UX Prequalification

## Release blockers

1. Live stockfish opponent completion and recovery on real Android and desktop
2. At least one real timed game with reload, sleep/background and timeout
3. Account A / Account B isolation under the actual THIEPN Account sign-in system
4. Client deployment configuration for THIEPN Account Supabase (P61)
5. Physical iPhone/iPad and accessible board testing

Training-runner GameArena sessions under /train/session are still backed by the preexisting training runtime restore contract. P62 focuses durable full-game recovery on /play/game routes; full training-runner move persistence is a separate acceptance item and must not be falsely claimed.

Do not merge into main or tag V1.0 until the P61 backend dependency and P62 release gates are satisfied.
