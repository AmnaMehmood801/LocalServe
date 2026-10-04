create or replace function public.accept_booking(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_booking public.bookings%rowtype;
begin
  if v_actor_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  if not public.has_role('provider'::public.user_role) then
    raise exception 'PROVIDER_ROLE_REQUIRED' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = v_actor_id and is_active
  ) then
    raise exception 'PROFILE_INACTIVE' using errcode = '42501';
  end if;

  select * into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'BOOKING_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_booking.provider_id <> v_actor_id then
    raise exception 'NOT_BOOKING_PARTY' using errcode = '42501';
  end if;

  if v_booking.status <> 'requested'::public.booking_status then
    raise exception 'BOOKING_INVALID_TRANSITION' using errcode = 'P0001';
  end if;

  update public.bookings
  set status = 'accepted'::public.booking_status,
      updated_at = now()
  where id = v_booking.id
  returning * into v_booking;

  insert into public.notifications (user_id, type, booking_id, payload)
  values (
    v_booking.customer_id,
    'booking_accepted'::public.notification_type,
    v_booking.id,
    jsonb_build_object('booking_id', v_booking.id, 'listing_title', v_booking.snapshot_title)
  );

  return v_booking;
end;
$$;

create or replace function public.decline_booking(p_booking_id uuid, p_reason text)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_booking public.bookings%rowtype;
  v_reason text := nullif(btrim(p_reason), '');
begin
  if v_actor_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  if not public.has_role('provider'::public.user_role) then
    raise exception 'PROVIDER_ROLE_REQUIRED' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = v_actor_id and is_active
  ) then
    raise exception 'PROFILE_INACTIVE' using errcode = '42501';
  end if;

  if v_reason is null then
    raise exception 'DECLINE_REASON_REQUIRED' using errcode = '22023';
  end if;

  if char_length(v_reason) > 1000 then
    raise exception 'DECLINE_REASON_TOO_LONG' using errcode = '22023';
  end if;

  select * into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'BOOKING_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_booking.provider_id <> v_actor_id then
    raise exception 'NOT_BOOKING_PARTY' using errcode = '42501';
  end if;

  if v_booking.status <> 'requested'::public.booking_status then
    raise exception 'BOOKING_INVALID_TRANSITION' using errcode = 'P0001';
  end if;

  update public.bookings
  set status = 'declined'::public.booking_status,
      decline_reason = v_reason,
      updated_at = now()
  where id = v_booking.id
  returning * into v_booking;

  insert into public.notifications (user_id, type, booking_id, payload)
  values (
    v_booking.customer_id,
    'booking_declined'::public.notification_type,
    v_booking.id,
    jsonb_build_object('booking_id', v_booking.id, 'listing_title', v_booking.snapshot_title)
  );

  return v_booking;
end;
$$;

create or replace function public.cancel_booking(p_booking_id uuid, p_reason text default null)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_booking public.bookings%rowtype;
  v_reason text := nullif(btrim(p_reason), '');
  v_next_status public.booking_status;
  v_notify_user_id uuid;
begin
  if v_actor_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = v_actor_id and is_active
  ) then
    raise exception 'PROFILE_INACTIVE' using errcode = '42501';
  end if;

  if v_reason is not null and char_length(v_reason) > 1000 then
    raise exception 'CANCEL_REASON_TOO_LONG' using errcode = '22023';
  end if;

  select * into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'BOOKING_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_booking.status = 'requested'::public.booking_status
    and v_booking.customer_id = v_actor_id then
    if not public.has_role('customer'::public.user_role) then
      raise exception 'CUSTOMER_ROLE_REQUIRED' using errcode = '42501';
    end if;
    v_next_status := 'cancelled_by_customer'::public.booking_status;
    v_notify_user_id := v_booking.provider_id;
  elsif v_booking.status in (
      'accepted'::public.booking_status,
      'in_progress'::public.booking_status
    ) and v_booking.customer_id = v_actor_id then
    if not public.has_role('customer'::public.user_role) then
      raise exception 'CUSTOMER_ROLE_REQUIRED' using errcode = '42501';
    end if;
    if v_reason is null then
      raise exception 'CANCEL_REASON_REQUIRED' using errcode = '22023';
    end if;
    v_next_status := 'cancelled_by_customer'::public.booking_status;
    v_notify_user_id := v_booking.provider_id;
  elsif v_booking.status in (
      'accepted'::public.booking_status,
      'in_progress'::public.booking_status
    ) and v_booking.provider_id = v_actor_id then
    if not public.has_role('provider'::public.user_role) then
      raise exception 'PROVIDER_ROLE_REQUIRED' using errcode = '42501';
    end if;
    if v_reason is null then
      raise exception 'CANCEL_REASON_REQUIRED' using errcode = '22023';
    end if;
    v_next_status := 'cancelled_by_provider'::public.booking_status;
    v_notify_user_id := v_booking.customer_id;
  else
    if v_booking.customer_id <> v_actor_id
      and v_booking.provider_id <> v_actor_id then
      raise exception 'NOT_BOOKING_PARTY' using errcode = '42501';
    end if;
    raise exception 'BOOKING_INVALID_TRANSITION' using errcode = 'P0001';
  end if;

  update public.bookings
  set status = v_next_status,
      cancel_reason = v_reason,
      updated_at = now()
  where id = v_booking.id
  returning * into v_booking;

  insert into public.notifications (user_id, type, booking_id, payload)
  values (
    v_notify_user_id,
    'booking_cancelled'::public.notification_type,
    v_booking.id,
    jsonb_build_object('booking_id', v_booking.id, 'listing_title', v_booking.snapshot_title)
  );

  return v_booking;
end;
$$;

create or replace function public.complete_booking(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_booking public.bookings%rowtype;
begin
  if v_actor_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  if not public.has_role('provider'::public.user_role) then
    raise exception 'PROVIDER_ROLE_REQUIRED' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = v_actor_id and is_active
  ) then
    raise exception 'PROFILE_INACTIVE' using errcode = '42501';
  end if;

  select * into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'BOOKING_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_booking.provider_id <> v_actor_id then
    raise exception 'NOT_BOOKING_PARTY' using errcode = '42501';
  end if;

  if v_booking.status not in (
    'accepted'::public.booking_status,
    'in_progress'::public.booking_status
  ) then
    raise exception 'BOOKING_INVALID_TRANSITION' using errcode = 'P0001';
  end if;

  update public.bookings
  set status = 'completed'::public.booking_status,
      completed_at = now(),
      updated_at = now()
  where id = v_booking.id
  returning * into v_booking;

  insert into public.notifications (user_id, type, booking_id, payload)
  values (
    v_booking.customer_id,
    'booking_completed'::public.notification_type,
    v_booking.id,
    jsonb_build_object('booking_id', v_booking.id, 'listing_title', v_booking.snapshot_title)
  );

  return v_booking;
end;
$$;

revoke all on function public.accept_booking(uuid) from public, anon;
revoke all on function public.decline_booking(uuid, text) from public, anon;
revoke all on function public.cancel_booking(uuid, text) from public, anon;
revoke all on function public.complete_booking(uuid) from public, anon;

grant execute on function public.accept_booking(uuid) to authenticated;
grant execute on function public.decline_booking(uuid, text) to authenticated;
grant execute on function public.cancel_booking(uuid, text) to authenticated;
grant execute on function public.complete_booking(uuid) to authenticated;
