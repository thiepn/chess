# P69 — First-Party Account & Visual Acceptance

**Status: implementation staged; not a production release.**

Chess PR #54 is stacked on P68 #53. Account PR #67 stages the associated inactive first-party app metadata. Production `main` has not been updated.

## Source of truth / changes

- `thiepn/account@be0adad0ca5a8ba3811eea9eb109135805055fe7` is the pinned shared first-party OAuth 2.1/PKCE SDK source. Chess uses Account's OAuth service rather than issuing Google login from Chess.
- Account metadata migration `20261009103000_chess_app_registration_inactive.sql` was applied to THIEPN Account. Chess is **inactive** and requires `identity.basic` (required, immutable, basic). URL: `https://chess.thiepn.dev/`.
- Live query confirmed **zero** Chess first-party OAuth client registrations. Neither a client ID nor credentials were guessed, manufactured or copied from another product.
- Chess's SDK bridge only initializes with exact `VITE_SUPABASE_URL`, `VITE_THIEPN_ACCOUNT_CLIENT_ID` and `VITE_THIEPN_ACCOUNT_REDIRECT_URI`. Without them, the existing guest experience stays functional.
- First-party authorization uses a separate app-local SDK session; PostgREST receives that verified app-scoped bearer token via `accessToken`. Auth callback is handled before initial React render and its one-use code is stripped from history.
- `004_chess_first_party_client_scope.sql` is deployed in the THIEPN Account project. Chess owner-RLS now also requires a live, active, exact Chess OAuth app registry binding and `client_id` claim; all cross-app and currently unregistered sessions are denied.
- Account user IDs are canonical owner keys; A and B browser-state partitions remain separate. Guest/legacy progress is not silently reassigned after sign-in.

## Manual-only Account OAuth client registration

1. Review Account PR #67 and the operator onboarding contract in `thiepn/account/docs/FIRST_PARTY_CLIENT_ONBOARDING.md`.
2. Confirm existing `auth.oauth_clients` and `account_first_party_oauth_clients` still have no matching Chess public OAuth client.
3. Register exactly one public OAuth 2.1 Authorization Code + PKCE S256 client, `token_endpoint_auth_method=none`, `grant_types=authorization_code,refresh_token`, origin `https://chess.thiepn.dev/`, callback **exactly** `https://chess.thiepn.dev/auth/callback/`. This registration MUST use an operator-only manual operation, not a PR, push or automatically recurring GitHub workflow.
4. Record its generated UUID and pin it in an Account-side reviewed migration after verifying `auth.oauth_clients` metadata. Mark Chess active only after backend and callback acceptance.
5. Configure publishable GitHub repo variables `CHESS_SUPABASE_URL`, `CHESS_SUPABASE_PUBLISHABLE_KEY`, `CHESS_OAUTH_CLIENT_ID`. Production audit requires the exact issued client ID and callback.
6. In a clean browser with Account signed in, verify first-party probe and automatic SSO; in a second clean browser with Account signed out, verify guest display and explicit connection. No redirect loop.
7. Use real users **A** and **B** for same-UUID identity, account switch, local sign-out, disconnect in Account, revoked refresh, simultaneous two-device writes, revision conflicts and recovery export. Verify Account data deletion/revocation semantics separately.
8. Inspect browser tokens: app-only storage origin, no parent-domain cookies, no service role key or token in callback URL after completion.
9. Complete iPhone/Android/desktop accessibility, offline startup and malformed-auth-code tests. Never treat CI mock responses as authenticated evidence.

## Visual acceptance

P64 changed Train, Learn, Play, Review and Progress. Earlier P59 snapshots are **not** automatically approved.
The P67 visual workflow produced independent desktop and mobile candidate artifacts, including screenshot hashes. Human reviewer must inspect all desktop/phone core-route captures and representative promotion/gameplay states, approve or reject each with reason, commit approved binary reference images, and rerun unchanged Visual Regression.

**Known outstanding:** visual baseline human approval, real-account authorization, actual first-party client registration, physical device and instructor audit of 49 retrieval-only lessons.

## Release rule

P69 → P68 → P67 → P66 → P65 → P64 → P63 → P62 → P61 → main.
No merging the draft stack, no deployment, no automatic account OAuth DCR, no manufactured SSO-success claim. The Pages release gate also requires successful tests on one exact main commit and the explicit human-approved `CHESS_RELEASE_APPROVED_SHA`.
