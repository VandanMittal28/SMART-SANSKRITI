-- Persist the one-time Yatrik introduction without storing device or sensor data.
alter table public.profiles
  add column if not exists mascot_intro_seen_at timestamptz;

comment on column public.profiles.mascot_intro_seen_at is
  'Timestamp when the profile owner completed the one-time Yatrik introduction.';

-- The existing owner-scoped SELECT and UPDATE RLS policies continue to apply.
-- Profiles use column-level UPDATE grants, so expose only this new field.
grant update (mascot_intro_seen_at) on public.profiles to authenticated;
