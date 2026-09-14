create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to anon, authenticated;

create table if not exists private.marketplace_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function private.marketplace_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from private.marketplace_admins
    where user_id = (select auth.uid())
  );
$$;

revoke all on function private.marketplace_is_admin() from public;
grant execute on function private.marketplace_is_admin() to authenticated;

create table if not exists public.heritage_sites (
  id text primary key,
  name text not null,
  name_hi text not null,
  city text not null,
  state text not null,
  latitude numeric(9,6),
  longitude numeric(9,6),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.artisan_applications (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  legal_name text not null,
  display_name text not null,
  phone text not null,
  city text not null,
  state text not null,
  approximate_pickup_area text not null,
  story text not null,
  craft_traditions text[] not null default '{}',
  languages text[] not null default '{hi,en}',
  requested_site_ids text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  unique (user_id)
);

create table if not exists public.artisan_documents (
  id bigint generated always as identity primary key,
  application_id bigint not null references public.artisan_applications(id) on delete cascade,
  storage_path text not null,
  document_type text not null check (document_type in ('identity', 'craft_proof', 'address_proof')),
  uploaded_at timestamptz not null default now(),
  unique (application_id, storage_path)
);

create table if not exists public.artisan_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  application_id bigint unique references public.artisan_applications(id) on delete restrict,
  approval_status text not null default 'approved' check (approval_status in ('approved', 'suspended')),
  verified_at timestamptz not null default now(),
  verified_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function private.marketplace_is_approved_artisan(p_user_id uuid default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.artisan_accounts
    where user_id = coalesce(p_user_id, (select auth.uid())) and approval_status = 'approved'
  );
$$;

revoke all on function private.marketplace_is_approved_artisan(uuid) from public;
grant execute on function private.marketplace_is_approved_artisan(uuid) to authenticated;
grant execute on function private.marketplace_is_approved_artisan(uuid) to anon;

create table if not exists public.artisan_profiles (
  user_id uuid primary key references public.artisan_accounts(user_id) on delete cascade,
  display_name text not null,
  story_source text not null,
  story_translations jsonb not null default '{}'::jsonb check (jsonb_typeof(story_translations) = 'object'),
  craft_traditions text[] not null default '{}',
  languages text[] not null default '{hi,en}',
  city text not null,
  state text not null,
  approximate_pickup_area text not null,
  profile_image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.artisan_sites (
  artisan_id uuid not null references public.artisan_accounts(user_id) on delete cascade,
  site_id text not null references public.heritage_sites(id) on delete restrict,
  distance_km numeric(5,2) not null check (distance_km >= 0 and distance_km <= 100),
  primary key (artisan_id, site_id)
);

create table if not exists public.marketplace_listings (
  id bigint generated always as identity primary key,
  artisan_id uuid not null references public.artisan_accounts(user_id) on delete cascade,
  site_id text not null references public.heritage_sites(id) on delete restrict,
  kind text not null check (kind in ('craft', 'workshop')),
  craft_type text not null,
  source_language text not null default 'hi',
  title_source text not null,
  description_source text not null,
  title_translations jsonb not null default '{}'::jsonb check (jsonb_typeof(title_translations) = 'object'),
  description_translations jsonb not null default '{}'::jsonb check (jsonb_typeof(description_translations) = 'object'),
  price_paise bigint not null check (price_paise >= 100),
  deposit_percent smallint not null default 20 check (deposit_percent between 1 and 100),
  stock_quantity integer check (
    (kind = 'craft' and stock_quantity is not null and stock_quantity >= 0)
    or (kind = 'workshop' and stock_quantity is null)
  ),
  approximate_pickup_area text not null,
  approval_status text not null default 'pending' check (approval_status in ('pending', 'approved', 'rejected', 'paused')),
  active boolean not null default true,
  admin_note text,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.listing_fulfillment_details (
  listing_id bigint primary key references public.marketplace_listings(id) on delete cascade,
  exact_pickup_address text not null,
  contact_phone text not null,
  pickup_instructions text
);

create table if not exists public.listing_media (
  id bigint generated always as identity primary key,
  listing_id bigint not null references public.marketplace_listings(id) on delete cascade,
  storage_path text not null,
  alt_text_source text not null,
  alt_text_translations jsonb not null default '{}'::jsonb check (jsonb_typeof(alt_text_translations) = 'object'),
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  unique (listing_id, storage_path)
);

create table if not exists public.workshop_slots (
  id bigint generated always as identity primary key,
  listing_id bigint not null references public.marketplace_listings(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer not null check (capacity > 0),
  reserved_quantity integer not null default 0 check (reserved_quantity >= 0 and reserved_quantity <= capacity),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.marketplace_reservations (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete restrict,
  listing_id bigint not null references public.marketplace_listings(id) on delete restrict,
  workshop_slot_id bigint references public.workshop_slots(id) on delete restrict,
  quantity integer not null check (quantity > 0 and quantity <= 20),
  unit_price_paise bigint not null check (unit_price_paise >= 100),
  total_price_paise bigint not null check (total_price_paise >= 100),
  deposit_percent smallint not null check (deposit_percent between 1 and 100),
  deposit_paise bigint not null check (deposit_paise >= 1 and deposit_paise <= total_price_paise),
  balance_paise bigint not null check (balance_paise >= 0),
  status text not null default 'payment_pending' check (
    status in ('payment_pending', 'confirmed', 'cancelled', 'refund_pending', 'refunded', 'completed', 'expired', 'no_show')
  ),
  confirmation_pin text not null check (confirmation_pin ~ '^[0-9]{6}$'),
  qr_token uuid not null default gen_random_uuid() unique,
  scheduled_for timestamptz not null,
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  cancellation_reason text,
  cancelled_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (balance_paise = total_price_paise - deposit_paise)
);

create table if not exists public.marketplace_payments (
  id bigint generated always as identity primary key,
  reservation_id uuid not null references public.marketplace_reservations(id) on delete restrict,
  provider text not null default 'razorpay' check (provider = 'razorpay'),
  provider_order_id text unique,
  provider_payment_id text unique,
  amount_paise bigint not null check (amount_paise >= 1),
  status text not null default 'created' check (status in ('created', 'authorized', 'captured', 'failed', 'refund_pending', 'refunded')),
  idempotency_key text not null unique,
  provider_event_id text unique,
  provider_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fulfillment_events (
  id bigint generated always as identity primary key,
  reservation_id uuid not null references public.marketplace_reservations(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete restrict,
  event_type text not null check (event_type in ('reserved', 'paid', 'cancelled', 'refund_requested', 'refunded', 'collected', 'attended', 'no_show')),
  note text,
  created_at timestamptz not null default now(),
  unique (reservation_id, event_type)
);

create index if not exists artisan_applications_user_id_idx on public.artisan_applications(user_id);
create index if not exists artisan_documents_application_id_idx on public.artisan_documents(application_id);
create index if not exists artisan_sites_site_distance_idx on public.artisan_sites(site_id, distance_km);
create index if not exists marketplace_listings_artisan_idx on public.marketplace_listings(artisan_id);
create index if not exists marketplace_listings_browse_idx on public.marketplace_listings(site_id, approval_status, active, kind);
create index if not exists listing_media_listing_idx on public.listing_media(listing_id, sort_order);
create index if not exists workshop_slots_listing_time_idx on public.workshop_slots(listing_id, active, starts_at);
create index if not exists marketplace_reservations_buyer_created_idx on public.marketplace_reservations(buyer_id, created_at desc);
create index if not exists marketplace_reservations_listing_status_idx on public.marketplace_reservations(listing_id, status);
create index if not exists marketplace_reservations_slot_idx on public.marketplace_reservations(workshop_slot_id) where workshop_slot_id is not null;
create index if not exists marketplace_payments_reservation_idx on public.marketplace_payments(reservation_id);
create index if not exists fulfillment_events_reservation_created_idx on public.fulfillment_events(reservation_id, created_at);

alter table public.heritage_sites enable row level security;
alter table public.artisan_applications enable row level security;
alter table public.artisan_documents enable row level security;
alter table public.artisan_accounts enable row level security;
alter table public.artisan_profiles enable row level security;
alter table public.artisan_sites enable row level security;
alter table public.marketplace_listings enable row level security;
alter table public.listing_fulfillment_details enable row level security;
alter table public.listing_media enable row level security;
alter table public.workshop_slots enable row level security;
alter table public.marketplace_reservations enable row level security;
alter table public.marketplace_payments enable row level security;
alter table public.fulfillment_events enable row level security;

drop policy if exists "heritage sites are public" on public.heritage_sites;
create policy "heritage sites are public" on public.heritage_sites for select to anon, authenticated using (active);

drop policy if exists "applications visible to owner or admin" on public.artisan_applications;
create policy "applications visible to owner or admin" on public.artisan_applications for select to authenticated
using ((select auth.uid()) = user_id or (select private.marketplace_is_admin()));
drop policy if exists "users submit pending applications" on public.artisan_applications;
create policy "users submit pending applications" on public.artisan_applications for insert to authenticated
with check ((select auth.uid()) = user_id and status = 'pending' and reviewed_at is null and reviewed_by is null);
drop policy if exists "owners edit pending applications" on public.artisan_applications;
create policy "owners edit pending applications" on public.artisan_applications for update to authenticated
using (((select auth.uid()) = user_id and status = 'pending') or (select private.marketplace_is_admin()))
with check (((select auth.uid()) = user_id and status = 'pending' and reviewed_at is null and reviewed_by is null) or (select private.marketplace_is_admin()));

drop policy if exists "documents visible to owner or admin" on public.artisan_documents;
create policy "documents visible to owner or admin" on public.artisan_documents for select to authenticated
using (
  exists (select 1 from public.artisan_applications a where a.id = application_id and a.user_id = (select auth.uid()))
  or (select private.marketplace_is_admin())
);
drop policy if exists "owners attach application documents" on public.artisan_documents;
create policy "owners attach application documents" on public.artisan_documents for insert to authenticated
with check (exists (
  select 1 from public.artisan_applications a
  where a.id = application_id and a.user_id = (select auth.uid()) and a.status = 'pending'
));

drop policy if exists "approved artisan accounts are visible" on public.artisan_accounts;
create policy "approved artisan accounts are visible" on public.artisan_accounts for select to anon, authenticated
using (approval_status = 'approved' or user_id = (select auth.uid()) or (select private.marketplace_is_admin()));
drop policy if exists "admins manage artisan accounts" on public.artisan_accounts;
create policy "admins manage artisan accounts" on public.artisan_accounts for all to authenticated
using ((select private.marketplace_is_admin())) with check ((select private.marketplace_is_admin()));

drop policy if exists "approved artisan profiles are public" on public.artisan_profiles;
create policy "approved artisan profiles are public" on public.artisan_profiles for select to anon, authenticated
using ((select private.marketplace_is_approved_artisan(user_id)) or user_id = (select auth.uid()) or (select private.marketplace_is_admin()));
drop policy if exists "approved artisans create profiles" on public.artisan_profiles;
create policy "approved artisans create profiles" on public.artisan_profiles for insert to authenticated
with check (user_id = (select auth.uid()) and (select private.marketplace_is_approved_artisan(user_id)));
drop policy if exists "artisans update own profiles" on public.artisan_profiles;
create policy "artisans update own profiles" on public.artisan_profiles for update to authenticated
using (user_id = (select auth.uid()) or (select private.marketplace_is_admin()))
with check (user_id = (select auth.uid()) or (select private.marketplace_is_admin()));

drop policy if exists "artisan site links are public" on public.artisan_sites;
create policy "artisan site links are public" on public.artisan_sites for select to anon, authenticated
using ((select private.marketplace_is_approved_artisan(artisan_id)));
drop policy if exists "artisans manage own site links" on public.artisan_sites;
create policy "artisans manage own site links" on public.artisan_sites for all to authenticated
using (artisan_id = (select auth.uid()) or (select private.marketplace_is_admin()))
with check (artisan_id = (select auth.uid()) or (select private.marketplace_is_admin()));

drop policy if exists "approved listings are public" on public.marketplace_listings;
create policy "approved listings are public" on public.marketplace_listings for select to anon, authenticated
using (
  (approval_status = 'approved' and active and (select private.marketplace_is_approved_artisan(artisan_id)))
  or artisan_id = (select auth.uid())
  or (select private.marketplace_is_admin())
);
drop policy if exists "approved artisans create pending listings" on public.marketplace_listings;
create policy "approved artisans create pending listings" on public.marketplace_listings for insert to authenticated
with check (
  artisan_id = (select auth.uid())
  and approval_status = 'pending'
  and (select private.marketplace_is_approved_artisan(artisan_id))
);
drop policy if exists "artisans revise own listings" on public.marketplace_listings;
create policy "artisans revise own listings" on public.marketplace_listings for update to authenticated
using (artisan_id = (select auth.uid()) or (select private.marketplace_is_admin()))
with check (
  (artisan_id = (select auth.uid()) and approval_status in ('pending', 'paused'))
  or (select private.marketplace_is_admin())
);

drop policy if exists "fulfillment details need a reservation" on public.listing_fulfillment_details;
create policy "fulfillment details need a reservation" on public.listing_fulfillment_details for select to authenticated
using (
  exists (select 1 from public.marketplace_listings l where l.id = listing_id and l.artisan_id = (select auth.uid()))
  or exists (
    select 1 from public.marketplace_reservations r
    where r.listing_id = listing_id and r.buyer_id = (select auth.uid()) and r.status in ('confirmed', 'completed')
  )
  or (select private.marketplace_is_admin())
);
drop policy if exists "artisans manage fulfillment details" on public.listing_fulfillment_details;
create policy "artisans manage fulfillment details" on public.listing_fulfillment_details for all to authenticated
using (
  exists (select 1 from public.marketplace_listings l where l.id = listing_id and l.artisan_id = (select auth.uid()))
  or (select private.marketplace_is_admin())
)
with check (
  exists (select 1 from public.marketplace_listings l where l.id = listing_id and l.artisan_id = (select auth.uid()))
  or (select private.marketplace_is_admin())
);

drop policy if exists "approved listing media is public" on public.listing_media;
create policy "approved listing media is public" on public.listing_media for select to anon, authenticated
using (exists (
  select 1 from public.marketplace_listings l
  where l.id = listing_id and (
    (l.approval_status = 'approved' and l.active)
    or l.artisan_id = (select auth.uid())
    or (select private.marketplace_is_admin())
  )
));
drop policy if exists "artisans manage listing media" on public.listing_media;
create policy "artisans manage listing media" on public.listing_media for all to authenticated
using (exists (select 1 from public.marketplace_listings l where l.id = listing_id and l.artisan_id = (select auth.uid())) or (select private.marketplace_is_admin()))
with check (exists (select 1 from public.marketplace_listings l where l.id = listing_id and l.artisan_id = (select auth.uid())) or (select private.marketplace_is_admin()));

drop policy if exists "approved workshop slots are public" on public.workshop_slots;
create policy "approved workshop slots are public" on public.workshop_slots for select to anon, authenticated
using (exists (
  select 1 from public.marketplace_listings l
  where l.id = listing_id and (
    (l.approval_status = 'approved' and l.active)
    or l.artisan_id = (select auth.uid())
    or (select private.marketplace_is_admin())
  )
));
drop policy if exists "artisans create workshop slots" on public.workshop_slots;
create policy "artisans create workshop slots" on public.workshop_slots for insert to authenticated
with check (exists (select 1 from public.marketplace_listings l where l.id = listing_id and l.artisan_id = (select auth.uid())) or (select private.marketplace_is_admin()));
drop policy if exists "artisans update workshop slots" on public.workshop_slots;
create policy "artisans update workshop slots" on public.workshop_slots for update to authenticated
using (exists (select 1 from public.marketplace_listings l where l.id = listing_id and l.artisan_id = (select auth.uid())) or (select private.marketplace_is_admin()))
with check (exists (select 1 from public.marketplace_listings l where l.id = listing_id and l.artisan_id = (select auth.uid())) or (select private.marketplace_is_admin()));

drop policy if exists "buyers and artisans see reservations" on public.marketplace_reservations;
create policy "buyers and artisans see reservations" on public.marketplace_reservations for select to authenticated
using (
  buyer_id = (select auth.uid())
  or exists (select 1 from public.marketplace_listings l where l.id = listing_id and l.artisan_id = (select auth.uid()))
  or (select private.marketplace_is_admin())
);

drop policy if exists "buyers see payment summaries" on public.marketplace_payments;
create policy "buyers see payment summaries" on public.marketplace_payments for select to authenticated
using (
  exists (select 1 from public.marketplace_reservations r where r.id = reservation_id and r.buyer_id = (select auth.uid()))
  or (select private.marketplace_is_admin())
);

drop policy if exists "participants see fulfillment events" on public.fulfillment_events;
create policy "participants see fulfillment events" on public.fulfillment_events for select to authenticated
using (
  exists (
    select 1 from public.marketplace_reservations r
    join public.marketplace_listings l on l.id = r.listing_id
    where r.id = reservation_id and (r.buyer_id = (select auth.uid()) or l.artisan_id = (select auth.uid()))
  )
  or (select private.marketplace_is_admin())
);

grant usage on schema public to anon, authenticated;
grant select on public.heritage_sites, public.artisan_accounts, public.artisan_profiles, public.artisan_sites,
  public.marketplace_listings, public.listing_media, public.workshop_slots to anon, authenticated;
grant select, insert, update on public.artisan_applications to authenticated;
grant select, insert on public.artisan_documents to authenticated;
grant insert, update on public.artisan_accounts, public.artisan_profiles, public.artisan_sites,
  public.listing_fulfillment_details, public.listing_media to authenticated;
grant insert (artisan_id, site_id, kind, craft_type, source_language, title_source, description_source,
  title_translations, description_translations, price_paise, stock_quantity, approximate_pickup_area)
  on public.marketplace_listings to authenticated;
grant update (site_id, kind, craft_type, source_language, title_source, description_source,
  title_translations, description_translations, price_paise, stock_quantity, approximate_pickup_area, active, updated_at)
  on public.marketplace_listings to authenticated;
grant insert (listing_id, starts_at, ends_at, capacity, active) on public.workshop_slots to authenticated;
grant update (starts_at, ends_at, capacity, active, updated_at) on public.workshop_slots to authenticated;
grant select on public.listing_fulfillment_details, public.marketplace_reservations, public.fulfillment_events to authenticated;
grant usage, select on all sequences in schema public to authenticated;

create or replace function public.reserve_marketplace_item(
  p_buyer_id uuid,
  p_listing_id bigint,
  p_quantity integer,
  p_workshop_slot_id bigint default null,
  p_scheduled_for timestamptz default null
)
returns public.marketplace_reservations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_listing public.marketplace_listings;
  v_slot public.workshop_slots;
  v_total bigint;
  v_deposit bigint;
  v_scheduled_for timestamptz;
  v_reservation public.marketplace_reservations;
begin
  if p_quantity < 1 or p_quantity > 20 then
    raise exception 'INVALID_QUANTITY';
  end if;

  select * into v_listing from public.marketplace_listings
  where id = p_listing_id and approval_status = 'approved' and active
  for update;
  if not found then raise exception 'LISTING_UNAVAILABLE'; end if;

  if v_listing.kind = 'craft' then
    if p_workshop_slot_id is not null then raise exception 'SLOT_NOT_ALLOWED'; end if;
    if v_listing.stock_quantity < p_quantity then raise exception 'INSUFFICIENT_STOCK'; end if;
    update public.marketplace_listings set stock_quantity = stock_quantity - p_quantity, updated_at = now()
    where id = p_listing_id;
    v_scheduled_for := coalesce(p_scheduled_for, date_trunc('day', now() + interval '1 day') + interval '12 hours');
    if v_scheduled_for < now() then raise exception 'INVALID_PICKUP_TIME'; end if;
  else
    if p_workshop_slot_id is null then raise exception 'SLOT_REQUIRED'; end if;
    select * into v_slot from public.workshop_slots
    where id = p_workshop_slot_id and listing_id = p_listing_id and active and starts_at > now()
    for update;
    if not found then raise exception 'SLOT_UNAVAILABLE'; end if;
    if v_slot.reserved_quantity + p_quantity > v_slot.capacity then raise exception 'INSUFFICIENT_CAPACITY'; end if;
    update public.workshop_slots set reserved_quantity = reserved_quantity + p_quantity, updated_at = now()
    where id = p_workshop_slot_id;
    v_scheduled_for := v_slot.starts_at;
  end if;

  v_total := v_listing.price_paise * p_quantity;
  v_deposit := ceil(v_total * v_listing.deposit_percent / 100.0)::bigint;

  insert into public.marketplace_reservations (
    buyer_id, listing_id, workshop_slot_id, quantity, unit_price_paise,
    total_price_paise, deposit_percent, deposit_paise, balance_paise,
    confirmation_pin, scheduled_for
  ) values (
    p_buyer_id, p_listing_id, p_workshop_slot_id, p_quantity, v_listing.price_paise,
    v_total, v_listing.deposit_percent, v_deposit, v_total - v_deposit,
    lpad((floor(random() * 1000000))::integer::text, 6, '0'), v_scheduled_for
  ) returning * into v_reservation;

  insert into public.fulfillment_events(reservation_id, actor_id, event_type)
  values (v_reservation.id, p_buyer_id, 'reserved');
  return v_reservation;
end;
$$;

revoke all on function public.reserve_marketplace_item(uuid, bigint, integer, bigint, timestamptz) from public, anon, authenticated;
grant execute on function public.reserve_marketplace_item(uuid, bigint, integer, bigint, timestamptz) to service_role;

create or replace function public.release_marketplace_reservation(
  p_reservation_id uuid,
  p_status text,
  p_actor_id uuid,
  p_reason text default null
)
returns public.marketplace_reservations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reservation public.marketplace_reservations;
  v_kind text;
  v_restore_inventory boolean;
begin
  if p_status not in ('cancelled', 'refund_pending', 'refunded', 'expired') then raise exception 'INVALID_RELEASE_STATUS'; end if;
  select * into v_reservation
  from public.marketplace_reservations
  where id = p_reservation_id for update;
  if not found then raise exception 'RESERVATION_NOT_FOUND'; end if;
  if v_reservation.status not in ('payment_pending', 'confirmed', 'refund_pending') then return v_reservation; end if;
  v_restore_inventory := v_reservation.status in ('payment_pending', 'confirmed');
  select kind into v_kind from public.marketplace_listings where id = v_reservation.listing_id;

  if v_restore_inventory and v_kind = 'craft' then
    update public.marketplace_listings set stock_quantity = stock_quantity + v_reservation.quantity, updated_at = now()
    where id = v_reservation.listing_id;
  elsif v_restore_inventory and v_reservation.workshop_slot_id is not null then
    update public.workshop_slots set reserved_quantity = greatest(0, reserved_quantity - v_reservation.quantity), updated_at = now()
    where id = v_reservation.workshop_slot_id;
  end if;

  update public.marketplace_reservations
  set status = p_status, cancellation_reason = p_reason, cancelled_by = p_actor_id, updated_at = now()
  where id = p_reservation_id returning * into v_reservation;
  return v_reservation;
end;
$$;

revoke all on function public.release_marketplace_reservation(uuid, text, uuid, text) from public, anon, authenticated;
grant execute on function public.release_marketplace_reservation(uuid, text, uuid, text) to service_role;

create or replace function public.marketplace_is_admin_for_service(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from private.marketplace_admins where user_id = p_user_id);
$$;

revoke all on function public.marketplace_is_admin_for_service(uuid) from public, anon, authenticated;
grant execute on function public.marketplace_is_admin_for_service(uuid) to service_role;

create or replace function public.review_marketplace_artisan(
  p_application_id bigint,
  p_status text,
  p_note text,
  p_reviewer_id uuid
)
returns public.artisan_applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_application public.artisan_applications;
begin
  if not exists (select 1 from private.marketplace_admins where user_id = p_reviewer_id) then raise exception 'ADMIN_REQUIRED'; end if;
  if p_status not in ('approved', 'rejected') then raise exception 'INVALID_REVIEW_STATUS'; end if;
  select * into v_application from public.artisan_applications where id = p_application_id for update;
  if not found then raise exception 'APPLICATION_NOT_FOUND'; end if;

  update public.artisan_applications set status = p_status, admin_note = p_note, reviewed_at = now(), reviewed_by = p_reviewer_id
  where id = p_application_id returning * into v_application;

  if p_status = 'approved' then
    insert into public.artisan_accounts(user_id, application_id, approval_status, verified_at, verified_by)
    values (v_application.user_id, v_application.id, 'approved', now(), p_reviewer_id)
    on conflict (user_id) do update set approval_status = 'approved', verified_at = now(), verified_by = p_reviewer_id, updated_at = now();

    insert into public.artisan_profiles(
      user_id, display_name, story_source, story_translations, craft_traditions,
      languages, city, state, approximate_pickup_area
    ) values (
      v_application.user_id, v_application.display_name, v_application.story,
      jsonb_build_object('hi', v_application.story, 'en', v_application.story),
      v_application.craft_traditions, v_application.languages, v_application.city,
      v_application.state, v_application.approximate_pickup_area
    ) on conflict (user_id) do update set
      display_name = excluded.display_name,
      story_source = excluded.story_source,
      craft_traditions = excluded.craft_traditions,
      languages = excluded.languages,
      city = excluded.city,
      state = excluded.state,
      approximate_pickup_area = excluded.approximate_pickup_area,
      updated_at = now();

    insert into public.artisan_sites(artisan_id, site_id, distance_km)
    select v_application.user_id, site_id, 0
    from unnest(v_application.requested_site_ids) as requested_site(site_id)
    where exists (select 1 from public.heritage_sites h where h.id = requested_site.site_id)
    on conflict (artisan_id, site_id) do nothing;
  end if;
  return v_application;
end;
$$;

revoke all on function public.review_marketplace_artisan(bigint, text, text, uuid) from public, anon, authenticated;
grant execute on function public.review_marketplace_artisan(bigint, text, text, uuid) to service_role;

create or replace function public.confirm_marketplace_payment(
  p_reservation_id uuid,
  p_provider_order_id text,
  p_provider_payment_id text,
  p_provider_event_id text default null,
  p_payload jsonb default '{}'::jsonb
)
returns public.marketplace_reservations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reservation public.marketplace_reservations;
begin
  select * into v_reservation from public.marketplace_reservations where id = p_reservation_id for update;
  if not found then raise exception 'RESERVATION_NOT_FOUND'; end if;
  if v_reservation.expires_at <= now() and v_reservation.status = 'payment_pending' then raise exception 'RESERVATION_EXPIRED'; end if;

  update public.marketplace_payments set
    provider_payment_id = coalesce(provider_payment_id, p_provider_payment_id),
    provider_event_id = coalesce(provider_event_id, p_provider_event_id),
    provider_payload = case when p_payload = '{}'::jsonb then provider_payload else p_payload end,
    status = 'captured', updated_at = now()
  where reservation_id = p_reservation_id and provider_order_id = p_provider_order_id;
  if not found then raise exception 'PAYMENT_ORDER_NOT_FOUND'; end if;

  update public.marketplace_reservations set status = 'confirmed', updated_at = now()
  where id = p_reservation_id and status = 'payment_pending'
  returning * into v_reservation;
  if not found then select * into v_reservation from public.marketplace_reservations where id = p_reservation_id; end if;

  insert into public.fulfillment_events(reservation_id, actor_id, event_type)
  values (p_reservation_id, v_reservation.buyer_id, 'paid')
  on conflict (reservation_id, event_type) do nothing;
  return v_reservation;
end;
$$;

revoke all on function public.confirm_marketplace_payment(uuid, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.confirm_marketplace_payment(uuid, text, text, text, jsonb) to service_role;

create or replace function public.expire_marketplace_holds()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reservation record;
  v_count integer := 0;
begin
  for v_reservation in
    select id, buyer_id from public.marketplace_reservations
    where status = 'payment_pending' and expires_at <= now()
    for update skip locked
  loop
    perform public.release_marketplace_reservation(v_reservation.id, 'expired', v_reservation.buyer_id, 'Payment window expired');
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke all on function public.expire_marketplace_holds() from public, anon, authenticated;
grant execute on function public.expire_marketplace_holds() to service_role;

insert into public.heritage_sites(id, name, name_hi, city, state, latitude, longitude) values
  ('taj-mahal', 'Taj Mahal', 'ताज महल', 'Agra', 'Uttar Pradesh', 27.175145, 78.042142),
  ('agra-fort', 'Agra Fort', 'आगरा किला', 'Agra', 'Uttar Pradesh', 27.179533, 78.021112),
  ('red-fort', 'Red Fort', 'लाल किला', 'Delhi', 'Delhi', 28.656159, 77.241020),
  ('qutub-minar', 'Qutub Minar', 'क़ुतुब मीनार', 'Delhi', 'Delhi', 28.524428, 77.185455),
  ('hawa-mahal', 'Hawa Mahal', 'हवा महल', 'Jaipur', 'Rajasthan', 26.923936, 75.826744),
  ('hampi', 'Hampi', 'हम्पी', 'Hampi', 'Karnataka', 15.335013, 76.460024),
  ('konark', 'Konark Sun Temple', 'कोणार्क सूर्य मंदिर', 'Konark', 'Odisha', 19.887595, 86.094536)
on conflict (id) do update set
  name = excluded.name,
  name_hi = excluded.name_hi,
  city = excluded.city,
  state = excluded.state,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  updated_at = now();

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values
  ('marketplace-listings', 'marketplace-listings', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('artisan-documents', 'artisan-documents', false, 10485760, array['image/jpeg', 'image/png', 'application/pdf'])
on conflict (id) do nothing;

drop policy if exists "public reads marketplace images" on storage.objects;
create policy "public reads marketplace images" on storage.objects for select to anon, authenticated
using (bucket_id = 'marketplace-listings');
drop policy if exists "artisans upload marketplace images" on storage.objects;
create policy "artisans upload marketplace images" on storage.objects for insert to authenticated
with check (
  bucket_id = 'marketplace-listings'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (select private.marketplace_is_approved_artisan())
);
drop policy if exists "owners manage marketplace images" on storage.objects;
create policy "owners manage marketplace images" on storage.objects for update to authenticated
using (bucket_id = 'marketplace-listings' and owner_id = (select auth.uid())::text)
with check (bucket_id = 'marketplace-listings' and owner_id = (select auth.uid())::text);
drop policy if exists "owners delete marketplace images" on storage.objects;
create policy "owners delete marketplace images" on storage.objects for delete to authenticated
using (bucket_id = 'marketplace-listings' and owner_id = (select auth.uid())::text);

drop policy if exists "applicants read own documents" on storage.objects;
create policy "applicants read own documents" on storage.objects for select to authenticated
using (bucket_id = 'artisan-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "applicants upload own documents" on storage.objects;
create policy "applicants upload own documents" on storage.objects for insert to authenticated
with check (bucket_id = 'artisan-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
