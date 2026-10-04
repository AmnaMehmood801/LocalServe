-- Run as a database owner only on a disposable or otherwise approved database
-- after applying 20260930100000_admin_write_rpcs.sql. All changes are rolled back.
begin;

do $admin_write_grant_assertions$
declare
  v_function text;
begin
  foreach v_function in array array[
    'public.admin_set_listing_active(uuid,boolean)',
    'public.admin_set_profile_active(uuid,boolean)',
    'public.admin_set_review_visible(uuid,boolean)',
    'public.admin_set_profile_verified(uuid,boolean)'
  ] loop
    if has_function_privilege('anon', v_function, 'EXECUTE')
      or has_function_privilege('service_role', v_function, 'EXECUTE')
      or not has_function_privilege('authenticated', v_function, 'EXECUTE') then
      raise exception 'ADMIN_WRITE_TEST_GRANT_ASSERTION_FAILED: %', v_function;
    end if;
  end loop;
end;
$admin_write_grant_assertions$;

do $admin_write_fixture$
declare
  v_admin_id uuid := gen_random_uuid();
  v_non_admin_id uuid := gen_random_uuid();
  v_provider_id uuid := gen_random_uuid();
  v_customer_id uuid := gen_random_uuid();
  v_listing_id uuid := gen_random_uuid();
  v_booking_id uuid := gen_random_uuid();
  v_review_id uuid := gen_random_uuid();
  v_city_id uuid;
  v_area_id uuid;
  v_category_id uuid;
begin
  select id into v_city_id
  from public.cities
  where slug = 'samundri' and is_active
  order by name, id
  limit 1;

  select id into v_area_id
  from public.areas
  where city_id = v_city_id and is_active
  order by name, id
  limit 1;

  select id into v_category_id
  from public.categories
  where is_active
  order by sort_order, id
  limit 1;

  if v_city_id is null or v_area_id is null or v_category_id is null then
    raise exception 'ADMIN_WRITE_TEST_CATALOG_PREREQUISITE_FAILED';
  end if;

  insert into auth.users (
    id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) values
    (v_admin_id, 'authenticated', 'authenticated',
     'admin-write-' || v_admin_id || '@example.invalid',
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"display_name":"RPC test admin"}'::jsonb, now(), now()),
    (v_non_admin_id, 'authenticated', 'authenticated',
     'non-admin-write-' || v_non_admin_id || '@example.invalid',
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"display_name":"RPC test non-admin"}'::jsonb, now(), now()),
    (v_provider_id, 'authenticated', 'authenticated',
     'provider-write-' || v_provider_id || '@example.invalid',
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"display_name":"RPC test provider","role":"provider"}'::jsonb,
     now(), now()),
    (v_customer_id, 'authenticated', 'authenticated',
     'customer-write-' || v_customer_id || '@example.invalid',
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"display_name":"RPC test customer"}'::jsonb, now(), now());

  insert into public.user_roles (user_id, role)
  values (v_admin_id, 'admin'::public.user_role);

  insert into public.listings (
    id, provider_id, city_id, area_id, category_id, title, description,
    pricing_type, price_amount
  ) values (
    v_listing_id, v_provider_id, v_city_id, v_area_id, v_category_id,
    'RPC test listing', 'Temporary rollback-only listing.', 'fixed', 100
  );

  insert into public.bookings (
    id, listing_id, customer_id, provider_id, status, scheduled_start,
    address_text, snapshot_title, snapshot_pricing_type,
    snapshot_price_amount, snapshot_currency
  ) values (
    v_booking_id, v_listing_id, v_customer_id, v_provider_id,
    'completed'::public.booking_status, now(), 'Temporary test address',
    'RPC test listing', 'fixed'::public.pricing_type, 100, 'PKR'
  );

  insert into public.reviews (
    id, booking_id, listing_id, author_id, target_provider_id, rating
  ) values (
    v_review_id, v_booking_id, v_listing_id, v_customer_id, v_provider_id, 4
  );

  perform set_config('localserve.admin_write_test.admin_id', v_admin_id::text, true);
  perform set_config('localserve.admin_write_test.non_admin_id', v_non_admin_id::text, true);
  perform set_config('localserve.admin_write_test.profile_id', v_admin_id::text, true);
  perform set_config('localserve.admin_write_test.listing_id', v_listing_id::text, true);
  perform set_config('localserve.admin_write_test.review_id', v_review_id::text, true);
end;
$admin_write_fixture$;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  current_setting('localserve.admin_write_test.admin_id'),
  true
);
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', current_setting('localserve.admin_write_test.admin_id'),
    'role', 'authenticated'
  )::text,
  true
);

select public.admin_set_listing_active(
  current_setting('localserve.admin_write_test.listing_id')::uuid, false
);
select public.admin_set_profile_active(
  current_setting('localserve.admin_write_test.profile_id')::uuid, false
);
select public.admin_set_review_visible(
  current_setting('localserve.admin_write_test.review_id')::uuid, false
);

do $admin_write_hidden_review_assertion$
declare
  v_rating_count integer;
  v_rating_avg numeric(3, 2);
begin
  select rating_count, rating_avg into v_rating_count, v_rating_avg
  from public.listings
  where id = current_setting('localserve.admin_write_test.listing_id')::uuid;

  if v_rating_count is distinct from 0 or v_rating_avg is distinct from 0.00 then
    raise exception 'ADMIN_WRITE_TEST_HIDDEN_REVIEW_RATING_ASSERTION_FAILED';
  end if;
end;
$admin_write_hidden_review_assertion$;

select public.admin_set_review_visible(
  current_setting('localserve.admin_write_test.review_id')::uuid, true
);
select public.admin_set_profile_verified(
  current_setting('localserve.admin_write_test.profile_id')::uuid, true
);

do $admin_write_success_assertions$
declare
  v_listing_active boolean;
  v_profile_active boolean;
  v_profile_verified boolean;
  v_rating_count integer;
  v_rating_avg numeric(3, 2);
begin
  select is_active into v_listing_active
  from public.listings
  where id = current_setting('localserve.admin_write_test.listing_id')::uuid;
  select is_active, is_verified into v_profile_active, v_profile_verified
  from public.profiles
  where id = current_setting('localserve.admin_write_test.profile_id')::uuid;
  select rating_count, rating_avg into v_rating_count, v_rating_avg
  from public.listings
  where id = current_setting('localserve.admin_write_test.listing_id')::uuid;

  if v_listing_active is distinct from false
    or v_profile_active is distinct from false
    or v_profile_verified is distinct from true
    or v_rating_count is distinct from 1
    or v_rating_avg is distinct from 4.00 then
    raise exception 'ADMIN_WRITE_TEST_SUCCESS_ASSERTION_FAILED';
  end if;
end;
$admin_write_success_assertions$;

select set_config(
  'request.jwt.claim.sub',
  current_setting('localserve.admin_write_test.non_admin_id'),
  true
);
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', current_setting('localserve.admin_write_test.non_admin_id'),
    'role', 'authenticated'
  )::text,
  true
);

do $admin_write_denial_assertions$
begin
  begin
    perform public.admin_set_listing_active(
      current_setting('localserve.admin_write_test.listing_id')::uuid, true
    );
    raise exception 'ADMIN_WRITE_TEST_NON_ADMIN_LISTING_ALLOWED';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.admin_set_profile_active(
      current_setting('localserve.admin_write_test.profile_id')::uuid, true
    );
    raise exception 'ADMIN_WRITE_TEST_NON_ADMIN_PROFILE_ACTIVE_ALLOWED';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.admin_set_review_visible(
      current_setting('localserve.admin_write_test.review_id')::uuid, false
    );
    raise exception 'ADMIN_WRITE_TEST_NON_ADMIN_REVIEW_ALLOWED';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.admin_set_profile_verified(
      current_setting('localserve.admin_write_test.profile_id')::uuid, false
    );
    raise exception 'ADMIN_WRITE_TEST_NON_ADMIN_VERIFICATION_ALLOWED';
  exception when insufficient_privilege then null;
  end;
end;
$admin_write_denial_assertions$;

select set_config(
  'request.jwt.claim.sub',
  current_setting('localserve.admin_write_test.admin_id'),
  true
);
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', current_setting('localserve.admin_write_test.admin_id'),
    'role', 'authenticated'
  )::text,
  true
);

do $admin_write_denial_state_assertions$
begin
  if (select is_active from public.listings
      where id = current_setting('localserve.admin_write_test.listing_id')::uuid)
    is distinct from false
    or (select is_active from public.profiles
        where id = current_setting('localserve.admin_write_test.profile_id')::uuid)
    is distinct from false
    or (select is_verified from public.profiles
        where id = current_setting('localserve.admin_write_test.profile_id')::uuid)
    is distinct from true
    or (select is_hidden from public.reviews
        where id = current_setting('localserve.admin_write_test.review_id')::uuid)
    is distinct from false then
    raise exception 'ADMIN_WRITE_TEST_DENIAL_CHANGED_STATE';
  end if;
end;
$admin_write_denial_state_assertions$;

do $admin_write_test_passed$
begin
  raise notice 'ADMIN_WRITE_RPCS_PASSED_AND_ROLLED_BACK';
end;
$admin_write_test_passed$;

rollback;
