-- Client roles have neither schema usage nor table grants. This explicit
-- service-role policy documents that marketplace administrator membership is
-- server-managed and keeps the table covered by an allow-list RLS policy.
drop policy if exists "service role manages marketplace admins" on private.marketplace_admins;
create policy "service role manages marketplace admins"
on private.marketplace_admins
for all
to service_role
using (true)
with check (true);
