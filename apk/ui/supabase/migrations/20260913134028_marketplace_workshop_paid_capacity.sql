alter table public.workshop_slots
  add column if not exists held_quantity integer not null default 0;

-- Reservations made before this migration counted unpaid holds as reserved seats.
with pending as (
  select workshop_slot_id, sum(quantity)::integer as quantity
  from public.marketplace_reservations
  where status = 'payment_pending' and workshop_slot_id is not null
  group by workshop_slot_id
)
update public.workshop_slots slots
set held_quantity = least(slots.reserved_quantity, pending.quantity),
    reserved_quantity = greatest(0, slots.reserved_quantity - pending.quantity),
    updated_at = now()
from pending
where slots.id = pending.workshop_slot_id;

alter table public.workshop_slots
  drop constraint if exists workshop_slots_reserved_quantity_check;
alter table public.workshop_slots
  add constraint workshop_slots_reserved_quantity_check
    check (reserved_quantity >= 0),
  add constraint workshop_slots_held_quantity_check
    check (held_quantity >= 0),
  add constraint workshop_slots_total_capacity_check
    check (reserved_quantity + held_quantity <= capacity);

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
  if p_quantity < 1 or p_quantity > 20 then raise exception 'INVALID_QUANTITY'; end if;

  select * into v_listing from public.marketplace_listings
  where id = p_listing_id and approval_status = 'approved' and active
  for update;
  if not found then raise exception 'LISTING_UNAVAILABLE'; end if;

  if v_listing.kind = 'craft' then
    if p_workshop_slot_id is not null then raise exception 'SLOT_NOT_ALLOWED'; end if;
    if v_listing.stock_quantity < p_quantity then raise exception 'INSUFFICIENT_STOCK'; end if;
    update public.marketplace_listings
      set stock_quantity = stock_quantity - p_quantity, updated_at = now()
      where id = p_listing_id;
    v_scheduled_for := coalesce(p_scheduled_for, date_trunc('day', now() + interval '1 day') + interval '12 hours');
    if v_scheduled_for < now() then raise exception 'INVALID_PICKUP_TIME'; end if;
  else
    if p_workshop_slot_id is null then raise exception 'SLOT_REQUIRED'; end if;
    select * into v_slot from public.workshop_slots
      where id = p_workshop_slot_id and listing_id = p_listing_id and active and starts_at > now()
      for update;
    if not found then raise exception 'SLOT_UNAVAILABLE'; end if;
    if v_slot.reserved_quantity + v_slot.held_quantity + p_quantity > v_slot.capacity then
      raise exception 'INSUFFICIENT_CAPACITY';
    end if;
    update public.workshop_slots
      set held_quantity = held_quantity + p_quantity, updated_at = now()
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
begin
  if p_status not in ('cancelled', 'refund_pending', 'refunded', 'expired') then
    raise exception 'INVALID_RELEASE_STATUS';
  end if;
  select * into v_reservation from public.marketplace_reservations
    where id = p_reservation_id for update;
  if not found then raise exception 'RESERVATION_NOT_FOUND'; end if;
  if v_reservation.status not in ('payment_pending', 'confirmed', 'refund_pending') then return v_reservation; end if;
  select kind into v_kind from public.marketplace_listings where id = v_reservation.listing_id;

  if v_reservation.status = 'payment_pending' and v_kind = 'craft' then
    update public.marketplace_listings
      set stock_quantity = stock_quantity + v_reservation.quantity, updated_at = now()
      where id = v_reservation.listing_id;
  elsif v_reservation.status = 'payment_pending' and v_reservation.workshop_slot_id is not null then
    update public.workshop_slots
      set held_quantity = greatest(0, held_quantity - v_reservation.quantity), updated_at = now()
      where id = v_reservation.workshop_slot_id;
  elsif v_reservation.status = 'confirmed' and v_kind = 'craft' then
    update public.marketplace_listings
      set stock_quantity = stock_quantity + v_reservation.quantity, updated_at = now()
      where id = v_reservation.listing_id;
  elsif v_reservation.status = 'confirmed' and v_reservation.workshop_slot_id is not null then
    update public.workshop_slots
      set reserved_quantity = greatest(0, reserved_quantity - v_reservation.quantity), updated_at = now()
      where id = v_reservation.workshop_slot_id;
  end if;

  update public.marketplace_reservations
    set status = p_status, cancellation_reason = p_reason, cancelled_by = p_actor_id, updated_at = now()
    where id = p_reservation_id returning * into v_reservation;
  return v_reservation;
end;
$$;

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
  v_slot public.workshop_slots;
begin
  select * into v_reservation from public.marketplace_reservations
    where id = p_reservation_id for update;
  if not found then raise exception 'RESERVATION_NOT_FOUND'; end if;
  if v_reservation.expires_at <= now() and v_reservation.status = 'payment_pending' then
    raise exception 'RESERVATION_EXPIRED';
  end if;

  if v_reservation.status = 'payment_pending' and v_reservation.workshop_slot_id is not null then
    select * into v_slot from public.workshop_slots
      where id = v_reservation.workshop_slot_id for update;
    if not found or v_slot.held_quantity < v_reservation.quantity then
      raise exception 'WORKSHOP_HOLD_NOT_FOUND';
    end if;
    update public.workshop_slots
      set held_quantity = held_quantity - v_reservation.quantity,
          reserved_quantity = reserved_quantity + v_reservation.quantity,
          updated_at = now()
      where id = v_reservation.workshop_slot_id;
  end if;

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
  if not found then
    select * into v_reservation from public.marketplace_reservations where id = p_reservation_id;
  end if;

  insert into public.fulfillment_events(reservation_id, actor_id, event_type)
    values (p_reservation_id, v_reservation.buyer_id, 'paid')
    on conflict (reservation_id, event_type) do nothing;
  return v_reservation;
end;
$$;

revoke all on function public.reserve_marketplace_item(uuid, bigint, integer, bigint, timestamptz) from public, anon, authenticated;
grant execute on function public.reserve_marketplace_item(uuid, bigint, integer, bigint, timestamptz) to service_role;
revoke all on function public.release_marketplace_reservation(uuid, text, uuid, text) from public, anon, authenticated;
grant execute on function public.release_marketplace_reservation(uuid, text, uuid, text) to service_role;
revoke all on function public.confirm_marketplace_payment(uuid, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.confirm_marketplace_payment(uuid, text, text, text, jsonb) to service_role;
