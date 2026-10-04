create or replace function public.submit_review(
  p_booking_id uuid,
  p_rating smallint,
  p_comment text default null
)
returns public.reviews
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_booking public.bookings%rowtype;
  v_review public.reviews%rowtype;
  v_comment text := nullif(btrim(p_comment), '');
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  if not public.has_role('customer'::public.user_role) then
    raise exception 'CUSTOMER_ROLE_REQUIRED' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = v_user_id and is_active
  ) then
    raise exception 'PROFILE_INACTIVE' using errcode = '42501';
  end if;

  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'REVIEW_RATING_INVALID' using errcode = '22023';
  end if;

  if v_comment is not null and char_length(v_comment) < 10 then
    raise exception 'REVIEW_COMMENT_TOO_SHORT' using errcode = '22023';
  end if;

  if v_comment is not null and char_length(v_comment) > 2000 then
    raise exception 'REVIEW_COMMENT_TOO_LONG' using errcode = '22023';
  end if;

  select * into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found or v_booking.customer_id <> v_user_id then
    raise exception 'BOOKING_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_booking.status <> 'completed'::public.booking_status then
    raise exception 'REVIEW_BOOKING_NOT_COMPLETED' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.reviews
    where booking_id = v_booking.id
  ) then
    raise exception 'REVIEW_ALREADY_SUBMITTED' using errcode = '23505';
  end if;

  insert into public.reviews (
    booking_id,
    listing_id,
    author_id,
    target_provider_id,
    rating,
    comment
  )
  values (
    v_booking.id,
    v_booking.listing_id,
    v_user_id,
    v_booking.provider_id,
    p_rating,
    v_comment
  )
  returning * into v_review;

  update public.listings
  set rating_count = (
        select count(*)::integer
        from public.reviews
        where listing_id = v_booking.listing_id
          and not is_hidden
      ),
      rating_avg = coalesce((
        select avg(rating)::numeric(3, 2)
        from public.reviews
        where listing_id = v_booking.listing_id
          and not is_hidden
      ), 0)
  where id = v_booking.listing_id;

  return v_review;
end;
$$;

create or replace function public.mark_notifications_read(
  p_notification_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_updated_count integer;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  update public.notifications
  set read_at = now()
  where user_id = v_user_id
    and read_at is null
    and (p_notification_id is null or id = p_notification_id);

  get diagnostics v_updated_count = row_count;
  return v_updated_count;
end;
$$;

revoke all on function public.submit_review(uuid, smallint, text) from public, anon;
revoke all on function public.mark_notifications_read(uuid) from public, anon;

grant execute on function public.submit_review(uuid, smallint, text) to authenticated;
grant execute on function public.mark_notifications_read(uuid) to authenticated;
