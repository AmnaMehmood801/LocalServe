create or replace function public.get_public_provider_profiles(
  p_provider_ids uuid[],
  p_city_id uuid,
  p_area_id uuid,
  p_name_query text
)
returns table (
  id uuid,
  display_name text,
  bio text,
  is_verified boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_provider_ids is null
    and (p_city_id is null or p_area_id is null or nullif(btrim(p_name_query), '') is null) then
    raise exception 'PUBLIC_PROVIDER_QUERY_TOO_BROAD' using errcode = '22023';
  end if;

  return query
  select profile.id, profile.display_name, profile.bio, profile.is_verified
  from public.profiles profile
  where profile.is_active
    and (p_provider_ids is null or profile.id = any(p_provider_ids))
    and (
      nullif(btrim(p_name_query), '') is null
      or profile.display_name ilike '%' || btrim(p_name_query) || '%'
    )
    and exists (
      select 1
      from public.listings listing
      join public.cities city
        on city.id = listing.city_id
        and city.is_active
      join public.areas area
        on area.id = listing.area_id
        and area.city_id = listing.city_id
        and area.is_active
      join public.categories category
        on category.id = listing.category_id
        and category.is_active
      where listing.provider_id = profile.id
        and listing.is_active
        and (p_city_id is null or listing.city_id = p_city_id)
        and (p_area_id is null or listing.area_id = p_area_id)
    )
  order by profile.display_name, profile.id
  limit 1000;
end;
$$;

revoke all on function public.get_public_provider_profiles(uuid[], uuid, uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.get_public_provider_profiles(uuid[], uuid, uuid, text)
  to anon, authenticated;
