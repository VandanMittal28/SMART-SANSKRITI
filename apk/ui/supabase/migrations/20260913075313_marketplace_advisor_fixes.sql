-- Index foreign keys used by moderation, fulfilment and cancellation queries.
create index if not exists artisan_accounts_verified_by_idx
  on public.artisan_accounts (verified_by);
create index if not exists artisan_applications_reviewed_by_idx
  on public.artisan_applications (reviewed_by);
create index if not exists fulfillment_events_actor_id_idx
  on public.fulfillment_events (actor_id);
create index if not exists marketplace_listings_reviewed_by_idx
  on public.marketplace_listings (reviewed_by);
create index if not exists marketplace_reservations_cancelled_by_idx
  on public.marketplace_reservations (cancelled_by);

-- Admin mutations are routed through audited Edge Functions using the service role.
-- Keeping only the read policy here avoids redundant permissive policies.
drop policy if exists "admins manage artisan accounts" on public.artisan_accounts;

-- Split owner mutation policies by command so public SELECT policies do not overlap.
drop policy if exists "artisans manage own site links" on public.artisan_sites;
create policy "artisans insert own site links"
  on public.artisan_sites for insert to authenticated
  with check (artisan_id = (select auth.uid()));
create policy "artisans update own site links"
  on public.artisan_sites for update to authenticated
  using (artisan_id = (select auth.uid()))
  with check (artisan_id = (select auth.uid()));
create policy "artisans delete own site links"
  on public.artisan_sites for delete to authenticated
  using (artisan_id = (select auth.uid()));

drop policy if exists "artisans manage fulfillment details" on public.listing_fulfillment_details;
create policy "artisans insert fulfilment details"
  on public.listing_fulfillment_details for insert to authenticated
  with check (exists (
    select 1 from public.marketplace_listings listing
    where listing.id = listing_id and listing.artisan_id = (select auth.uid())
  ));
create policy "artisans update fulfilment details"
  on public.listing_fulfillment_details for update to authenticated
  using (exists (
    select 1 from public.marketplace_listings listing
    where listing.id = listing_id and listing.artisan_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.marketplace_listings listing
    where listing.id = listing_id and listing.artisan_id = (select auth.uid())
  ));

drop policy if exists "artisans manage listing media" on public.listing_media;
create policy "artisans insert own listing media"
  on public.listing_media for insert to authenticated
  with check (exists (
    select 1 from public.marketplace_listings listing
    where listing.id = listing_id and listing.artisan_id = (select auth.uid())
  ));
create policy "artisans update own listing media"
  on public.listing_media for update to authenticated
  using (exists (
    select 1 from public.marketplace_listings listing
    where listing.id = listing_id and listing.artisan_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.marketplace_listings listing
    where listing.id = listing_id and listing.artisan_id = (select auth.uid())
  ));
create policy "artisans delete own listing media"
  on public.listing_media for delete to authenticated
  using (exists (
    select 1 from public.marketplace_listings listing
    where listing.id = listing_id and listing.artisan_id = (select auth.uid())
  ));

grant delete on public.artisan_sites, public.listing_media to authenticated;
