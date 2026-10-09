-- P69: isolate Chess cloud data by both user identity AND registered
-- first-party app identity. THIEPN Account issues a client_id claim only to a
-- registered public OAuth client. Any other OAuth client, guest, legacy/native
-- Supabase session, or inactive Chess registration must be refused.
--
-- This migration is fail-closed before Chess receives its own OAuth client.
-- Do not activate the Account app until real A/B and revoke tests pass.
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

alter policy "Users can read their chess state"
on public.chess_user_state
using (
  (select auth.uid()) = user_id
  and (select public.chess_first_party_client_is_authorized())
);

alter policy "Users can insert their chess state"
on public.chess_user_state
with check (
  (select auth.uid()) = user_id
  and (select public.chess_first_party_client_is_authorized())
);

alter policy "Users can update their chess state"
on public.chess_user_state
using (
  (select auth.uid()) = user_id
  and (select public.chess_first_party_client_is_authorized())
)
with check (
  (select auth.uid()) = user_id
  and (select public.chess_first_party_client_is_authorized())
);
