create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  total_xp integer not null default 0,
  level integer not null default 1,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table if not exists public.user_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  action_type text not null,
  xp_earned integer not null default 0,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists user_activity_user_id_idx on public.user_activity(user_id, created_at desc);

create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  description text,
  icon text,
  xp_threshold integer not null
);

create table if not exists public.user_badges (
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

insert into public.badges (code, name, description, icon, xp_threshold) values
  ('explorer', 'Explorer', 'Earned your first 50 XP', '🧭', 50),
  ('scholar', 'Scholar', 'Reached 200 XP exploring heritage sites', '📜', 200),
  ('guardian', 'Guardian of Sanskriti', 'Reached 500 XP — a true heritage guardian', '🏛️', 500)
on conflict (code) do nothing;

create or replace function public.log_activity_and_award_xp(
  p_user_id uuid, p_action_type text, p_xp integer, p_metadata jsonb default '{}'::jsonb
) returns table(new_total_xp integer, new_level integer, newly_earned_badges text[]) as $$
declare
  v_total_xp integer; v_level integer; v_badge record; v_new_badges text[] := '{}';
begin
  insert into public.user_activity(user_id, action_type, xp_earned, metadata)
  values (p_user_id, p_action_type, p_xp, p_metadata);

  update public.profiles set total_xp = total_xp + p_xp
  where id = p_user_id returning total_xp into v_total_xp;

  v_level := floor(v_total_xp / 100) + 1;
  update public.profiles set level = v_level where id = p_user_id;

  for v_badge in
    select b.id, b.code from public.badges b
    where b.xp_threshold <= v_total_xp
    and not exists (select 1 from public.user_badges ub where ub.user_id = p_user_id and ub.badge_id = b.id)
  loop
    insert into public.user_badges(user_id, badge_id) values (p_user_id, v_badge.id);
    v_new_badges := array_append(v_new_badges, v_badge.code);
  end loop;

  return query select v_total_xp, v_level, v_new_badges;
end;
$$ language plpgsql security definer;

alter table public.profiles enable row level security;
alter table public.user_activity enable row level security;
alter table public.user_badges enable row level security;
alter table public.badges enable row level security;

drop policy if exists "profiles are viewable by owner" on public.profiles;
create policy "profiles are viewable by owner" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles are updatable by owner" on public.profiles;
create policy "profiles are updatable by owner" on public.profiles for update using (auth.uid() = id);
drop policy if exists "activity viewable by owner" on public.user_activity;
create policy "activity viewable by owner" on public.user_activity for select using (auth.uid() = user_id);
drop policy if exists "activity insertable by owner" on public.user_activity;
create policy "activity insertable by owner" on public.user_activity for insert with check (auth.uid() = user_id);
drop policy if exists "user_badges viewable by owner" on public.user_badges;
create policy "user_badges viewable by owner" on public.user_badges for select using (auth.uid() = user_id);
drop policy if exists "badges are public read" on public.badges;
create policy "badges are public read" on public.badges for select using (true);
