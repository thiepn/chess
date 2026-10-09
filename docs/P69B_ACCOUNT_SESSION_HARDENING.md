# P69B — Chess First-Party Session Hardening

**Status: Draft / pending manual OAuth registration and cross-device verification.**
Paired work: Chess P69 draft PR #54, P69B PR #55; Account inactive registry PR #67.

## P69B implementation

1. Fixed all three reported P69 TypeScript errors (nullable SSO in event callbacks, optional OAuth issuer). The SDK receives **exact canonical Chess issuer and callback values** only after structural configuration validation.
2. Preserved Account's audited OAuth 2.1 + Authorization Code / PKCE S256 SDK. App token is stored under **Chess-origin-only** storage key `thiepn:chess:account-session:v1`. Never share a parent-domain cookie or import Account dashboard tokens.
3. Fail closed to guest mode if no issued Chess OAuth UUID or a publishable client key is absent, malformed or secret. The UI explains the difference between *unregistered* and *misconfigured*. No mock sign-in or OAuth client fabrication.
4. Added same-origin cross-tab token-change listening. A sibling Chess tab re-verifies on Chess token rotation/removal, not on other THIEPN apps' storage. The repository subscriber reloads the correct account partition on identity changes.
5. Prevented a **legacy** `supabase.auth.getSession()` cache from selecting an identity for an app-scoped OAuth session during offline identity verification. Remote writes still require fresh verified OAuth identity and RLS.
6. Unit regression tests cover A → B → guest partitioning, verified app token injection into Supabase PostgREST/RPC, blocked legacy-session fallback, strict callback parse (no duplicate code/state, mixed implicit grants, fragments or attacker redirect fields), unsolicited callback without saved PKCE state, and Chess-only cross-tab storage signal matching.
7. Browser UX test confirms an unregistered Chess app has a useful guest backup UI, but **no broken Connect** button.
8. Deployed **`supabase/migrations/005_chess_connection_grant_enforcement.sql`** to THIEPN Account (project `hycegznamzjhwinegaai`). The owner-RLS helper now checks all at once:
   - the caller's JWT `client_id` equals one live Chess OAuth public-client registry entry with the canonical Chess HTTPS origin and callback;
   - Chess is an active Account app and the first-party client itself is active;
   - `account_app_connections(user_id,app_slug)` status is `connected`;
   - `account_app_grants` contains a `granted` `identity.basic` for the same owner.
   
   Consequently, disconnecting Chess or revoking its identity grant denies backend access even while an older access token is not yet expired. The function is callable only by `authenticated`, and all three `chess_user_state` RLS policies still require `auth.uid()=user_id`.

## Remaining production requirements

**Important:** no canonical Chess public OAuth client ID currently exists in the Account registry. The `chess` Account app is intentionally inactive. No authenticated save should work yet.

- Following `thiepn/account/docs/FIRST_PARTY_CLIENT_ONBOARDING.md`, inspect existing OAuth client records and perform **one operator-only registration**. Do not run DCR on PR or push. Register exact `https://chess.thiepn.dev/` origin and `https://chess.thiepn.dev/auth/callback/` public redirect using PKCE S256, no client secret.
- In a separate approved Account migration, bind the issued UUID and exact callback; only activate Chess after Account SSO probe, consent and reconnect checks are qualified.
- Configure non-secret GitHub variables `CHESS_SUPABASE_URL`, `CHESS_SUPABASE_PUBLISHABLE_KEY`, and `CHESS_OAUTH_CLIENT_ID` to the issued real Chess values. Never copy an ID from Library, Room or Languages.
- With real identities A and B: test Account signed-in → Chess auto-connect, explicit connect, callback one-use validation, cross-tab sign-out, disconnect, same-account UUID, A→B navigation+data isolation, A and B on separate devices, concurrent revision conflicts, offline retry and archived recovery, expired/revoked token and browser-storage denial.
- Device: repeat on physical iOS Safari/Android Chrome and keyboard/VoiceOver/TalkBack, 200% text and reduced motion.
- Visual release: P64 changed 12 reference screenshots; P69B does not approve them. Human screenshot review and strict visual-baseline rerun still required.
- Quality/Device UX must be checked on **the exact P69B head**, not an earlier commit.

## Release disposition

P69B → P69 → P68 → P67 → P66 → P65 → P64 → P63 → P62 → P61 → main.

**Hold**: No merges, deployment, OAuth client creation or production account activation based only on unit tests. Live account acceptance and visual/manual release signoff remain mandatory.
