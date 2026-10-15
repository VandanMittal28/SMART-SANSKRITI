-- Keep privileged atomic operations in the non-exposed schema. Public RPCs are
-- invoker wrappers with explicit authenticated grants.
create or replace function mms_private.bootstrap_admin()
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

create or replace function mms_private.create_incident(
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
  values (p_site_id, p_zone_id, auth.uid(), p_title, p_description, p_category, p_priority)
  returning id into new_id;
  insert into public.mms_incident_events (incident_id, site_id, actor_id, status, note)
  values (new_id, p_site_id, auth.uid(), 'reported', 'Incident reported.');
  return new_id;
end;
$$;

create or replace function mms_private.transition_incident(
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
      select 1 from public.mms_memberships m where m.user_id = p_assignee_id and m.site_id = item.site_id
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

revoke all on function mms_private.bootstrap_admin() from public, anon;
revoke all on function mms_private.create_incident(text, uuid, text, text, text, text) from public, anon;
revoke all on function mms_private.transition_incident(uuid, integer, text, text, uuid) from public, anon;
grant execute on function mms_private.bootstrap_admin() to authenticated;
grant execute on function mms_private.create_incident(text, uuid, text, text, text, text) to authenticated;
grant execute on function mms_private.transition_incident(uuid, integer, text, text, uuid) to authenticated;

create or replace function public.mms_bootstrap_admin()
returns integer language sql security invoker set search_path = ''
as $$ select mms_private.bootstrap_admin() $$;
create or replace function public.mms_create_incident(
  p_site_id text, p_zone_id uuid, p_title text, p_description text, p_category text, p_priority text
)
returns uuid language sql security invoker set search_path = ''
as $$ select mms_private.create_incident(p_site_id,p_zone_id,p_title,p_description,p_category,p_priority) $$;
create or replace function public.mms_transition_incident(
  p_incident_id uuid, p_expected_version integer, p_status text, p_note text, p_assignee_id uuid default null
)
returns public.mms_incidents language sql security invoker set search_path = ''
as $$ select mms_private.transition_incident(p_incident_id,p_expected_version,p_status,p_note,p_assignee_id) $$;

revoke all on function public.mms_bootstrap_admin() from public, anon;
revoke all on function public.mms_create_incident(text, uuid, text, text, text, text) from public, anon;
revoke all on function public.mms_transition_incident(uuid, integer, text, text, uuid) from public, anon;
grant execute on function public.mms_bootstrap_admin() to authenticated;
grant execute on function public.mms_create_incident(text, uuid, text, text, text, text) to authenticated;
grant execute on function public.mms_transition_incident(uuid, integer, text, text, uuid) to authenticated;
