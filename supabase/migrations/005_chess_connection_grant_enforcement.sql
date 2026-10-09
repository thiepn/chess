-- P69B: first-party identity MUST carry a live, owner-scoped
-- Account connection and required identity.basic grant on every request.
-- A previously issued but unexpired JWT is insufficient after disconnect:
-- the database immediately denies Chess cloud data access.
--
-- Upgrades the earlier P69 client_id authorization function used by all
-- three chess_user_state RLS policies; existing table/RPC grants unchanged.
create or replace function public.chess_first_party_client_is_authorized()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.account_first_party_oauth_clients c
    join public.account_apps a on a.slug = c.app_slug
    join public.account_app_connections conn
      on conn.app_slug = c.app_slug
     and conn.user_id = (select auth.uid())
     and conn.status = 'connected'
    join public.account_app_grants grant_row
      on grant_row.app_slug = c.app_slug
     and grant_row.user_id = conn.user_id
     and grant_row.permission_id = 'identity.basic'
     and grant_row.status = 'granted'
    where c.app_slug = 'chess'
      and c.active
      and a.active
      and c.client_uri = 'https://chess.thiepn.dev/'
      and c.redirect_uri = 'https://chess.thiepn.dev/auth/callback/'
      and c.oauth_client_id::text = (auth.jwt() ->> 'client_id')
  );
$$;

revoke all on function public.chess_first_party_client_is_authorized() from public, anon;
grant execute on function public.chess_first_party_client_is_authorized() to authenticated;
