-- Sanskriti MMS: isolated operational schema for four heritage sites.
-- Existing public.heritage_sites data belongs to the visitor/marketplace apps.
create schema if not exists mms_private;
revoke all on schema mms_private from public, anon, authenticated;
grant usage on schema mms_private to authenticated;

create table if not exists public.mms_zones (
  id uuid primary key default gen_random_uuid(),
  site_id text not null references public.heritage_sites(id) on delete restrict,
  zone_key text not null,
  name text not null,
  capacity integer,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (site_id, zone_key),
  check (capacity is null or capacity > 0)
);

create table if not exists public.mms_memberships (
  user_id uuid not null references auth.users(id) on delete cascade,
  site_id text not null references public.heritage_sites(id) on delete restrict,
  role text not null check (role in ('admin', 'manager', 'staff')),
  username text not null check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, site_id),
  unique (site_id, username)
);

create table if not exists public.mms_staff_status (
  site_id text not null references public.heritage_sites(id) on delete cascade,
  user_id uuid not null,
  zone_id uuid references public.mms_zones(id) on delete set null,
  on_duty boolean not null default false,
  latitude numeric(9,6),
  longitude numeric(9,6),
  location_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (site_id, user_id),
  foreign key (user_id, site_id) references public.mms_memberships(user_id, site_id) on delete cascade,
  check ((latitude is null) = (longitude is null)),
  check (latitude is null or latitude between -90 and 90),
  check (longitude is null or longitude between -180 and 180)
);

create table if not exists public.mms_incidents (
  id uuid primary key default gen_random_uuid(),
  site_id text not null references public.heritage_sites(id) on delete restrict,
  zone_id uuid not null references public.mms_zones(id) on delete restrict,
  created_by uuid not null references auth.users(id) on delete restrict,
  assignee_id uuid,
  title text not null check (char_length(title) between 5 and 120),
  description text not null check (char_length(description) between 10 and 2000),
  category text not null check (category in ('Crowding','Damage','Access','Maintenance','Visitor assistance')),
  priority text not null check (priority in ('high','medium','low')),
  source text not null default 'Staff report' check (source in ('Staff report','Visitor report','Camera alert')),
  status text not null default 'reported' check (status in ('reported','under_review','confirmed','assigned','acknowledged','in_progress','resolved','closed','dismissed')),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (assignee_id, site_id) references public.mms_memberships(user_id, site_id) on delete no action
);

create table if not exists public.mms_incident_events (
  id bigint generated always as identity primary key,
  incident_id uuid not null references public.mms_incidents(id) on delete cascade,
  site_id text not null references public.heritage_sites(id) on delete restrict,
  actor_id uuid not null references auth.users(id) on delete restrict,
  status text not null check (status in ('reported','under_review','confirmed','assigned','acknowledged','in_progress','resolved','closed','dismissed')),
  note text not null check (char_length(note) between 1 and 1200),
  created_at timestamptz not null default now()
);

create index if not exists mms_incidents_site_status_updated_idx on public.mms_incidents(site_id, status, updated_at desc);
create index if not exists mms_incidents_assignee_status_idx on public.mms_incidents(assignee_id, status);
create index if not exists mms_events_incident_created_idx on public.mms_incident_events(incident_id, created_at);
create index if not exists mms_memberships_user_role_idx on public.mms_memberships(user_id, role);

alter table public.mms_zones enable row level security;
alter table public.mms_memberships enable row level security;
alter table public.mms_staff_status enable row level security;
alter table public.mms_incidents enable row level security;
alter table public.mms_incident_events enable row level security;

create or replace function mms_private.has_site_access(target_site text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from public.mms_memberships m
    where m.user_id = auth.uid() and m.site_id = target_site
  );
$$;

create or replace function mms_private.has_site_role(target_site text, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from public.mms_memberships m
    where m.user_id = auth.uid() and m.site_id = target_site and m.role = any(allowed_roles)
  );
$$;

revoke all on function mms_private.has_site_access(text) from public, anon;
revoke all on function mms_private.has_site_role(text, text[]) from public, anon;
grant execute on function mms_private.has_site_access(text) to authenticated;
grant execute on function mms_private.has_site_role(text, text[]) to authenticated;

create or replace function public.mms_bootstrap_admin()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare added integer;
begin
  if auth.uid() is null or coalesce(auth.jwt() ->> 'email_verified', 'false') <> 'true'
    or lower(coalesce(auth.jwt() ->> 'email', '')) <> 'smartsanskritiai@gmail.com' then
    raise exception 'This account is not authorized for MMS administrator setup' using errcode = '42501';
  end if;

  insert into public.mms_memberships (user_id, site_id, role, username, display_name)
  select auth.uid(), s.id, 'admin', 'base', 'MMS Administrator'
  from public.heritage_sites s
  where s.id in ('taj-mahal','qutub-minar','red-fort','konark') and s.active
  on conflict (user_id, site_id) do nothing;
  get diagnostics added = row_count;
  return added;
end;
$$;

revoke all on function public.mms_bootstrap_admin() from public, anon;
grant execute on function public.mms_bootstrap_admin() to authenticated;

create or replace function public.mms_create_incident(
  p_site_id text, p_zone_id uuid, p_title text, p_description text,
  p_category text, p_priority text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare new_id uuid;
begin
  if auth.uid() is null or not mms_private.has_site_access(p_site_id) then
    raise exception 'Site access required' using errcode = '42501';
  end if;
  if not exists (select 1 from public.mms_zones z where z.id = p_zone_id and z.site_id = p_site_id and z.active) then
    raise exception 'Choose an active zone for this site';
  end if;
  insert into public.mms_incidents (site_id, zone_id, created_by, title, description, category, priority)
  values (p_site_id, p_zone_id, p_title, p_description, p_category, p_priority)
  returning id into new_id;
  insert into public.mms_incident_events (incident_id, site_id, actor_id, status, note)
  values (new_id, p_site_id, auth.uid(), 'reported', 'Incident reported.');
  return new_id;
end;
$$;

create or replace function public.mms_transition_incident(
  p_incident_id uuid, p_expected_version integer, p_status text, p_note text,
  p_assignee_id uuid default null
)
returns public.mms_incidents
language plpgsql
security definer
set search_path = ''
as $$
declare item public.mms_incidents%rowtype; allowed boolean := false;
begin
  select * into item from public.mms_incidents where id = p_incident_id for update;
  if not found or not mms_private.has_site_access(item.site_id) then
    raise exception 'Incident not found' using errcode = '42501';
  end if;
  if item.version <> p_expected_version then
    raise exception 'Incident changed; refresh and review the latest record' using errcode = '40001';
  end if;
  if char_length(trim(p_note)) < 5 or char_length(p_note) > 1200 then
    raise exception 'Add an action note between 5 and 1200 characters';
  end if;
  if p_status = 'under_review' and item.status = 'reported' then allowed := true; end if;
  if p_status in ('confirmed','dismissed') and item.status = 'under_review' then allowed := true; end if;
  if p_status = 'assigned' and item.status in ('confirmed','assigned') then allowed := true; end if;
  if p_status = 'acknowledged' and item.status = 'assigned' then allowed := true; end if;
  if p_status = 'in_progress' and item.status = 'acknowledged' then allowed := true; end if;
  if p_status = 'resolved' and item.status = 'in_progress' then allowed := true; end if;
  if p_status = 'closed' and item.status = 'resolved' then allowed := true; end if;
  if not allowed then raise exception 'This status change is not allowed'; end if;
  if not mms_private.has_site_role(item.site_id, array['admin','manager']) then
    if item.assignee_id is distinct from auth.uid() or p_status not in ('acknowledged','in_progress','resolved') then
      raise exception 'Manager access or assigned staff required' using errcode = '42501';
    end if;
  end if;
  if p_status = 'assigned' then
    if p_assignee_id is null or not exists (
      select 1 from public.mms_memberships m where m.user_id = p_assignee_id
        and m.site_id = item.site_id and m.role = 'staff'
    ) then raise exception 'Choose a staff member assigned to this site'; end if;
  elsif p_assignee_id is not null then
    raise exception 'Assignee can only change while assigning';
  end if;
  update public.mms_incidents set status = p_status,
    assignee_id = case when p_status = 'assigned' then p_assignee_id else assignee_id end,
    version = version + 1, updated_at = now()
  where id = p_incident_id returning * into item;
  insert into public.mms_incident_events (incident_id, site_id, actor_id, status, note)
  values (item.id, item.site_id, auth.uid(), item.status, trim(p_note));
  return item;
end;
$$;

revoke all on function public.mms_create_incident(text, uuid, text, text, text, text) from public, anon;
revoke all on function public.mms_transition_incident(uuid, integer, text, text, uuid) from public, anon;
grant execute on function public.mms_create_incident(text, uuid, text, text, text, text) to authenticated;
grant execute on function public.mms_transition_incident(uuid, integer, text, text, uuid) to authenticated;

create policy mms_zones_read on public.mms_zones for select to authenticated
  using ((select mms_private.has_site_access(site_id)));
create policy mms_zones_admin_write on public.mms_zones for all to authenticated
  using ((select mms_private.has_site_role(site_id, array['admin','manager'])))
  with check ((select mms_private.has_site_role(site_id, array['admin','manager'])));

create policy mms_memberships_read on public.mms_memberships for select to authenticated
  using (user_id = (select auth.uid()) or (select mms_private.has_site_role(site_id, array['admin','manager'])));
create policy mms_memberships_admin_write on public.mms_memberships for all to authenticated
  using ((select mms_private.has_site_role(site_id, array['admin'])))
  with check ((select mms_private.has_site_role(site_id, array['admin'])));

create policy mms_staff_status_read on public.mms_staff_status for select to authenticated
  using ((select mms_private.has_site_access(site_id)));
create policy mms_staff_status_write on public.mms_staff_status for all to authenticated
  using (user_id = (select auth.uid()) or (select mms_private.has_site_role(site_id, array['admin','manager'])))
  with check ((user_id = (select auth.uid()) and (select mms_private.has_site_access(site_id))) or (select mms_private.has_site_role(site_id, array['admin','manager'])));

create policy mms_incidents_read on public.mms_incidents for select to authenticated
  using ((select mms_private.has_site_access(site_id)));

create policy mms_events_read on public.mms_incident_events for select to authenticated
  using ((select mms_private.has_site_access(site_id)));

revoke all on public.mms_zones, public.mms_memberships, public.mms_staff_status, public.mms_incidents, public.mms_incident_events from anon, authenticated;
grant select on public.mms_zones, public.mms_memberships, public.mms_staff_status, public.mms_incidents, public.mms_incident_events to authenticated;
grant insert, update on public.mms_staff_status to authenticated;

insert into public.mms_zones (site_id, zone_key, name) values
  ('taj-mahal','east-gate','East Gate'),('taj-mahal','west-gate','West Gate'),('taj-mahal','south-gate','South Gate'),('taj-mahal','main-mausoleum','Main Mausoleum'),('taj-mahal','charbagh','Charbagh Gardens'),('taj-mahal','mosque','Mosque and Guest House'),
  ('qutub-minar','entrance','Entrance Plaza'),('qutub-minar','qutub-minar','Qutub Minar'),('qutub-minar','iron-pillar','Iron Pillar'),('qutub-minar','alai-darwaza','Alai Darwaza'),('qutub-minar','quwwat-ul-islam','Quwwat-ul-Islam Mosque'),
  ('red-fort','lahore-gate','Lahore Gate'),('red-fort','chatta-chowk','Chatta Chowk'),('red-fort','diwan-i-aam','Diwan-i-Aam'),('red-fort','diwan-i-khas','Diwan-i-Khas'),('red-fort','rang-mahal','Rang Mahal'),
  ('konark','entrance','Visitor Entrance'),('konark','main-temple','Main Temple'),('konark','natya-mandapa','Natya Mandapa'),('konark','bhoga-mandapa','Bhoga Mandapa'),('konark','museum','ASI Museum')
on conflict (site_id, zone_key) do update set name = excluded.name;
