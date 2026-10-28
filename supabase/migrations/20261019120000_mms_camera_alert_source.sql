-- Let an automated Explore camera detection file itself as an MMS incident.
--
-- mms_incidents.source already allows 'Camera alert' (20261015090000), but the
-- visitor-report function hardcoded 'Visitor report', so Heritage Watch had no
-- way in and was posting to a localhost console that does not exist on a
-- phone. This adds p_source and nothing else: same validation, same receipt
-- and photo handling, same workflow.
--
-- A camera alert is a machine guess, not an eyewitness account. It enters at
-- 'reported' exactly like a visitor report, so a human still has to review and
-- confirm it before anyone is dispatched; it never skips a step. It is capped
-- at 'medium' priority so an unconfirmed model output can never outrank a
-- person who actually saw something.

drop function if exists public.mms_submit_visitor_report(uuid,text,text,text,text,text,double precision,double precision,integer,text);
drop function if exists mms_private.submit_visitor_report(uuid,text,text,text,text,text,double precision,double precision,integer,text);

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
  p_photo_path text,
  p_source text default 'Visitor report'
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
  title_text text;
  event_note text;
begin
  if auth.uid() is null then
    raise exception 'Visitor session required' using errcode = '42501';
  end if;
  if p_source not in ('Visitor report','Camera alert') then
    raise exception 'Unsupported report source';
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

  if p_source = 'Camera alert' then
    title_text := left('Possible ' || p_category || ' seen by Explore camera', 120);
    description_text := 'Automated camera detection - NOT CONFIRMED. A staff member must verify on site.' || E'\n'
      || coalesce(nullif(trim(coalesce(p_note,'')), ''), 'No additional details provided.');
    event_note := 'Automated camera detection received. Needs human confirmation.';
  else
    title_text := left(p_category || ' reported by visitor', 120);
    description_text := 'Visitor reported: ' || p_category || E'\n'
      || coalesce(nullif(trim(coalesce(p_note,'')), ''), 'No additional details provided.');
    event_note := 'Visitor report received.';
  end if;
  if char_length(description_text) > 2000 then description_text := left(description_text, 2000); end if;

  insert into public.mms_incidents (
    id, site_id, zone_id, created_by, title, description, category, priority, source, status
  ) values (
    p_id, p_site_id, zone_id, auth.uid(), title_text,
    description_text, mapped_category,
    -- An unconfirmed machine guess never outranks an eyewitness.
    case when p_source = 'Camera alert' then 'medium'
         when p_category = 'Safety hazard' then 'high'
         else 'medium' end,
    p_source, 'reported'
  );

  insert into public.mms_visitor_report_details (
    incident_id, receipt_token_hash, visitor_category, latitude, longitude, accuracy_m, photo_path
  ) values (
    p_id, extensions.digest(convert_to(p_token, 'UTF8'), 'sha256'), p_category,
    p_latitude, p_longitude, p_accuracy_m, p_photo_path
  );

  insert into public.mms_incident_events (incident_id, site_id, actor_id, status, note)
  values (p_id, p_site_id, auth.uid(), 'reported', event_note);

  return query select p_id, 'reported'::text;
end;
$$;

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
  p_photo_path text default null,
  p_source text default 'Visitor report'
)
returns table (id uuid, status text)
language sql
security invoker
set search_path = ''
as $$
  select * from mms_private.submit_visitor_report(
    p_id,p_token,p_site_id,p_zone_key,p_category,p_note,p_latitude,p_longitude,p_accuracy_m,p_photo_path,p_source
  )
$$;

revoke all on function mms_private.submit_visitor_report(uuid,text,text,text,text,text,double precision,double precision,integer,text,text) from public, anon, authenticated;
revoke all on function public.mms_submit_visitor_report(uuid,text,text,text,text,text,double precision,double precision,integer,text,text) from public, anon, authenticated;
grant execute on function mms_private.submit_visitor_report(uuid,text,text,text,text,text,double precision,double precision,integer,text,text) to anon, authenticated;
grant execute on function public.mms_submit_visitor_report(uuid,text,text,text,text,text,double precision,double precision,integer,text,text) to anon, authenticated;
