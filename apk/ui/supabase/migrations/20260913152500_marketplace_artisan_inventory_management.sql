-- Approved artisans must be able to pause a live listing and adjust only the
-- columns explicitly granted to them (for example stock and availability).
-- Approval fields remain server-controlled because authenticated users have no
-- UPDATE grant on approval_status, reviewed_by, reviewed_at or admin_note.
drop policy if exists "artisans revise own listings" on public.marketplace_listings;
create policy "artisans revise own listings"
on public.marketplace_listings
for update
to authenticated
using (
  artisan_id = (select auth.uid())
  or (select private.marketplace_is_admin())
)
with check (
  (
    artisan_id = (select auth.uid())
    and approval_status in ('pending', 'approved', 'paused')
  )
  or (select private.marketplace_is_admin())
);
