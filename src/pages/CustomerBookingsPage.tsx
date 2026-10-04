import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Link } from "react-router-dom";

import { useAuth } from "../app/AuthContext";
import { BookingStatusBadge } from "../components/booking/BookingStatusBadge";
import { supabase } from "../lib/supabase";
import { formatBookingPrice, type BookingStatus } from "../lib/booking";

type FilterKey = "all" | "waiting" | "confirmed" | "completed" | "cancelled";

type CustomerBooking = {
  id: string;
  status: BookingStatus;
  scheduled_start: string;
  snapshot_title: string;
  snapshot_price_amount: number;
  snapshot_currency: string;
};

const filters: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "waiting", label: "Waiting" },
  { key: "confirmed", label: "Confirmed" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

function includesFilter(status: BookingStatus, filter: FilterKey) {
  if (filter === "all") return true;
  if (filter === "waiting") return status === "requested";
  if (filter === "confirmed")
    return status === "accepted" || status === "in_progress";
  if (filter === "completed") return status === "completed";
  return (
    status === "cancelled_by_customer" ||
    status === "cancelled_by_provider" ||
    status === "declined"
  );
}

export function CustomerBookingsPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<FilterKey>("all");
  const bookingsQuery = useQuery({
    queryKey: ["bookings", "customer", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          "id, status, scheduled_start, snapshot_title, snapshot_price_amount, snapshot_currency",
        )
        .eq("customer_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CustomerBooking[];
    },
  });

  const bookings = bookingsQuery.data ?? [];
  const visibleBookings = bookings.filter((booking) =>
    includesFilter(booking.status, filter),
  );

  return (
    <section className="shell-container py-8 md:py-10">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-cream-100 pb-5">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-600">
            Customer
          </p>
          <h1 className="mt-1 text-3xl font-semibold">My bookings</h1>
        </div>
      </header>

      <div className="mt-5 flex flex-wrap gap-2" aria-label="Filter bookings">
        {filters.map((item) => (
          <button
            key={item.key}
            type="button"
            aria-pressed={filter === item.key}
            onClick={() => setFilter(item.key)}
            className={`min-h-10 rounded-full border px-4 text-sm font-medium ${
              filter === item.key
                ? "border-teal-600 bg-teal-600 text-white"
                : "border-ink/15 bg-white text-ink hover:bg-cream-100"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {bookingsQuery.isPending ? (
        <div
          className="mt-6 space-y-3"
          role="status"
          aria-label="Loading bookings"
        >
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-28 animate-pulse rounded-xl bg-white"
            />
          ))}
        </div>
      ) : bookingsQuery.isError ? (
        <div
          className="mt-6 rounded-xl border border-rose-600/20 bg-white p-5"
          role="alert"
        >
          <p className="font-medium">Bookings couldn’t be loaded.</p>
          <button
            type="button"
            onClick={() => void bookingsQuery.refetch()}
            className="mt-3 min-h-11 rounded-lg border border-ink/20 px-4 text-sm font-medium hover:bg-cream-50"
          >
            Try again
          </button>
        </div>
      ) : bookings.length === 0 ? (
        <div className="mt-6 rounded-xl border border-cream-100 bg-white p-7">
          <h2 className="font-semibold">No bookings yet</h2>
          <p className="mt-1 text-sm text-slate-600">
            Your service requests will appear here.
          </p>
          <Link
            to="/search"
            className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-teal-600 px-5 text-sm font-medium text-white hover:bg-teal-700"
          >
            Find a service
          </Link>
        </div>
      ) : visibleBookings.length === 0 ? (
        <p className="mt-6 rounded-xl border border-cream-100 bg-white p-6 text-sm text-slate-600">
          No bookings match this filter.
        </p>
      ) : (
        <div className="mt-6 divide-y divide-cream-100 rounded-xl border border-cream-100 bg-white">
          {visibleBookings.map((booking) => (
            <Link
              key={booking.id}
              to={`/bookings/${booking.id}`}
              className="grid gap-3 p-4 transition hover:bg-cream-50 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center md:px-5"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate font-semibold">
                    {booking.snapshot_title}
                  </h2>
                  <BookingStatusBadge
                    status={booking.status}
                    viewer="customer"
                  />
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {format(new Date(booking.scheduled_start), "PPP 'at' p")}
                </p>
              </div>
              <p className="font-semibold">
                {formatBookingPrice(
                  booking.snapshot_price_amount,
                  booking.snapshot_currency,
                )}
              </p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
