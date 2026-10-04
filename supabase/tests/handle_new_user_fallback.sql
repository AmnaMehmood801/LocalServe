do $trigger_smoke$
declare
  v_user_id uuid := gen_random_uuid();
  v_email text := 'trigger-smoke-' || gen_random_uuid()::text || '@example.invalid';
  v_city_id uuid;
  v_profile public.profiles%rowtype;
begin
  begin
    insert into auth.users (
      id,
      aud,
      role,
      email,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    values (
      v_user_id,
      'authenticated',
      'authenticated',
      v_email,
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"admin","area_id":"not-a-uuid","display_name":""}'::jsonb,
      now(),
      now()
    );

    select id into v_city_id
    from public.cities
    where slug = 'samundri'
      and is_active
    order by name
    limit 1;

    select * into v_profile
    from public.profiles
    where id = v_user_id;

    if not found
      or v_profile.city_id is distinct from v_city_id
      or v_profile.display_name is distinct from split_part(v_email, '@', 1)
      or not exists (
        select 1 from public.areas
        where id = v_profile.area_id
          and city_id = v_city_id
          and is_active
      )
      or not exists (
        select 1 from public.user_roles
        where user_id = v_user_id
          and role = 'customer'::public.user_role
      )
      or exists (
        select 1 from public.user_roles
        where user_id = v_user_id
          and role = 'admin'::public.user_role
      ) then
      raise exception 'TRIGGER_SMOKE_FAILED';
    end if;

    raise exception 'TRIGGER_SMOKE_ROLLBACK';
  exception
    when others then
      if sqlerrm = 'TRIGGER_SMOKE_ROLLBACK' then
        raise notice 'TRIGGER_SMOKE_PASSED_AND_ROLLED_BACK';
      else
        raise;
      end if;
  end;
end;
$trigger_smoke$;

do $trigger_smoke_valid$
declare
  v_user_id uuid := gen_random_uuid();
  v_email text := 'trigger-smoke-' || gen_random_uuid()::text || '@example.invalid';
  v_city_id uuid;
  v_area_id uuid;
  v_profile public.profiles%rowtype;
begin
  select id into v_city_id
  from public.cities
  where slug = 'samundri'
    and is_active
  order by name
  limit 1;

  select id into v_area_id
  from public.areas
  where city_id = v_city_id
    and is_active
  order by name
  limit 1;

  if v_city_id is null or v_area_id is null then
    raise exception 'TRIGGER_SMOKE_PREREQUISITE_FAILED';
  end if;

  begin
    insert into auth.users (
      id,
      aud,
      role,
      email,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    values (
      v_user_id,
      'authenticated',
      'authenticated',
      v_email,
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object(
        'display_name', 'Trigger Smoke Provider',
        'role', 'provider',
        'area_id', v_area_id::text
      ),
      now(),
      now()
    );

    select * into v_profile
    from public.profiles
    where id = v_user_id;

    if not found
      or v_profile.city_id is distinct from v_city_id
      or v_profile.area_id is distinct from v_area_id
      or v_profile.display_name is distinct from 'Trigger Smoke Provider'
      or not exists (
        select 1 from public.user_roles
        where user_id = v_user_id
          and role = 'provider'::public.user_role
      ) then
      raise exception 'TRIGGER_SMOKE_VALID_FAILED';
    end if;

    raise exception 'TRIGGER_SMOKE_VALID_ROLLBACK';
  exception
    when others then
      if sqlerrm = 'TRIGGER_SMOKE_VALID_ROLLBACK' then
        raise notice 'TRIGGER_SMOKE_VALID_PASSED_AND_ROLLED_BACK';
      else
        raise;
      end if;
  end;
end;
$trigger_smoke_valid$;
