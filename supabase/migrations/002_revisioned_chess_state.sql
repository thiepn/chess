-- P61: optimistic concurrency for the single-row chess learning document.
-- Clients must use this RPC rather than direct upsert. Existing rows start at
-- revision 0; only an owner with the expected revision may update the row.
alter table public.chess_user_state
  add column if not exists revision bigint not null default 0;

create or replace function public.chess_save_state(
  p_state jsonb,
  p_expected_revision bigint
)
returns table (
  accepted boolean,
  current_revision bigint,
  current_state jsonb
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_state is null or jsonb_typeof(p_state) <> 'object'
     or jsonb_typeof(p_state -> 'mastery') <> 'object' then
    raise exception 'Invalid chess state' using errcode = '22023';
  end if;
  if p_expected_revision < 0 or p_expected_revision is null then
    raise exception 'Invalid state revision' using errcode = '22023';
  end if;

  insert into public.chess_user_state (user_id, state, revision, updated_at)
  select v_user, p_state, 1, now()
  where p_expected_revision = 0
  on conflict (user_id) do update
    set state = excluded.state,
        revision = public.chess_user_state.revision + 1,
        updated_at = now()
    where public.chess_user_state.revision = p_expected_revision
  returning true, revision, state
  into accepted, current_revision, current_state;

  if found then
    return next;
    return;
  end if;

  select false, revision, state
    into accepted, current_revision, current_state
    from public.chess_user_state
    where user_id = v_user;

  if found then
    return next;
    return;
  end if;

  -- A deleted row with a nonzero expected revision is a conflict rather
  -- than permission to recreate from an outdated snapshot.
  accepted := false;
  current_revision := 0;
  current_state := null;
  return next;
end;
$$;

revoke all on function public.chess_save_state(jsonb, bigint) from public, anon;
grant execute on function public.chess_save_state(jsonb, bigint) to authenticated;
