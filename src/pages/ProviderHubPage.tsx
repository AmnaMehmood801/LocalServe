import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  BriefcaseBusiness,
  ExternalLink,
  LayoutDashboard,
  Inbox,
  Pencil,
  Star,
} from "lucide-react";
import { Link, NavLink, Outlet } from "react-router-dom";

import { useAuth } from "../app/AuthContext";
import { supabase } from "../lib/supabase";

export default function ProviderHubPage() {
  const { user, profile, profileError, loading: authLoading } = useAuth();

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

  if (profileError || !profile || reviewsQuery.isError) {
    return (
      <div className={pageClassName}>Provider details are unavailable.</div>
    );
  }

  if (reviewsQuery.isPending) {
    return (
      <div className={pageClassName} role="status">
        Loading provider overview...
      </div>
    );
  }

  const reviewCount = reviewsQuery.data.count;
  const averageRating = reviewsQuery.data.average;
  const displayName = profile.display_name.trim() || "Provider";
  const routeNavigation = [
    { label: "Overview", to: "/provider", Icon: LayoutDashboard, end: true },
    { label: "My listings", to: "/provider/listings", Icon: BriefcaseBusiness },
    { label: "Requests", to: "/provider/requests", Icon: Inbox },
  ];
  const profileNavigation = [
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
                  <span className="text-sm text-slate-500">No reviews yet</span>
                )}
              </div>
            </div>

            <nav
              className="mt-6 hidden space-y-1 border-t border-slate-200 pt-4 lg:block"
              aria-label="Provider navigation"
            >
              {routeNavigation.map(({ label, to, Icon, end }) => (
                <NavLink
                  key={label}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors ${
                      isActive
                        ? "bg-[#E3F7EC] font-medium text-[#168A55]"
                        : "text-slate-700 hover:bg-[#F0FAF4]"
                    }`
                  }
                >
                  <Icon size={17} aria-hidden="true" />
                  {label}
                </NavLink>
              ))}
              {profileNavigation.map(({ label, to, Icon }) => (
                <Link
                  key={label}
                  to={to}
                  className="flex h-10 items-center gap-3 rounded-lg px-3 text-sm text-slate-700 transition-colors hover:bg-[#F0FAF4]"
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
            {routeNavigation.map(({ label, to, Icon, end }) => (
              <NavLink
                key={label}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `inline-flex h-9 shrink-0 whitespace-nowrap items-center gap-2 rounded-lg px-3.5 text-sm transition-colors ${
                    isActive
                      ? "bg-[#E3F7EC] font-medium text-[#168A55]"
                      : "bg-white text-slate-700 hover:bg-[#F0FAF4]"
                  }`
                }
              >
                <Icon size={16} aria-hidden="true" />
                {label}
              </NavLink>
            ))}
            {profileNavigation.map(({ label, to, Icon }) => (
              <Link
                key={label}
                to={to}
                className="inline-flex h-9 shrink-0 whitespace-nowrap items-center gap-2 rounded-lg bg-white px-3.5 text-sm text-slate-700 transition-colors hover:bg-[#F0FAF4]"
              >
                <Icon size={16} aria-hidden="true" />
                {label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
