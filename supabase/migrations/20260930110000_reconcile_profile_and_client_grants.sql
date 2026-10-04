-- Reconcile the hosted profile view, profile/review policies, and client grants
-- with the repository's least-privilege design. This migration is not deployed
-- automatically; review and apply it only to an approved non-production DB.

create or replace view public.profiles_public
with (security_barrier = true, security_invoker = false)
as
select id, display_name, bio, city_id, is_verified
from public.profiles
where is_active;

revoke all on public.profiles_public from public, anon, authenticated;
grant select on public.profiles_public to anon, authenticated;

drop policy if exists profiles_read_self_booking_party_or_admin
  on public.profiles;
drop policy if exists profiles_select_self_or_admin
  on public.profiles;
drop policy if exists profiles_update_self
  on public.profiles;
drop policy if exists profiles_select_self_booking_party_or_admin
  on public.profiles;

create policy profiles_select_self_booking_party_or_admin
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

drop policy if exists reviews_read_visible_author_or_admin
  on public.reviews;
drop policy if exists reviews_select_admin
  on public.reviews;
drop policy if exists reviews_select_author
  on public.reviews;
drop policy if exists reviews_select_visible
  on public.reviews;
drop policy if exists reviews_select_visible_or_author_or_admin
  on public.reviews;
drop policy if exists reviews_read_visible_author_admin
  on public.reviews;

create policy reviews_read_visible_author_admin
on public.reviews
for select to anon, authenticated
using (
  not is_hidden
  or author_id = auth.uid()
  or public.is_admin()
);

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

grant usage on schema public to anon, authenticated;
grant select on public.cities, public.areas, public.categories,
  public.listings, public.reviews
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

revoke all on function public.set_updated_at()
  from public, anon, authenticated, service_role;
revoke all on function public.handle_new_user()
  from public, anon, authenticated, service_role;
revoke all on function public.is_admin()
  from public, anon, authenticated, service_role;
revoke all on function public.has_role(public.user_role)
  from public, anon, authenticated, service_role;
revoke all on function public.is_booking_party(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.is_public_listing(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.create_booking(uuid, timestamptz, timestamptz, text, text)
  from public, anon, authenticated, service_role;
revoke all on function public.accept_booking(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.decline_booking(uuid, text)
  from public, anon, authenticated, service_role;
revoke all on function public.cancel_booking(uuid, text)
  from public, anon, authenticated, service_role;
revoke all on function public.complete_booking(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.add_marketplace_role(public.user_role)
  from public, anon, authenticated, service_role;
revoke all on function public.update_account_profile(text, text, uuid, text)
  from public, anon, authenticated, service_role;
revoke all on function public.submit_review(uuid, smallint, text)
  from public, anon, authenticated, service_role;
revoke all on function public.mark_notifications_read(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.get_booking_customer_names(uuid[])
  from public, anon, authenticated, service_role;
revoke all on function public.get_public_provider_profiles(uuid[], uuid, uuid, text)
  from public, anon, authenticated, service_role;
revoke all on function public.admin_set_listing_active(uuid, boolean)
  from public, anon, authenticated, service_role;
revoke all on function public.admin_set_profile_active(uuid, boolean)
  from public, anon, authenticated, service_role;
revoke all on function public.admin_set_review_visible(uuid, boolean)
  from public, anon, authenticated, service_role;
revoke all on function public.admin_set_profile_verified(uuid, boolean)
  from public, anon, authenticated, service_role;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.has_role(public.user_role) to anon, authenticated;
grant execute on function public.is_booking_party(uuid) to authenticated;
grant execute on function public.is_public_listing(uuid) to anon, authenticated;
grant execute on function public.create_booking(uuid, timestamptz, timestamptz, text, text)
  to authenticated;
grant execute on function public.accept_booking(uuid) to authenticated;
grant execute on function public.decline_booking(uuid, text) to authenticated;
grant execute on function public.cancel_booking(uuid, text) to authenticated;
grant execute on function public.complete_booking(uuid) to authenticated;
grant execute on function public.add_marketplace_role(public.user_role)
  to authenticated;
grant execute on function public.update_account_profile(text, text, uuid, text)
  to authenticated;
grant execute on function public.submit_review(uuid, smallint, text)
  to authenticated;
grant execute on function public.mark_notifications_read(uuid)
  to authenticated;
grant execute on function public.get_booking_customer_names(uuid[])
  to authenticated;
grant execute on function public.get_public_provider_profiles(uuid[], uuid, uuid, text)
  to anon, authenticated;
grant execute on function public.admin_set_listing_active(uuid, boolean)
  to authenticated;
grant execute on function public.admin_set_profile_active(uuid, boolean)
  to authenticated;
grant execute on function public.admin_set_review_visible(uuid, boolean)
  to authenticated;
grant execute on function public.admin_set_profile_verified(uuid, boolean)
  to authenticated;