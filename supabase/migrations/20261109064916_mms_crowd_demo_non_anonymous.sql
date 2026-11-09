-- Anonymous Auth sessions are not staff sessions, even if an erroneous membership exists.
create policy crowd_demo_non_anonymous on public.mms_crowd_demo_workspaces
as restrictive for all to authenticated
using (coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') = 'false')
with check (coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') = 'false');
