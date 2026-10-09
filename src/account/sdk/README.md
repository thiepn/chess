# Pinned THIEPN Account session SDK

Vendor source: `thiepn/account@be0adad0ca5a8ba3811eea9eb109135805055fe7`

- Original paths: `packages/account-session/src/index.ts`, `packages/account-session/src/browser-sso.ts`, and `packages/account-session/LICENSE`.
- The code is the upstream first-party OAuth 2.1 + PKCE session runtime, not a Chess-specific replacement or direct Google sign-in.
- Local copies are intentionally pinned for a verifiable release, and MUST be diff-reviewed and accompanied by source/license information whenever the Account SDK is upgraded.
- OAuth client UUIDs and publishable keys are **deployment configuration**, never embedded in this source.
- The Account registration must be active before enabling Chess cloud mode. Local sign-out is app-specific and suppresses automatic reconnect; no shared cross-domain cookie is used.
- Confirm production build budget before release. No production signature/authenticated acceptance is inferred by a unit test or pinned source alone.
