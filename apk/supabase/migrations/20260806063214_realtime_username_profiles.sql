-- Make the portal's user state durable, owner-scoped, and realtime.
-- Authentication still uses Supabase's UUID internally; username is the
-- unique, user-facing identifier.

alter table public.profiles
  add column if not exists username text,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists user_type text not null default 'tourist',
  add column if not exists language text not null default 'en',
  add column if not exists monuments_visited text[] not null default '{}',
  add column if not exists quiz_scores integer[] not null default '{}',
  add column if not exists profile_badges text[] not null default '{}',
  add column if not exists chat_history jsonb not null default '[]'::jsonb,
  add column if not exists admin_mode boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

update public.profiles
set
  username = coalesce(
    nullif(lower(regexp_replace(username, '[^a-zA-Z0-9_]+', '_', 'g')), ''),
    'explorer_' || left(replace(id::text, '-', ''), 8)
  ),
  full_name = coalesce(nullif(full_name, ''), username, 'Explorer')
where username is null or username = '' or full_name is null or full_name = '';

alter table public.profiles alter column username set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_username_format_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_username_format_check
      check (username ~ '^[a-z0-9_]{3,24}$');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_user_type_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_user_type_check
      check (user_type in ('student', 'tourist'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_language_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_language_check
      check (language in ('en', 'hi'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_total_xp_nonnegative_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_total_xp_nonnegative_check
      check (total_xp >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_chat_history_array_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_chat_history_array_check
      check (jsonb_typeof(chat_history) = 'array');
  end if;
end $$;

create unique index if not exists profiles_username_key
  on public.profiles (username);

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.compute_profile_badges(
  p_total_xp integer,
  p_monuments text[],
  p_quiz_scores integer[]
)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array_remove(array[
    case when coalesce(cardinality(p_monuments), 0) >= 1 then 'first_scan' end,
    case when coalesce((select sum(score) from unnest(p_quiz_scores) as score), 0) >= 100 then 'quiz_master' end,
    case when coalesce(cardinality(p_monuments), 0) >= 3 then 'explorer' end,
    case when p_total_xp >= 500 then 'hunter' end,
    case when p_total_xp >= 2000 then 'legend' end
  ]::text[], null);
$$;

create or replace function private.set_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function private.set_profile_updated_at();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text;
begin
  v_username := lower(trim(coalesce(new.raw_user_meta_data ->> 'username', '')));

  if v_username !~ '^[a-z0-9_]{3,24}$' then
    v_username := 'explorer_' || left(replace(new.id::text, '-', ''), 8);
  end if;

  insert into public.profiles (id, username, full_name, email)
  values (
    new.id,
    v_username,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), v_username),
    new.email
  )
  on conflict (id) do update set
    username = excluded.username,
    full_name = excluded.full_name,
    email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

drop function if exists public.handle_new_user();

-- Replace the old client-controlled user-id RPC. Every mutation below derives
-- ownership from auth.uid() and is only executable by authenticated sessions.
drop function if exists public.log_activity_and_award_xp(uuid, text, integer, jsonb);

create or replace function public.log_activity_and_award_xp(
  p_action_type text,
  p_xp integer,
  p_metadata jsonb default '{}'::jsonb
)
returns table(new_total_xp integer, new_level integer, newly_earned_badges text[])
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_total_xp integer;
  v_level integer;
  v_badge record;
  v_new_badges text[] := '{}';
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_xp < 0 or p_xp > 1000 then
    raise exception 'XP must be between 0 and 1000';
  end if;

  if p_action_type is null or length(trim(p_action_type)) not between 1 and 64 then
    raise exception 'Invalid action type';
  end if;

  insert into public.user_activity(user_id, action_type, xp_earned, metadata)
  values (v_user_id, trim(p_action_type), p_xp, coalesce(p_metadata, '{}'::jsonb));

  update public.profiles
  set
    total_xp = total_xp + p_xp,
    level = floor((total_xp + p_xp) / 100) + 1,
    profile_badges = private.compute_profile_badges(
      total_xp + p_xp,
      monuments_visited,
      quiz_scores
    )
  where id = v_user_id
  returning total_xp, level into v_total_xp, v_level;

  if v_total_xp is null then
    raise exception 'Profile not found';
  end if;

  for v_badge in
    select b.id, b.code
    from public.badges as b
    where b.xp_threshold <= v_total_xp
      and not exists (
        select 1 from public.user_badges as ub
        where ub.user_id = v_user_id and ub.badge_id = b.id
      )
  loop
    insert into public.user_badges(user_id, badge_id)
    values (v_user_id, v_badge.id)
    on conflict do nothing;
    v_new_badges := array_append(v_new_badges, v_badge.code);
  end loop;

  return query select v_total_xp, v_level, v_new_badges;
end;
$$;

create or replace function public.record_monument(p_monument text)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_monument text := trim(p_monument);
  v_monuments text[];
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if length(v_monument) not between 1 and 120 then raise exception 'Invalid monument'; end if;

  select monuments_visited into v_monuments
  from public.profiles where id = v_user_id for update;

  if not (v_monument = any(v_monuments)) then
    v_monuments := array_append(v_monuments, v_monument);
    update public.profiles
    set
      monuments_visited = v_monuments,
      profile_badges = private.compute_profile_badges(total_xp, v_monuments, quiz_scores)
    where id = v_user_id;

    insert into public.user_activity(user_id, action_type, xp_earned, metadata)
    values (
      v_user_id,
      'MONUMENT_RECOGNIZED',
      0,
      jsonb_build_object('title', 'Identified ' || v_monument, 'monument', v_monument)
    );
  end if;

  return v_monuments;
end;
$$;

create or replace function public.record_quiz_score(
  p_score integer,
  p_monument text default 'a heritage monument'
)
returns integer[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_scores integer[];
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_score < 0 or p_score > 100 then raise exception 'Invalid quiz score'; end if;

  update public.profiles
  set
    quiz_scores = array_append(quiz_scores, p_score),
    profile_badges = private.compute_profile_badges(
      total_xp,
      monuments_visited,
      array_append(quiz_scores, p_score)
    )
  where id = v_user_id
  returning quiz_scores into v_scores;

  return v_scores;
end;
$$;

create or replace function public.append_chat_message(
  p_role text,
  p_content text,
  p_monument text default ''
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_message jsonb;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_role not in ('user', 'assistant') then raise exception 'Invalid chat role'; end if;
  if length(trim(p_content)) not between 1 and 8000 then raise exception 'Invalid message'; end if;

  v_message := jsonb_build_object(
    'role', p_role,
    'content', p_content,
    'monument', coalesce(p_monument, ''),
    'timestamp', now()
  );

  update public.profiles
  set chat_history = (
    select coalesce(jsonb_agg(item order by ordinal), '[]'::jsonb)
    from (
      select item, ordinal
      from jsonb_array_elements(chat_history || jsonb_build_array(v_message))
        with ordinality as history(item, ordinal)
      order by ordinal desc
      limit 100
    ) as recent
  )
  where id = v_user_id;

  if p_role = 'user' then
    insert into public.user_activity(user_id, action_type, xp_earned, metadata)
    values (
      v_user_id,
      'CHAT_MESSAGE',
      0,
      jsonb_build_object(
        'title', 'Asked about ' || coalesce(nullif(trim(p_monument), ''), 'Indian heritage'),
        'detail', left(trim(p_content), 90)
      )
    );
  end if;
end;
$$;

alter table public.profiles enable row level security;
alter table public.user_activity enable row level security;
alter table public.user_badges enable row level security;
alter table public.badges enable row level security;

drop policy if exists "profiles are viewable by owner" on public.profiles;
create policy "profiles are viewable by owner"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "profiles are updatable by owner" on public.profiles;
create policy "profiles are updatable by owner"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "activity viewable by owner" on public.user_activity;
create policy "activity viewable by owner"
  on public.user_activity for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "activity insertable by owner" on public.user_activity;

drop policy if exists "user_badges viewable by owner" on public.user_badges;
create policy "user_badges viewable by owner"
  on public.user_badges for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "badges are public read" on public.badges;
create policy "badges are public read"
  on public.badges for select to authenticated
  using (true);

revoke all on public.profiles, public.user_activity, public.user_badges, public.badges from anon;
revoke update on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, phone, user_type, language) on public.profiles to authenticated;
grant select on public.user_activity, public.user_badges, public.badges to authenticated;

revoke all on function public.log_activity_and_award_xp(text, integer, jsonb) from public, anon;
revoke all on function public.record_monument(text) from public, anon;
revoke all on function public.record_quiz_score(integer, text) from public, anon;
revoke all on function public.append_chat_message(text, text, text) from public, anon;
grant execute on function public.log_activity_and_award_xp(text, integer, jsonb) to authenticated;
grant execute on function public.record_monument(text) to authenticated;
grant execute on function public.record_quiz_score(integer, text) to authenticated;
grant execute on function public.append_chat_message(text, text, text) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;
end $$;
