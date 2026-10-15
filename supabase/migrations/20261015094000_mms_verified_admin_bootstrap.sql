-- The email confirmation timestamp is authoritative in auth.users; it is not
-- assumed to be present in every access token version.
create or replace function mms_private.bootstrap_admin()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare added integer;
begin
  if auth.uid() is null or not exists (
    select 1 from auth.users u where u.id = auth.uid()
      and u.email_confirmed_at is not null
      and lower(coalesce(u.email,'')) = 'smartsanskritiai@gmail.com'
  ) then
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
revoke all on function mms_private.bootstrap_admin() from public, anon;
grant execute on function mms_private.bootstrap_admin() to authenticated;
