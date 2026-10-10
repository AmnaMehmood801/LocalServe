import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Search } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../app/AuthContext";
import { Avatar } from "../components/Avatar";
import { supabase } from "../lib/supabase";

type MemberHomeSectionProps = {
  avatarPath: string | null;
  displayName: string;
};

function WelcomeBand({ avatarPath, displayName }: MemberHomeSectionProps) {
  return (
    <div className="flex flex-col items-center gap-4 bg-[#E3F7EC] px-6 py-8 text-center sm:flex-row sm:text-left">
      <Avatar avatarPath={avatarPath} name={displayName} size={80} />
      <h1 className="text-2xl font-semibold text-[#404145]">
        Welcome back, {displayName}
      </h1>
    </div>
  );
}

function CustomerHome({ avatarPath, displayName }: MemberHomeSectionProps) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState("");
  const bookingsQuery = useQuery({
    queryKey: ["bookings", "customer-home", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, status, scheduled_start, snapshot_title")
        .eq("customer_id", user!.id)
        .in("status", ["requested", "accepted", "in_progress"]);
      if (error) throw error;
      return data ?? [];
    },
  });
  const categoriesQuery = useQuery({
    queryKey: ["catalog", "active-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
  const activeBooking = (bookingsQuery.data ?? [])
    .filter(
      (booking) =>
        (booking.status === "accepted" || booking.status === "in_progress") &&
        new Date(booking.scheduled_start).getTime() >= Date.now(),
    )
    .sort(
      (first, second) =>
        new Date(first.scheduled_start).getTime() -
        new Date(second.scheduled_start).getTime(),
    )[0];
  const pendingRequestCount = (bookingsQuery.data ?? []).filter(
    (booking) => booking.status === "requested",
  ).length;
  const profileFields = [
    { label: "display name", complete: Boolean(profile?.display_name.trim()) },
    { label: "phone number", complete: Boolean(profile?.phone?.trim()) },
    { label: "service area", complete: Boolean(profile?.area_id?.trim()) },
    { label: "city", complete: Boolean(profile?.city_id?.trim()) },
    { label: "profile photo", complete: Boolean(avatarPath?.trim()) },
  ];
  const completedFields = profileFields.filter((field) => field.complete).length;
  const profilePercent = Math.round(
    (completedFields / profileFields.length) * 100,
  );
  const firstMissingField = profileFields.find((field) => !field.complete);

  return (
    <main className="shell-container py-8">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-[#E3F7EC]">
        <WelcomeBand avatarPath={avatarPath} displayName={displayName} />
      </section>

      <div className="mt-6 space-y-5">
        <form
          className="flex min-w-0 gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const keyword = searchText.trim();
            navigate(keyword ? `/search?q=${encodeURIComponent(keyword)}` : "/search");
          }}
        >
          <label htmlFor="member-home-search" className="sr-only">
            Search services
          </label>
          <input
            id="member-home-search"
            type="search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="What service do you need?"
            className="h-12 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm text-[#404145] placeholder:text-slate-500 focus:border-[#19A463] focus:outline-none focus:ring-2 focus:ring-[#1DBF73]/25"
          />
          <button
            type="submit"
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#1DBF73] px-4 text-sm font-semibold text-white transition hover:bg-[#19A463] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1DBF73]/25"
          >
            <Search size={17} aria-hidden="true" />
            <span>Search</span>
          </button>
        </form>

        <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-3">
          {bookingsQuery.isPending ? (
            <>
              <div
                className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white motion-reduce:animate-none"
                role="status"
                aria-label="Loading bookings"
              />
              <div
                aria-hidden="true"
                className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white motion-reduce:animate-none"
              />
            </>
          ) : bookingsQuery.isError ? (
            <p className="text-sm text-slate-500" role="alert">
              Bookings are temporarily unavailable.
            </p>
          ) : (
            <>
              <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-xs text-slate-500">Active booking</p>
                {activeBooking ? (
                  <Link
                    to={`/bookings/${activeBooking.id}`}
                    className="mt-2 block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#19A463]"
                  >
                    <h2 className="truncate font-semibold text-[#404145]">
                      {activeBooking.snapshot_title}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {format(
                        new Date(activeBooking.scheduled_start),
                        "PPP 'at' p",
                      )}
                    </p>
                    <span className="mt-3 inline-flex rounded-full bg-[#E3F7EC] px-2.5 py-1 text-xs font-semibold text-[#168A55]">
                      {activeBooking.status === "in_progress"
                        ? "In progress"
                        : "Accepted"}
                    </span>
                  </Link>
                ) : (
                  <>
                    <p className="mt-2 font-semibold text-[#404145]">
                      No active booking yet
                    </p>
                    <Link
                      to="/search"
                      className="mt-3 inline-flex text-xs font-semibold text-[#168A55] hover:underline"
                    >
                      Find a service
                    </Link>
                  </>
                )}
              </section>

              <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-xs text-slate-500">Pending requests</p>
                <p className="mt-2 font-semibold text-[#404145]">
                  {pendingRequestCount > 0
                    ? `${pendingRequestCount} waiting for reply`
                    : "No pending requests"}
                </p>
                <Link
                  to="/bookings"
                  className="mt-3 inline-flex text-xs font-semibold text-[#168A55] hover:underline"
                >
                  View bookings
                </Link>
              </section>
            </>
          )}

          <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-[#404145]">Profile progress</h2>
            <span className="text-sm font-semibold text-[#404145]">
              {profilePercent}%
            </span>
          </div>
          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-[#E6E9EC]"
            role="progressbar"
            aria-label="Profile completion"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={profilePercent}
          >
            <div
              className="h-full rounded-full bg-[#1DBF73] transition-[width]"
              style={{ width: `${profilePercent}%` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-500">
              {firstMissingField
                ? `Add your ${firstMissingField.label} to complete your profile.`
                : "Profile complete"}
            </p>
            <Link
              to="/account"
              className="text-xs font-semibold text-[#168A55] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#19A463]"
            >
              Edit profile
            </Link>
          </div>
          </section>
        </div>

        {!categoriesQuery.isError && (categoriesQuery.data?.length ?? 0) > 0 && (
          <section className="min-w-0">
            <h2 className="font-semibold text-[#404145]">Popular categories</h2>
            <div className="mt-3 max-w-full overflow-x-auto overscroll-x-contain">
              <div className="flex w-max min-w-full gap-2 pb-1">
                {categoriesQuery.data?.map((category) => (
                  <Link
                    key={category.id}
                    to={`/search?categoryId=${encodeURIComponent(category.id)}`}
                    className="inline-flex min-h-10 shrink-0 items-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-[#404145] transition hover:border-[#19A463] hover:bg-[#E3F7EC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#19A463]"
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

export function MemberHomePage() {
  const { user, profile, displayName, roles, loading } = useAuth();
  const { data: avatarPath = null } = useQuery({
    queryKey: ["profile-avatar", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("avatar_path")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data?.avatar_path ?? null;
    },
  });

  if (loading) {
    return (
      <main className="shell-container py-8" role="status">
        <div className="h-36 animate-pulse rounded-2xl bg-slate-100 motion-reduce:animate-none" />
        <span className="sr-only">Loading your home...</span>
      </main>
    );
  }

  if (roles.includes("admin")) return <Navigate to="/admin" replace />;
  if (roles.includes("provider")) {
    return <Navigate to="/provider/requests" replace />;
  }

  const name =
    displayName?.trim() || profile?.display_name?.trim() || "Member";
  const memberProps = { avatarPath, displayName: name };

  return <CustomerHome {...memberProps} />;
}
