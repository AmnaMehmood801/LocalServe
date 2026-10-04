-- Initial schema baseline for a new Supabase project.
-- Existing projects must compare their catalog to this baseline and mark this
-- version applied; do not execute this migration against populated databases.

create type public.user_role as enum ('customer', 'provider', 'admin');
create type public.pricing_type as enum ('hourly', 'fixed');
create type public.booking_status as enum (
  'requested',
  'accepted',
  'declined',
  'in_progress',
  'completed',
  'cancelled_by_customer',
  'cancelled_by_provider'
);
create type public.notification_type as enum (
  'booking_requested',
  'booking_accepted',
  'booking_declined',
  'booking_cancelled',
  'booking_completed'
);

create table public.cities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.areas (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities(id),
  name text not null,
  slug text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  parent_id uuid references public.categories(id),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  phone text,
  city_id uuid not null references public.cities(id),
  area_id uuid not null references public.areas(id),
  bio text,
  is_verified boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.user_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.profiles(id),
  city_id uuid not null references public.cities(id),
  area_id uuid not null references public.areas(id),
  category_id uuid not null references public.categories(id),
  title text not null,
  description text not null,
  pricing_type public.pricing_type not null,
  price_amount numeric(12, 2) not null check (price_amount > 0),
  currency char(3) not null default 'PKR',
  duration_minutes integer check (duration_minutes > 0),
  cover_image_path text,
  availability_note text,
  is_active boolean not null default true,
  rating_avg numeric(3, 2) not null default 0,
  rating_count integer not null default 0 check (rating_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id),
  customer_id uuid not null references public.profiles(id),
  provider_id uuid not null references public.profiles(id),
  status public.booking_status not null default 'requested',
  scheduled_start timestamptz not null,
  scheduled_end timestamptz,
  address_text text not null,
  notes text,
  snapshot_title text not null,
  snapshot_pricing_type public.pricing_type not null,
  snapshot_price_amount numeric(12, 2) not null,
  snapshot_currency char(3) not null,
  decline_reason text,
  cancel_reason text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_customer_provider_different check (customer_id <> provider_id),
  constraint bookings_schedule_order check (
    scheduled_end is null or scheduled_end > scheduled_start
  )
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id),
  listing_id uuid not null references public.listings(id),
  author_id uuid not null references public.profiles(id),
  target_provider_id uuid not null references public.profiles(id),
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) >= 10),
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type public.notification_type not null,
  booking_id uuid references public.bookings(id),
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index areas_city_id_slug_idx on public.areas (city_id, slug);
create index profiles_city_id_area_id_idx on public.profiles (city_id, area_id);
create index user_roles_role_idx on public.user_roles (role);
create index listings_city_area_active_category_idx
  on public.listings (city_id, area_id, is_active, category_id);
create index listings_provider_id_idx on public.listings (provider_id);
create index listings_active_rating_idx
  on public.listings (is_active, rating_avg desc);
create index listings_active_price_idx
  on public.listings (is_active, price_amount);
create index bookings_provider_status_created_idx
  on public.bookings (provider_id, status, created_at desc);
create index bookings_customer_created_idx
  on public.bookings (customer_id, created_at desc);
create index bookings_listing_id_idx on public.bookings (listing_id);
create index reviews_listing_created_visible_idx
  on public.reviews (listing_id, created_at desc)
  where not is_hidden;
create index reviews_provider_created_visible_idx
  on public.reviews (target_provider_id, created_at desc)
  where not is_hidden;
create index notifications_user_created_idx
  on public.notifications (user_id, created_at desc);
create index notifications_user_unread_idx
  on public.notifications (user_id)
  where read_at is null;

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger cities_set_updated_at
before update on public.cities
for each row execute function public.set_updated_at();
create trigger areas_set_updated_at
before update on public.areas
for each row execute function public.set_updated_at();
create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();
create trigger listings_set_updated_at
before update on public.listings
for each row execute function public.set_updated_at();
create trigger bookings_set_updated_at
before update on public.bookings
for each row execute function public.set_updated_at();

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = 'admin'::public.user_role
  );
$$;

create function public.has_role(requested_role public.user_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.user_roles
      where user_id = auth.uid()
        and role = requested_role
    );
$$;

create function public.is_booking_party(requested_booking_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.bookings
      where id = requested_booking_id
        and (customer_id = auth.uid() or provider_id = auth.uid())
    );
$$;

create function public.is_public_listing(requested_listing_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
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
    join public.profiles provider
      on provider.id = listing.provider_id
      and provider.is_active
    where listing.id = requested_listing_id
      and listing.is_active
  );
$$;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_city_id uuid;
  v_area_id uuid;
  v_requested_area_id uuid;
  v_role public.user_role;
  v_display_name text;
begin
  select id into v_city_id
  from public.cities
  where slug = 'samundri'
    and is_active
  order by name, id
  limit 1;

  if v_city_id is null then
    raise exception 'CITY_UNAVAILABLE';
  end if;

  begin
    v_requested_area_id := nullif(new.raw_user_meta_data ->> 'area_id', '')::uuid;
  exception
    when invalid_text_representation then
      v_requested_area_id := null;
  end;

  select id into v_area_id
  from public.areas
  where id = v_requested_area_id
    and city_id = v_city_id
    and is_active;

  if v_area_id is null then
    select id into v_area_id
    from public.areas
    where city_id = v_city_id
      and is_active
    order by name, id
    limit 1;
  end if;

  if v_area_id is null then
    raise exception 'AREA_UNAVAILABLE';
  end if;

  v_role := case
    when new.raw_user_meta_data ->> 'role' = 'provider'
      then 'provider'::public.user_role
    else 'customer'::public.user_role
  end;
  v_display_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'LocalServe member'
  );

  insert into public.profiles (id, display_name, city_id, area_id)
  values (new.id, v_display_name, v_city_id, v_area_id);

  insert into public.user_roles (user_id, role)
  values (new.id, v_role);

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create view public.profiles_public
with (security_barrier = true, security_invoker = false)
as
select id, display_name, bio, city_id, is_verified
from public.profiles
where is_active;

alter table public.cities enable row level security;
alter table public.areas enable row level security;
alter table public.categories enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.listings enable row level security;
alter table public.bookings enable row level security;
alter table public.reviews enable row level security;
alter table public.notifications enable row level security;

create policy cities_read_active_or_admin
on public.cities
for select to anon, authenticated
using (is_active or public.is_admin());

create policy areas_read_active_or_admin
on public.areas
for select to anon, authenticated
using (
  public.is_admin()
  or (
    is_active
    and exists (
      select 1 from public.cities city
      where city.id = areas.city_id and city.is_active
    )
  )
);

create policy categories_read_active_or_admin
on public.categories
for select to anon, authenticated
using (is_active or public.is_admin());

create policy profiles_read_self_booking_party_or_admin
on public.profiles
for select to authenticated
using (
  id = auth.uid()
  or public.is_admin()
  or exists (
    select 1
    from public.bookings booking
    where booking.status in (
        'accepted'::public.booking_status,
        'in_progress'::public.booking_status,
        'completed'::public.booking_status
      )
      and (
        (booking.customer_id = auth.uid() and booking.provider_id = profiles.id)
        or (booking.provider_id = auth.uid() and booking.customer_id = profiles.id)
      )
  )
);

create policy user_roles_read_self_or_admin
on public.user_roles
for select to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy listings_read_public_owner_or_admin
on public.listings
for select to anon, authenticated
using (
  public.is_public_listing(id)
  or provider_id = auth.uid()
  or public.is_admin()
);

create policy listings_insert_active_provider
on public.listings
for insert to authenticated
with check (
  provider_id = auth.uid()
  and public.has_role('provider'::public.user_role)
  and exists (
    select 1 from public.profiles profile
    where profile.id = auth.uid() and profile.is_active
  )
  and exists (
    select 1 from public.cities city
    where city.id = listings.city_id and city.is_active
  )
  and exists (
    select 1 from public.areas area
    where area.id = listings.area_id
      and area.city_id = listings.city_id
      and area.is_active
  )
  and exists (
    select 1 from public.categories category
    where category.id = listings.category_id and category.is_active
  )
);

create policy listings_update_own_active_provider
on public.listings
for update to authenticated
using (
  provider_id = auth.uid()
  and public.has_role('provider'::public.user_role)
  and exists (
    select 1 from public.profiles profile
    where profile.id = auth.uid() and profile.is_active
  )
)
with check (
  provider_id = auth.uid()
  and public.has_role('provider'::public.user_role)
  and exists (
    select 1 from public.profiles profile
    where profile.id = auth.uid() and profile.is_active
  )
  and exists (
    select 1 from public.cities city
    where city.id = listings.city_id and city.is_active
  )
  and exists (
    select 1 from public.areas area
    where area.id = listings.area_id
      and area.city_id = listings.city_id
      and area.is_active
  )
  and exists (
    select 1 from public.categories category
    where category.id = listings.category_id and category.is_active
  )
);

create policy bookings_read_party_or_admin
on public.bookings
for select to authenticated
using (
  customer_id = auth.uid()
  or provider_id = auth.uid()
  or public.is_admin()
);

create policy reviews_read_visible_author_or_admin
on public.reviews
for select to anon, authenticated
using (
  not is_hidden
  or author_id = auth.uid()
  or public.is_admin()
);

create policy notifications_read_recipient
on public.notifications
for select to authenticated
using (user_id = auth.uid());

revoke all on table
  public.cities,
  public.areas,
  public.categories,
  public.profiles,
  public.user_roles,
  public.listings,
  public.bookings,
  public.reviews,
  public.notifications
from public, anon, authenticated;
revoke all on public.profiles_public from public, anon, authenticated;

grant usage on schema public to anon, authenticated;
grant select on public.cities, public.areas, public.categories, public.listings, public.reviews
  to anon, authenticated;
grant select on public.profiles_public to anon, authenticated;
grant select (
  id, display_name, phone, city_id, area_id, bio, is_verified, is_active,
  created_at, updated_at
) on public.profiles to authenticated;
grant select on public.user_roles, public.bookings, public.notifications
  to authenticated;
grant insert (
  id, provider_id, city_id, area_id, category_id, title, description,
  pricing_type, price_amount, currency, duration_minutes,
  cover_image_path, availability_note, is_active
) on public.listings to authenticated;
grant update (
  city_id, area_id, category_id, title, description, pricing_type,
  price_amount, currency, duration_minutes, cover_image_path,
  availability_note, is_active
) on public.listings to authenticated;

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.is_admin() from public, anon, authenticated;
revoke all on function public.has_role(public.user_role) from public, anon, authenticated;
revoke all on function public.is_booking_party(uuid) from public, anon, authenticated;
revoke all on function public.is_public_listing(uuid) from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.has_role(public.user_role) to anon, authenticated;
grant execute on function public.is_booking_party(uuid) to authenticated;
grant execute on function public.is_public_listing(uuid) to anon, authenticated;

insert into public.cities (name, slug, is_active)
values ('Samundri', 'samundri', true);

insert into public.areas (city_id, name, slug, is_active)
select city.id, seed.name, seed.slug, true
from public.cities city
cross join (
  values
    ('Anarkali Bazaar', 'anarkali-bazaar'),
    ('Babar Town', 'babar-town'),
    ('Canal Town', 'canal-town'),
    ('Jinnah Market', 'jinnah-market')
) as seed(name, slug)
where city.slug = 'samundri';

insert into public.categories (name, slug, sort_order, is_active)
values
  ('Electrician', 'electrician', 1, true),
  ('Plumbing', 'plumbing', 2, true),
  ('AC Repair', 'ac', 3, true),
  ('Cleaning', 'cleaning', 4, true),
  ('Carpentry', 'carpentry', 5, true),
  ('Tutoring', 'tutoring', 6, true),
  ('Home Repair', 'home-repair', 7, true);
