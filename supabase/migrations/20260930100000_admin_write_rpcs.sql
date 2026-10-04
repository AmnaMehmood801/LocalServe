create or replace function public.admin_set_listing_active(
  listing_id uuid,
  is_active boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'NOT_ADMIN' using errcode = '42501';
  end if;

  update public.listings as target
  set is_active = $2
  where target.id = $1;

  if not found then
    raise exception 'LISTING_NOT_FOUND' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.admin_set_profile_active(
  profile_id uuid,
  is_active boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'NOT_ADMIN' using errcode = '42501';
  end if;

  update public.profiles as target
  set is_active = $2
  where target.id = $1;

  if not found then
    raise exception 'PROFILE_NOT_FOUND' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.admin_set_review_visible(
  review_id uuid,
  is_visible boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing_id uuid;
begin
  if not public.is_admin() then
    raise exception 'NOT_ADMIN' using errcode = '42501';
  end if;

  select target.listing_id
  into v_listing_id
  from public.reviews as target
  where target.id = $1;

  if not found then
    raise exception 'REVIEW_NOT_FOUND' using errcode = 'P0002';
  end if;

  perform 1
  from public.listings as target
  where target.id = v_listing_id
  for update;

  if not found then
    raise exception 'LISTING_NOT_FOUND' using errcode = 'P0002';
  end if;

  update public.reviews as target
  set is_hidden = not $2
  where target.id = $1;

  update public.listings as target
  set rating_count = aggregate.visible_count,
      rating_avg = coalesce(aggregate.visible_average, 0)
  from (
    select count(*)::integer as visible_count,
           avg(review.rating)::numeric(3, 2) as visible_average
    from public.reviews as review
    where review.listing_id = v_listing_id
      and not review.is_hidden
  ) as aggregate
  where target.id = v_listing_id;
end;
$$;

create or replace function public.admin_set_profile_verified(
  profile_id uuid,
  is_verified boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'NOT_ADMIN' using errcode = '42501';
  end if;

  update public.profiles as target
  set is_verified = $2
  where target.id = $1;

  if not found then
    raise exception 'PROFILE_NOT_FOUND' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.admin_set_listing_active(uuid, boolean)
  from public, anon, authenticated, service_role;
revoke all on function public.admin_set_profile_active(uuid, boolean)
  from public, anon, authenticated, service_role;
revoke all on function public.admin_set_review_visible(uuid, boolean)
  from public, anon, authenticated, service_role;
revoke all on function public.admin_set_profile_verified(uuid, boolean)
  from public, anon, authenticated, service_role;

grant execute on function public.admin_set_listing_active(uuid, boolean)
  to authenticated;
grant execute on function public.admin_set_profile_active(uuid, boolean)
  to authenticated;
grant execute on function public.admin_set_review_visible(uuid, boolean)
  to authenticated;
grant execute on function public.admin_set_profile_verified(uuid, boolean)
  to authenticated;
