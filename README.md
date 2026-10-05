# Chess

A personal, adaptive chess-learning app for the thiepn ecosystem.

## Product contract

Chess is not a general chess portal. It is a personal coach that decides what deserves training time based on curriculum readiness, retention, weaknesses, and real-game evidence.

Core loop:

```
Learn → Practice → Play → Review → Diagnose → Retrain → Retain
```

The default experience should answer one question: **what should I train now?**

## Implemented foundation

- P0 product architecture and five-area information model
- P1 typed curriculum graph, multidimensional mastery, evidence weighting, retention and weakness scoring
- P2 adaptive 10/25/60-minute Training Composer with diversity, novelty and fatigue constraints
- Local-first durable state
- Optional Supabase persistence using the shared authenticated user
- Responsive Home and session runtime shell
- Reduced-motion and keyboard-friendly interaction defaults

The current curriculum is intentionally a representative seed graph rather than the final 200–300 atomic-skill catalog. It establishes the data contract that later content phases expand.

## Run

```bash
npm install
npm run dev
npm test
npm run build
```

## Account sync

Point `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` at the same Supabase project used by the thiepn account system, then apply `supabase/migrations/001_chess_learning_state.sql`.

If there is no authenticated Supabase session, the app stays fully usable with local persistence.

## Architecture

Static curriculum lives in version control. Personal state lives behind a repository interface and can persist locally or to Supabase. Disposable engine calculations, puzzle corpora and board runtime state do not belong in account sync.

## Next phase

P3 — Interactive Lesson System, Chess Board Teaching Engine & Visual Pedagogy.
