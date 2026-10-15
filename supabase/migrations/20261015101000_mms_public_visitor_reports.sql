-- Public visitors can report an issue at one of the four MMS sites. Reports
-- become ordinary MMS incidents; receipt tokens and precise locations stay
-- in this staff-only table.

create table if not exists public.mms_visitor_report_details (
  incident_id uuid primary key references public.mms_incidents(id) on delete cascade,
  receipt_token_hash bytea not null,
  visitor_category text not null check (visitor_category in (
    'Property damage','Littering','Restricted access','Harassment','Safety hazard','Other site-rule concern'
  )),
  latitude double precision,
  longitude double precision,
  accuracy_m integer,
  photo_path text,
  created_at timestamptz not null default now(),
  check ((latitude is null) = (longitude is null)),
  check (latitude is null or latitude between -90 and 90),
  check (longitude is null or longitude between -180 and 180),
  check (accuracy_m is null or accuracy_m between 0 and 100000)
);

alter table public.mms_visitor_report_details enable row level security;
revoke all on public.mms_visitor_report_details from public, anon, authenticated;
grant select on public.mms_visitor_report_details to authenticated;

create policy mms_visitor_report_details_site_read
  on public.mms_visitor_report_details for select to authenticated
  using (exists (
    select 1 from public.mms_incidents i
    where i.id = incident_id and (select mms_private.has_site_access(i.site_id))
  ));

-- Only active zones at the four staffed MMS sites are public catalog data.
grant select (id, site_id, zone_key, name, active) on public.mms_zones to anon;
create policy mms_public_report_zones_read
  on public.mms_zones for select to anon
  using (active and site_id in ('taj-mahal','qutub-minar','red-fort','konark'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('visitor-reports', 'visitor-reports', false, 2000000, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = 2000000, allowed_mime_types = array['image/jpeg'];

create policy visitor_report_photo_upload
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'visitor-reports'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and (storage.foldername(name))[2] in ('taj-mahal','qutub-minar','red-fort','konark')
    and storage.extension(name) = 'jpg'
  );

create policy mms_site_visitor_photo_read
  on storage.objects for select to authenticated
  using (
    bucket_id = 'visitor-reports'
    and (storage.foldername(name))[2] in ('taj-mahal','qutub-minar','red-fort','konark')
    and (select mms_private.has_site_access((storage.foldername(name))[2]))
  );

create or replace function mms_private.submit_visitor_report(
  p_id uuid,
  p_token text,
  p_site_id text,
  p_zone_key text,
  p_category text,
  p_note text,
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy_m integer,
  p_photo_path text
)
returns table (id uuid, status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  zone_id uuid;
  saved_hash bytea;
  incident_status text;
  stored_category text;
  mapped_category text;
  description_text text;
begin
  if auth.uid() is null then
    raise exception 'Visitor session required' using errcode = '42501';
  end if;
  if p_site_id not in ('taj-mahal','qutub-minar','red-fort','konark') then
    raise exception 'Choose a supported heritage site';
  end if;
  if p_token is null or p_token !~ '^[0-9a-fA-F]{64}$' then
    raise exception 'Invalid receipt token';
  end if;
  if p_category not in ('Property damage','Littering','Restricted access','Harassment','Safety hazard','Other site-rule concern') then
    raise exception 'Choose a valid report category';
  end if;
  if char_length(trim(coalesce(p_note,''))) > 1200 then
    raise exception 'Report details are too long';
  end if;
  if (p_latitude is null) <> (p_longitude is null)
    or (p_latitude is not null and (p_latitude < -90 or p_latitude > 90))
    or (p_longitude is not null and (p_longitude < -180 or p_longitude > 180))
    or (p_accuracy_m is not null and (p_accuracy_m < 0 or p_accuracy_m > 100000)) then
    raise exception 'Location was invalid';
  end if;
  if p_photo_path is not null and p_photo_path is distinct from (auth.uid()::text || '/' || p_site_id || '/' || p_id::text || '.jpg') then
    raise exception 'Photo path was invalid';
  end if;

  saved_hash := extensions.digest(convert_to(p_token, 'UTF8'), 'sha256');
  select d.receipt_token_hash, d.visitor_category, i.status
    into saved_hash, stored_category, incident_status
    from public.mms_visitor_report_details d
    join public.mms_incidents i on i.id = d.incident_id
    where d.incident_id = p_id;
  if found then
    if saved_hash <> extensions.digest(convert_to(p_token, 'UTF8'), 'sha256') then
      raise exception 'Report id is already in use' using errcode = '23505';
    end if;
    return query select p_id, incident_status;
    return;
  end if;

  select z.id into zone_id
    from public.mms_zones z join public.heritage_sites s on s.id = z.site_id
    where z.site_id = p_site_id and z.zone_key = p_zone_key and z.active and s.active;
  if zone_id is null then
    raise exception 'Choose an active area for this site';
  end if;

  mapped_category := case p_category
    when 'Property damage' then 'Damage'
    when 'Restricted access' then 'Access'
    when 'Littering' then 'Maintenance'
    when 'Safety hazard' then 'Visitor assistance'
    else 'Visitor assistance'
  end;
  description_text := 'Visitor reported: ' || p_category || E'\n' || coalesce(nullif(trim(coalesce(p_note,'')), ''), 'No additional details provided.');
  if char_length(description_text) > 2000 then description_text := left(description_text, 2000); end if;

  insert into public.mms_incidents (
    id, site_id, zone_id, created_by, title, description, category, priority, source, status
  ) values (
    p_id, p_site_id, zone_id, auth.uid(), left(p_category || ' reported by visitor', 120),
    description_text, mapped_category,
    case when p_category = 'Safety hazard' then 'high' else 'medium' end,
    'Visitor report', 'reported'
  );

  insert into public.mms_visitor_report_details (
    incident_id, receipt_token_hash, visitor_category, latitude, longitude, accuracy_m, photo_path
  ) values (
    p_id, extensions.digest(convert_to(p_token, 'UTF8'), 'sha256'), p_category,
    p_latitude, p_longitude, p_accuracy_m, p_photo_path
  );

  insert into public.mms_incident_events (incident_id, site_id, actor_id, status, note)
  values (p_id, p_site_id, auth.uid(), 'reported', 'Visitor report received.');

  return query select p_id, 'reported'::text;
end;
$$;

create or replace function mms_private.get_visitor_report_status(p_id uuid, p_token text)
returns table (id uuid, category text, status text, created_at timestamptz, updated_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select i.id, d.visitor_category, i.status, i.created_at, i.updated_at
  from public.mms_visitor_report_details d
  join public.mms_incidents i on i.id = d.incident_id
  where i.id = p_id
    and p_token ~ '^[0-9a-fA-F]{64}$'
    and d.receipt_token_hash = extensions.digest(convert_to(p_token, 'UTF8'), 'sha256')
$$;

revoke all on function mms_private.submit_visitor_report(uuid,text,text,text,text,text,double precision,double precision,integer,text) from public, anon, authenticated;
revoke all on function mms_private.get_visitor_report_status(uuid,text) from public, anon, authenticated;
grant usage on schema mms_private to anon;
grant execute on function mms_private.submit_visitor_report(uuid,text,text,text,text,text,double precision,double precision,integer,text) to anon, authenticated;
grant execute on function mms_private.get_visitor_report_status(uuid,text) to anon, authenticated;

create or replace function public.mms_submit_visitor_report(
  p_id uuid,
  p_token text,
  p_site_id text,
  p_zone_key text,
  p_category text,
  p_note text default '',
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_accuracy_m integer default null,
  p_photo_path text default null
)
returns table (id uuid, status text)
language sql
security invoker
set search_path = ''
as $$
  select * from mms_private.submit_visitor_report(
    p_id,p_token,p_site_id,p_zone_key,p_category,p_note,p_latitude,p_longitude,p_accuracy_m,p_photo_path
  )
$$;

create or replace function public.mms_visitor_report_status(p_id uuid, p_token text)
returns table (id uuid, category text, status text, created_at timestamptz, updated_at timestamptz)
language sql
security invoker
set search_path = ''
as $$ select * from mms_private.get_visitor_report_status(p_id,p_token) $$;

revoke all on function public.mms_submit_visitor_report(uuid,text,text,text,text,text,double precision,double precision,integer,text) from public, anon, authenticated;
revoke all on function public.mms_visitor_report_status(uuid,text) from public, anon, authenticated;
grant execute on function public.mms_submit_visitor_report(uuid,text,text,text,text,text,double precision,double precision,integer,text) to anon, authenticated;
grant execute on function public.mms_visitor_report_status(uuid,text) to anon, authenticated;

create index if not exists mms_visitor_report_details_created_idx on public.mms_visitor_report_details(created_at desc);
