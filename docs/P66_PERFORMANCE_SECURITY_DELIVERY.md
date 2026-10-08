# P66 — Performance, Security & Delivery Hardening

Status: **draft, not qualified for production**.
GitHub PR: #51. Stack: P66 → P65 → P64 → P63 → P62 → P61 → main.

## Completed engineering changes

### Dependency reproducibility and provenance

- `package-lock.json` v3 records 218 dependency entries and registry integrity hashes; reviewed Stockfish version is **19.0.0**.
- `npm ci --no-audit --no-fund` replaces `npm install` in **Quality**, **Visual Regression**, **Device UX**, and **Deploy Pages**. CI must refuse dependency drift.
- `npm run lock:audit` checks that package.json's declared dependencies agree with the lockfile and that resolved packages carry integrity metadata.
- A temporary branch-restricted workflow generated the lockfile. It has been **removed**; no permanent contents-write automation was retained.

### Production artifact security

- Vite source maps disabled for production.
- `npm run release:audit` validates the built Vite index/deep-link fallback, nonempty assets, source-map absence, embedded-key scanning, Stockfish 19 JS+WASM manifest, and GPL 3.0/source-reference files.
- Browser payloads may contain a **publishable** Supabase key (expected); they must never include service-role keys or secret private keys.
- `npm run release:audit -- --production` additionally refuses to ship unless `VITE_SUPABASE_URL` matches the selected **THIEPN Account** project `hycegznamzjhwinegaai`, and `VITE_SUPABASE_ANON_KEY` is a publishable/anon client key.
- Configure the following non-secret **repository variables** in GitHub for the production Pages workflow:
  - `CHESS_SUPABASE_URL` = THIEPN Account project URL;
  - `CHESS_SUPABASE_PUBLISHABLE_KEY` = public publishable key for the same project.
- Production Pages injects these variables **during the build**. No key was set by this PR. Without a valid key, release must fail closed. **A configured key alone is not proof SSO works**.

### Performance and delivery

- Existing application budgets remain: initial application ≤260 KiB compressed, each JS chunk ≤260 KiB, each CSS chunk ≤42 KiB, all app JS+CSS ≤321 KiB (the P64 audited allocation).
- Stockfish 19 WASM is excluded from the JS/CSS budget; real hardware memory, worker lifecycle, and WebKit stability must be measured separately.
- Workflow promotion already requires Quality, Visual Regression and Device UX **on the exact current `main` SHA**; preserving this gate is mandatory.
- Release remains deployable only from `main`, never directly from this PR. The Pages build must also pass the production artifact audit.
- A previous good Pages deployment serves as rollback reference; rolling back still requires an authorized deployment at an approved commit, not an automatic claim.

## Database security evidence

Read-only inspection of THIEPN Account's Chess state table confirmed:

- RLS enabled for `public.chess_user_state`;
- Three policies for owner-scoped SELECT, INSERT and UPDATE;
- Authenticated role can execute `chess_save_state(jsonb,bigint)`;
- Anonymous role cannot execute the save function.

These checks confirm configuration, **not** two-account/browser API isolation. Live authenticated integration and conflict drills remain mandatory.

## Mandatory final acceptance, still open

1. All three CI checks green on **P66's same current commit** after lockfile and artifact auditing.
2. Review the full new P64 desktop/phone screenshot baselines side by side. Keep strict Playwright comparisons and commit only approved captures.
3. Resolve repeated WebKit game reload crashes under simulated and physical Safari, with real-worker/timed-game testing.
4. Complete THIEPN Account browser SSO integration. Test A→B sign-out/sign-in, two-device concurrent revisions, guest migration, offline retry and recovery archive on real accounts.
5. Audit 49 remaining retrieval-only lessons, educator review, engine checking of questionable tactics and endgame claims.
6. Physical Android, iPhone, tablet, screen readers, 200% text zoom, reduced motion, offline/weak network, accessibility and memory/performance acceptance.
7. Confirm GitHub repository variables are configured and production static assets are built for the correct project.
8. Freeze final release SHA, tag version only after approval, production smoke test, monitor for errors, document a tested rollback.

**P66 code complete does not mean Chess V1.0 is approved. No production deployment or merge is authorized by this document.**
