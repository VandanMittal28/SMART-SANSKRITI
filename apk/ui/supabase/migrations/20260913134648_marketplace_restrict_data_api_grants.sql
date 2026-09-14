revoke all on table
  public.heritage_sites,
  public.artisan_applications,
  public.artisan_documents,
  public.artisan_accounts,
  public.artisan_profiles,
  public.artisan_sites,
  public.marketplace_listings,
  public.listing_fulfillment_details,
  public.listing_media,
  public.workshop_slots,
  public.marketplace_reservations,
  public.marketplace_payments,
  public.fulfillment_events
from anon, authenticated;

-- Public catalogue surfaces are read-only. RLS further limits rows to active,
-- approved artisans and listings.
grant select on table
  public.heritage_sites,
  public.artisan_accounts,
  public.artisan_profiles,
  public.artisan_sites,
  public.marketplace_listings,
  public.listing_media,
  public.workshop_slots
to anon, authenticated;

-- Signed-in applicants can only write application-owned fields.
grant select on table public.artisan_applications, public.artisan_documents to authenticated;
grant insert (
  user_id, legal_name, display_name, phone, city, state, approximate_pickup_area,
  story, craft_traditions, languages, requested_site_ids, status, submitted_at
) on public.artisan_applications to authenticated;
grant update (
  legal_name, display_name, phone, city, state, approximate_pickup_area,
  story, craft_traditions, languages, requested_site_ids, status, submitted_at
) on public.artisan_applications to authenticated;
grant insert (application_id, storage_path, document_type)
  on public.artisan_documents to authenticated;

-- Approved artisans manage only their own public profile, site links and
-- listing content. Approval, deposits, stock allocation and moderation remain
-- server controlled.
grant insert (
  user_id, display_name, story_source, story_translations, craft_traditions,
  languages, city, state, approximate_pickup_area, profile_image_path
) on public.artisan_profiles to authenticated;
grant update (
  display_name, story_source, story_translations, craft_traditions, languages,
  city, state, approximate_pickup_area, profile_image_path, updated_at
) on public.artisan_profiles to authenticated;
grant insert (artisan_id, site_id, distance_km) on public.artisan_sites to authenticated;
grant update (site_id, distance_km) on public.artisan_sites to authenticated;
grant delete on public.artisan_sites to authenticated;

grant insert (
  artisan_id, site_id, kind, craft_type, source_language, title_source,
  description_source, title_translations, description_translations,
  price_paise, stock_quantity, approximate_pickup_area
) on public.marketplace_listings to authenticated;
grant update (
  site_id, kind, craft_type, source_language, title_source, description_source,
  title_translations, description_translations, price_paise, stock_quantity,
  approximate_pickup_area, active, updated_at
) on public.marketplace_listings to authenticated;

grant select on public.listing_fulfillment_details to authenticated;
grant insert (listing_id, exact_pickup_address, contact_phone, pickup_instructions)
  on public.listing_fulfillment_details to authenticated;
grant update (exact_pickup_address, contact_phone, pickup_instructions)
  on public.listing_fulfillment_details to authenticated;

grant insert (listing_id, storage_path, alt_text_source, alt_text_translations, sort_order)
  on public.listing_media to authenticated;
grant update (storage_path, alt_text_source, alt_text_translations, sort_order)
  on public.listing_media to authenticated;
grant delete on public.listing_media to authenticated;

grant insert (listing_id, starts_at, ends_at, capacity, active)
  on public.workshop_slots to authenticated;
grant update (starts_at, ends_at, capacity, active, updated_at)
  on public.workshop_slots to authenticated;

-- Reservations, payment records and fulfilment events are written only by
-- server functions. Participants receive read-only access filtered by RLS.
grant select on table
  public.marketplace_reservations,
  public.marketplace_payments,
  public.fulfillment_events
to authenticated;

grant usage, select on all sequences in schema public to authenticated;
