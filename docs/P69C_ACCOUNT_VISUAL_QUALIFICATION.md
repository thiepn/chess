# P69C — First-Party Account Boundary and Visual Acceptance Package

**Release decision: HOLD.** Changes are stacked on P69B #55, P69 #54, and P61–P68. No production deployment, registration, approval or merge is authorized here.

## Results and scope

### Account integration safety

P69B provided the pinned first-party Account OAuth 2.1/PKCE SDK, app-scoped tokens, identity-switch state partitions, and owner-/app-/grant-validated RLS.

P69C adds regression tests covering:
- an identity switch/sign-out **while a write is awaiting verified token ownership**: the old user's local dirty copy stays recoverable and there is no remote RPC;
- an OAuth verification outage: a local account-scoped edit is retained with pending sync status, but cloud writes are not attempted;
- authenticated-only authorization remains a database rule rather than a client UI claim.

Read-only THIEPN Account inspection on 2026-10-09:
- `account_apps.slug=chess`: exists, **inactive**;
- `account_first_party_oauth_clients` for Chess: **0 rows**;
- Chess state RLS: **enabled**, with **3** owner policies;
- `chess_first_party_client_is_authorized()` executable by `authenticated`, denied to `anon`.

The database checks **cannot certify signed-in or dual-device acceptance** while Chess has no first-party client. An operator, not CI, must register one exact, secretless Chess public client and pin its UUID in Account's first-party registry, then enable the product after human testing.

### Visual acceptance evidence

P64 intentionally altered the board and typography; historic P59 reference screenshots still differ. P69C **does not approve those pixels**.

The existing P67 candidate workflow now also supports the P69C branch and produces a paired, SHA-bound visual-review artifact. The review artifact contains:
- `baseline/*.png`: previously approved references;
- `candidate/*.png`: images captured from the exact candidate build;
- `index.html`: side-by-side before/after layout at desktop/phone widths;
- `manifest.json`: commit, each image filename, SHA-256 hashes, sizes, changed flag, and an explicit `UNAPPROVED` status.

`npm run visual:review:test` guards against missing or mismatched screenshots and confirms there is **no automatic acceptance**. Strict Visual Regression remains unchanged until a real reviewer signs off and commits reviewed references.

## How to qualify visual acceptance

1. Download the latest **P67 Visual Candidates** artifact corresponding to the final P69C commit; open `p69c-visual-review/index.html` locally.
2. Review each desktop and phone image against its paired baseline. Cover board piece contrast, readable notation, no clipped controls, Train queue titles, lesson readability, Review workbench, Progress honest empty-history state, keyboard focus and phone navigation.
3. Audit actual training/gameplay states and promotion choice on Android/iOS/tablet at 200% zoom; the static images do not replace these checks.
4. Record reviewer identity, exact commit hash, date, accepted/rejected image name and decision rationale, with rejected images fixed **before** approval.
5. Commit only the explicitly approved snapshots, unchanged filenames and thresholds. Re-run Quality, full Chromium/WebKit Device UX and strict Visual Regression on the **same exact commit**.

## How to qualify authenticated Account behavior

1. Follow `thiepn/account/docs/FIRST_PARTY_CLIENT_ONBOARDING.md`: check for duplicates and run the permitted **manual-only** registration. Never run DCR on push/PR and do not copy a client UUID from another app.
2. Bind the issued Chess UUID to **https://chess.thiepn.dev/** and exact callback **https://chess.thiepn.dev/auth/callback/** in a reviewed Account migration. Activate Chess only after the SSO probe/consent and reconnect rules are verified.
3. Test fresh guest, Account auto-attach, explicit connect, callback PKCE replay/malformed requests, A→B→guest partitioning, cross-tab local sign-out, Account disconnect/reconnect, token revocation, disconnected-but-unexpired JWT, browser storage restrictions and offline retry.
4. On two real devices, verify same-Account save/reload and simultaneous revision conflict. Confirm both conflict choices and archive recovery. Show no data for another account.
5. Keep the production release SHA, THIEPN Account GitHub variables, physical-device accessibility and pedagogy review gated separately.

## Stacked state

P69C (draft) → P69B #55 → P69 #54 → P68 #53 → P67 #52 → P66 #51 → P65 #50 → P64 #49 → P63 #48 → P62 #47 → P61 #46 → `main`.

**No OAuth client is registered by this phase. No visual baseline is automatically approved. No production deployment occurs.**
