create or replace function public.add_marketplace_role(p_role public.user_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  if p_role not in (
    'customer'::public.user_role,
    'provider'::public.user_role
  ) then
    raise exception 'INVALID_MARKETPLACE_ROLE' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = v_user_id and is_active
  ) then
    raise exception 'PROFILE_INACTIVE' using errcode = '42501';
  end if;

  insert into public.user_roles (user_id, role)
  values (v_user_id, p_role)
  on conflict (user_id, role) do nothing;
end;
$$;

create or replace function public.update_account_profile(
  p_display_name text,
  p_phone text,
  p_area_id uuid,
  p_bio text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_city_id uuid;
  v_profile public.profiles%rowtype;
  v_display_name text := btrim(coalesce(p_display_name, ''));
  v_phone text := nullif(btrim(p_phone), '');
  v_bio text := nullif(btrim(p_bio), '');
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  if char_length(v_display_name) < 2 or char_length(v_display_name) > 80 then
    raise exception 'PROFILE_DISPLAY_NAME_INVALID' using errcode = '22023';
  end if;

  if v_phone is not null and char_length(v_phone) > 40 then
    raise exception 'PROFILE_PHONE_TOO_LONG' using errcode = '22023';
  end if;

  if v_bio is not null and char_length(v_bio) > 2000 then
    raise exception 'PROFILE_BIO_TOO_LONG' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = v_user_id and is_active
  ) then
    raise exception 'PROFILE_INACTIVE' using errcode = '42501';
  end if;

  select id into v_city_id
  from public.cities
  where slug = 'samundri'
    and is_active;

  if v_city_id is null then
    raise exception 'CITY_UNAVAILABLE' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.areas
    where id = p_area_id
      and city_id = v_city_id
      and is_active
  ) then
    raise exception 'PROFILE_AREA_INVALID' using errcode = '22023';
  end if;

  update public.profiles
  set display_name = v_display_name,
      phone = v_phone,
      area_id = p_area_id,
      bio = v_bio,
      city_id = v_city_id,
      updated_at = now()
  where id = v_user_id
  returning * into v_profile;

  return v_profile;
end;
$$;

revoke all on function public.add_marketplace_role(public.user_role) from public, anon;
revoke all on function public.update_account_profile(text, text, uuid, text) from public, anon;

grant execute on function public.add_marketplace_role(public.user_role) to authenticated;
grant execute on function public.update_account_profile(text, text, uuid, text) to authenticated;
