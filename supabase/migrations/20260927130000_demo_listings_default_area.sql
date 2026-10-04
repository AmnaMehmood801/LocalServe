do $demo_area$
declare
  v_city_id uuid;
  v_default_area_id uuid;
  v_updated_count integer;
begin
  select id into v_city_id
  from public.cities
  where slug = 'samundri'
    and is_active
  order by name
  limit 1;

  if v_city_id is null then
    raise exception 'No active Samundri city found.';
  end if;

  select id into v_default_area_id
  from public.areas
  where city_id = v_city_id
    and is_active
  order by name, id
  limit 1;

  if v_default_area_id is null then
    raise exception 'No active Samundri area found.';
  end if;

  with demo(category_slug, title, description) as (
    values
      (
        'electrician',
        'Home Electrical Fault Finding',
        'Inspection and repair for common outlet, switch, and lighting faults. Parts or additional work are discussed before proceeding.'
      ),
      (
        'plumbing',
        'Tap, Pipe, and Leak Repair',
        'Troubleshooting for leaking taps, loose fittings, and minor household pipe issues. Confirm the work details with the provider after acceptance.'
      ),
      (
        'cleaning',
        'Home Deep Cleaning',
        'Room-by-room dusting, floor cleaning, and kitchen and bathroom surface care. Share the service details with the provider when requesting a time.'
      ),
      (
        'tutoring',
        'Primary Math Tutoring',
        'One-to-one support with arithmetic, problem-solving, and homework review for primary-grade students.'
      )
  )
  update public.listings as listing
  set area_id = v_default_area_id
  from demo
  join public.categories as category
    on category.slug = demo.category_slug
  where listing.city_id = v_city_id
    and listing.category_id = category.id
    and listing.title = demo.title
    and listing.description = demo.description
    and listing.area_id <> v_default_area_id;

  get diagnostics v_updated_count = row_count;
  raise notice 'Moved % demo listings to the default active Samundri area.', v_updated_count;
end;
$demo_area$;
