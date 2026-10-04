create or replace function public.get_booking_customer_names(
  p_booking_ids uuid[]
)
returns table (
  booking_id uuid,
  customer_display_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select b.id, customer.display_name
  from public.bookings b
  join public.profiles customer on customer.id = b.customer_id
  where auth.uid() is not null
    and b.id = any(coalesce(p_booking_ids, array[]::uuid[]))
    and (b.customer_id = auth.uid() or b.provider_id = auth.uid());
$$;

revoke all on function public.get_booking_customer_names(uuid[]) from public, anon;
grant execute on function public.get_booking_customer_names(uuid[]) to authenticated;
