# P61 — Chess Data Integrity

Status: Code candidate. Production acceptance remains pending.

## Changes

- Account-specific browser storage and a separate guest profile
- Preservation of the previous unscoped local snapshot for explicit recovery
- Reload of in-memory state following authentication changes
- Ordered cloud writes with database revision checks
- Visible pending/conflict states and explicit recovery choices
- JSON backup export and import

## Database prerequisites

The app needs both migrations, in order:

1. supabase/migrations/001_chess_learning_state.sql
2. supabase/migrations/002_revisioned_chess_state.sql

The connected THIEPN database projects were checked during this phase and neither currently contains the chess_user_state table. The intended chess data project must be selected before applying migrations. Do not enable cloud variables until that schema is applied and verified.

Without VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY the product operates in browser-local mode. Do not describe this as account sync.

## Acceptance

- Account A and account B cannot read or upload one another's local chess state.
- Existing legacy progress remains recoverable and is never adopted automatically by a newly signed-in account.
- Offline changes are not discarded by stale cloud responses.
- Concurrent writes from two devices are detected and require deliberate conflict resolution.
- Local and cloud choice can be recovered from backups.
- Authentication transitions safely reload profile data.
- CI gates, physical devices, and screen-reader journeys pass.

Do not merge or announce V1.0 before the applicable tests and backend acceptance are evidenced.

P62 remains responsible for restoring in-progress games and clocks.
