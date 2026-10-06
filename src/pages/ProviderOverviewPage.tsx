import { useQuery } from "@tanstack/react-query";
import { startOfMonth } from "date-fns";
import {
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  Inbox,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useAuth } from "../app/AuthContext";
import { supabase } from "../lib/supabase";

export default function ProviderOverviewPage() {
  const { user, profile, profileError, loading: authLoading } = useAuth();

  const listingsQuery = useQuery({
    queryKey: ["provider", "listings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select(
          "id, title, description, category_id, area_id, price_amount, pricing_type, cover_image_path, is_active, rating_avg, rating_count, created_at",
        )
        .eq("provider_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: Boolean(user),
  });

  const bookingsQuery = useQuery({
    queryKey: ["provider-hub", "bookings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          "id, customer_id, status, scheduled_start, scheduled_end, completed_at, address_text, notes, snapshot_title, snapshot_price_amount, snapshot_currency, decline_reason, cancel_reason",
        )
        .eq("provider_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: Boolean(user),
  });

  if (authLoading) {
    return (
      <div className="min-w-0 py-4" role="status">
        Loading provider overview...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-w-0 py-4">Provider details are unavailable.</div>
    );
  }

  if (
    profileError ||
    !profile ||
    listingsQuery.isError ||
    bookingsQuery.isError
  ) {
    return (
      <div className="min-w-0 py-4">Provider details are unavailable.</div>
    );
  }

  if (listingsQuery.isPending || bookingsQuery.isPending) {
    return (
      <div className="min-w-0 py-4" role="status">
        Loading provider overview...
      </div>
    );
  }

  const listings = listingsQuery.data ?? [];
  const bookings = bookingsQuery.data ?? [];
  const monthStart = startOfMonth(new Date());
  const stats = [
    {
      label: "Active listings",
      value: listings.filter((listing) => listing.is_active).length,
      Icon: BriefcaseBusiness,
    },
    {
      label: "New requests",
      value: bookings.filter((booking) => booking.status === "requested")
        .length,
      Icon: Inbox,
    },
    {
      label: "Upcoming",
      value: bookings.filter(
        (booking) =>
          booking.status === "accepted" || booking.status === "in_progress",
      ).length,
      Icon: CalendarClock,
    },
    {
      label: "Completed this month",
      value: bookings.filter(
        (booking) =>
          booking.status === "completed" &&
          booking.completed_at !== null &&
          new Date(booking.completed_at).getTime() >= monthStart.getTime(),
      ).length,
      Icon: CheckCircle2,
    },
  ];

  return (
    <div className="min-w-0">
      <header>
        <h2 className="text-xl font-semibold text-slate-900">Overview</h2>
        <p className="mt-1 text-sm text-slate-500">
          A quick look at your services and bookings.
        </p>
      </header>

      <div className="mt-5 grid grid-cols-2 gap-4">
        {stats.map(({ label, value, Icon }) => (
          <article
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
          >
            <span className="grid size-9 place-items-center rounded-lg bg-[#E3F7EC] text-[#168A55]">
              <Icon size={18} aria-hidden="true" />
            </span>
            <p className="mt-4 text-2xl font-semibold text-slate-900">
              {value}
            </p>
            <p className="mt-1 text-sm text-slate-500">{label}</p>
          </article>
        ))}
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h3 className="text-base font-semibold text-slate-900">About me</h3>
        {profile.bio?.trim() ? (
          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">
            {profile.bio}
          </p>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            Add a bio in your account.{" "}
            <Link
              to="/account"
              className="font-medium text-[#168A55] underline underline-offset-2 hover:text-[#116B42]"
            >
              Edit profile
            </Link>
          </p>
        )}
      </section>
    </div>
  );
}
