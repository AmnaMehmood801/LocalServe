create or replace function public.create_booking(
  p_listing_id uuid,
  p_scheduled_start timestamptz,
  p_scheduled_end timestamptz,
  p_address_text text,
  p_notes text
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid := auth.uid();
  v_listing public.listings%rowtype;
  v_booking public.bookings%rowtype;
begin
  if v_customer_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  if not public.has_role('customer'::public.user_role) then
    raise exception 'CUSTOMER_ROLE_REQUIRED' using errcode = '42501';
  end if;

  if nullif(btrim(p_address_text), '') is null then
    raise exception 'BOOKING_ADDRESS_REQUIRED' using errcode = '22023';
  end if;

  if p_scheduled_start is null
    or p_scheduled_start <= now()
    or (p_scheduled_end is not null and p_scheduled_end <= p_scheduled_start) then
    raise exception 'BOOKING_INVALID_SCHEDULE' using errcode = '22023';
  end if;

  if p_notes is not null and char_length(p_notes) > 2000 then
    raise exception 'BOOKING_NOTES_TOO_LONG' using errcode = '22023';
  end if;

  perform 1
  from public.profiles
  where id = v_customer_id
    and is_active;

  if not found then
    raise exception 'PROFILE_INACTIVE' using errcode = '42501';
  end if;

  select l.*
  into v_listing
  from public.listings l
  join public.cities c on c.id = l.city_id and c.is_active
  join public.areas a on a.id = l.area_id and a.is_active
  join public.categories cat on cat.id = l.category_id and cat.is_active
  join public.profiles provider on provider.id = l.provider_id and provider.is_active
  where l.id = p_listing_id
    and l.is_active
  for update of l;

  if not found then
    raise exception 'LISTING_UNAVAILABLE' using errcode = 'P0002';
  end if;

  if v_listing.provider_id = v_customer_id then
    raise exception 'BOOKING_OWN_LISTING' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.user_roles
    where user_id = v_listing.provider_id
      and role = 'provider'::public.user_role
  ) then
    raise exception 'PROVIDER_ROLE_REQUIRED' using errcode = '42501';
  end if;

  insert into public.bookings (
    listing_id,
    customer_id,
    provider_id,
    scheduled_start,
    scheduled_end,
    address_text,
    notes,
    snapshot_title,
    snapshot_pricing_type,
    snapshot_price_amount,
    snapshot_currency
  )
  values (
    v_listing.id,
    v_customer_id,
    v_listing.provider_id,
    p_scheduled_start,
    p_scheduled_end,
    btrim(p_address_text),
    nullif(btrim(p_notes), ''),
    v_listing.title,
    v_listing.pricing_type,
    v_listing.price_amount,
    v_listing.currency
  )
  returning * into v_booking;

  insert into public.notifications (user_id, type, booking_id, payload)
  values (
    v_listing.provider_id,
    'booking_requested'::public.notification_type,
    v_booking.id,
    jsonb_build_object(
      'booking_id', v_booking.id,
      'listing_title', v_booking.snapshot_title
    )
  );

  return v_booking;
end;
$$;

revoke all on function public.create_booking(uuid, timestamptz, timestamptz, text, text) from public;
revoke all on function public.create_booking(uuid, timestamptz, timestamptz, text, text) from anon;
grant execute on function public.create_booking(uuid, timestamptz, timestamptz, text, text) to authenticated;