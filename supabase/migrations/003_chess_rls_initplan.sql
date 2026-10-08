-- P66: use an initplan for auth.uid(), evaluated once per statement,
-- rather than re-evaluated per row. Ownership semantics stay unchanged.
-- Source: Supabase RLS performance advisor 0003_auth_rls_initplan.
alter policy "Users can read their chess state"
  on public.chess_user_state
  using ((select auth.uid()) = user_id);

alter policy "Users can insert their chess state"
  on public.chess_user_state
  with check ((select auth.uid()) = user_id);

alter policy "Users can update their chess state"
  on public.chess_user_state
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
