import { useQuery } from "@tanstack/react-query";
import { startOfMonth } from "date-fns";
import {
  BadgeCheck,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  LayoutDashboard,
  Inbox,
  Pencil,
  Star,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useAuth } from "../app/AuthContext";
import { supabase } from "../lib/supabase";

export default function ProviderHubPage() {
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

  const reviewsQuery = useQuery({
    queryKey: ["provider-hub", "reviews", user?.id],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from("reviews")
        .select("id, author_id, rating, comment, created_at", {
          count: "exact",
        })
        .eq("target_provider_id", user!.id)
        .eq("is_hidden", false)
        .order("created_at", { ascending: false })
        .range(0, 999);
      if (error) throw error;

      const rows = data ?? [];
      const reviewCount = count ?? rows.length;
      return {
        count: reviewCount,
        average:
          reviewCount <= rows.length && rows.length > 0
            ? rows.reduce((total, review) => total + review.rating, 0) /
              rows.length
            : null,
      };
    },
    enabled: Boolean(user),
  });

  const pageClassName = "mx-auto w-full max-w-6xl px-4 py-8 sm:px-6";

  if (authLoading) {
    return (
      <div className={pageClassName} role="status">
        Loading provider overview...
      </div>
    );
  }

  if (!user) {
    return (
      <div className={pageClassName}>Provider details are unavailable.</div>
    );
  }

  if (
    profileError ||
    !profile ||
    listingsQuery.isError ||
    bookingsQuery.isError ||
    reviewsQuery.isError
  ) {
    return (
      <div className={pageClassName}>Provider details are unavailable.</div>
    );
  }

  if (
    listingsQuery.isPending ||
    bookingsQuery.isPending ||
    reviewsQuery.isPending
  ) {
    return (
      <div className={pageClassName} role="status">
        Loading provider overview...
      </div>
    );
  }

  const listings = listingsQuery.data ?? [];
  const bookings = bookingsQuery.data ?? [];
  const reviewCount = reviewsQuery.data.count;
  const averageRating = reviewsQuery.data.average;
  const monthStart = startOfMonth(new Date());
  const displayName = profile.display_name.trim() || "Provider";
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
  const navigation = [
    { label: "Overview", to: "/provider", Icon: LayoutDashboard },
    { label: "My listings", to: "/provider/listings", Icon: BriefcaseBusiness },
    { label: "Requests", to: "/provider/requests", Icon: Inbox },
    { label: "Edit profile", to: "/account", Icon: Pencil },
    {
      label: "View public profile",
      to: `/providers/${user.id}`,
      Icon: ExternalLink,
    },
  ];

  return (
    <div className={pageClassName}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="min-w-0 space-y-3">
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex flex-col items-center text-center">
              <div className="mx-auto grid size-[88px] place-items-center rounded-full bg-[#E3F7EC] text-3xl font-semibold text-[#168A55]">
                {displayName.slice(0, 1).toUpperCase() || "P"}
              </div>
              <h1 className="mt-4 text-lg font-semibold text-slate-900">
                {displayName}
              </h1>
              <p className="mt-0.5 text-sm text-slate-500">Provider</p>

              {profile.is_verified && (
                <span className="mt-3 inline-flex h-7 items-center gap-1.5 rounded-full bg-[#E3F7EC] px-2.5 text-xs font-medium text-[#168A55]">
                  <BadgeCheck size={14} aria-hidden="true" />
                  Verified
                </span>
              )}

              <div className="mt-4 flex items-center justify-center gap-2">
                {reviewCount > 0 ? (
                  <>
                    <span
                      className="inline-flex items-center gap-0.5"
                      role="img"
                      aria-label="5 stars"
                    >
                      {Array.from({ length: 5 }, (_, index) => (
                        <Star
                          key={index}
                          size={15}
                          className="fill-amber-400 text-amber-400"
                          aria-hidden="true"
                        />
                      ))}
                    </span>
                    <span className="text-sm font-medium text-slate-900">
                      {averageRating?.toFixed(1) ?? "—"}
                    </span>
                    <span className="text-sm text-slate-500">
                      ({reviewCount})
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-slate-500">
                    No reviews yet
                  </span>
                )}
              </div>
            </div>

            <nav
              className="mt-6 hidden space-y-1 border-t border-slate-200 pt-4 lg:block"
              aria-label="Provider navigation"
            >
              {navigation.map(({ label, to, Icon }, index) => (
                <Link
                  key={label}
                  to={to}
                  aria-current={index === 0 ? "page" : undefined}
                  className={`flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors ${
                    index === 0
                      ? "bg-[#E3F7EC] font-medium text-[#168A55]"
                      : "text-slate-700 hover:bg-[#F0FAF4]"
                  }`}
                >
                  <Icon size={17} aria-hidden="true" />
                  {label}
                </Link>
              ))}
            </nav>
          </section>

          <nav
            className="flex w-full max-w-full min-w-0 flex-nowrap gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:hidden"
            aria-label="Provider navigation"
          >
            {navigation.map(({ label, to, Icon }, index) => (
              <Link
                key={label}
                to={to}
                aria-current={index === 0 ? "page" : undefined}
                className={`inline-flex h-9 shrink-0 whitespace-nowrap items-center gap-2 rounded-lg px-3.5 text-sm transition-colors ${
                  index === 0
                    ? "bg-[#E3F7EC] font-medium text-[#168A55]"
                    : "bg-white text-slate-700 hover:bg-[#F0FAF4]"
                }`}
              >
                <Icon size={16} aria-hidden="true" />
                {label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="min-w-0">
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
        </main>
      </div>
    </div>
  );
}
