import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "../lib/toast";
import { Eye, Plus, Power, SquarePen } from "lucide-react";

import { useAuth } from "../app/AuthContext";
import { ListingCover } from "../components/listing/ListingCover";
import { supabase } from "../lib/supabase";

type ProviderListing = {
  id: string;
  title: string;
  description: string;
  category_id: string;
  area_id: string;
  price_amount: number;
  pricing_type: "hourly" | "fixed";
  cover_image_path: string | null;
  is_active: boolean;
  rating_avg: number;
  rating_count: number;
  created_at: string;
};

async function loadProviderListings(providerId: string) {
  const { data, error } = await supabase
    .from("listings")
    .select(
      "id, title, description, category_id, area_id, price_amount, pricing_type, cover_image_path, is_active, rating_avg, rating_count, created_at",
    )
    .eq("provider_id", providerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ProviderListing[];
}

export function ProviderListingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const listingsQuery = useQuery({
    queryKey: ["provider", "listings", user?.id],
    queryFn: () => loadProviderListings(user!.id),
    enabled: Boolean(user),
  });

  async function deactivate(listingId: string) {
    const { error } = await supabase
      .from("listings")
      .update({ is_active: false })
      .eq("id", listingId)
      .eq("provider_id", user!.id);
    if (error) {
      toast.error("Could not deactivate this listing.");
      return;
    }
    toast.success("Listing deactivated.");
    await queryClient.invalidateQueries({
      queryKey: ["provider", "listings", user!.id],
    });
    await queryClient.invalidateQueries({ queryKey: ["listings"] });
  }

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-cream-100 pb-6">
        <div className="fade-up">
          <p className="text-xs font-semibold uppercase text-slate-600">
            Provider workspace
          </p>
          <h1 className="mt-2 text-3xl font-semibold">My listings</h1>
          <p className="mt-2 max-w-xl text-sm text-slate-600">
            Keep your services current and easy for local customers to find.
          </p>
        </div>
        <Link
          to="/provider/listings/new"
          className="press inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal-600 px-4 font-medium text-white transition hover:bg-teal-700 active:scale-[0.98]"
        >
          <Plus size={18} aria-hidden="true" /> Add a new listing
        </Link>
      </header>

      {listingsQuery.isPending ? (
        <div
          className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          role="status"
          aria-label="Loading your listings"
        >
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="skeleton fade-up overflow-hidden rounded-xl border border-cream-100 bg-white"
            >
              <div className="aspect-[16/9] animate-pulse bg-cream-100" />
              <div className="space-y-3 p-5">
                <div className="h-5 w-3/4 animate-pulse rounded bg-cream-100" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-cream-100" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-cream-100" />
                <div className="mt-5 h-11 animate-pulse rounded-lg bg-cream-100" />
              </div>
            </div>
          ))}
        </div>
      ) : listingsQuery.isError ? (
        <div
          className="fade-up mt-6 rounded-xl border border-rose-600/20 bg-white p-5"
          role="alert"
        >
          <p className="text-sm text-slate-600">
            Your listings could not be loaded.
          </p>
          <button
            type="button"
            onClick={() => void listingsQuery.refetch()}
            className="press mt-3 min-h-11 rounded-lg border border-ink/20 px-4 text-sm font-medium transition hover:bg-cream-50 active:scale-[0.98]"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="mt-6 grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {listingsQuery.data?.length ? (
            listingsQuery.data.map((listing) => (
              <article
                key={listing.id}
                className="card-hover fade-up relative flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border border-cream-100 bg-white shadow-sm transition-shadow duration-200 hover:-translate-y-1 hover:shadow-md"
              >
                <Link
                  to={`/listings/${listing.id}`}
                  aria-label={`Open ${listing.title}`}
                  className="absolute inset-0 z-10 rounded-xl focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1DBF73]"
                >
                  <span className="sr-only">Open {listing.title}</span>
                </Link>
                <div className="group pointer-events-none aspect-[16/9] overflow-hidden rounded-t-xl">
                  <ListingCover
                    path={listing.cover_image_path}
                    title={listing.title}
                    className="size-full"
                    imageClassName="transition duration-500 group-hover:scale-[1.025]"
                  />
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="line-clamp-2 min-h-12 min-w-0 flex-1 font-semibold leading-6">
                      {listing.title}
                    </h2>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${listing.is_active ? "bg-teal-50 text-teal-700" : "bg-cream-100 text-slate-600"}`}
                    >
                      {listing.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <p className="mt-3 text-sm font-medium text-ink">
                    Starting at Rs.{" "}
                    {new Intl.NumberFormat("en-PK", {
                      maximumFractionDigits: 0,
                    }).format(Number(listing.price_amount))}
                    <span className="font-normal text-slate-600">
                      {listing.pricing_type === "hourly" ? " / hr" : " fixed"}
                    </span>
                  </p>
                  <p className="mt-2 min-h-5 text-sm text-slate-600">
                    {listing.rating_count
                      ? `★ ${Number(listing.rating_avg).toFixed(1)} (${listing.rating_count})`
                      : "New"}
                  </p>

                  <div className="relative z-20 mt-auto flex flex-wrap gap-2 pt-5">
                    <Link
                      to={`/provider/listings/${listing.id}/edit`}
                      className="press inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-ink/20 px-3 text-sm font-medium transition hover:bg-cream-50 active:scale-[0.98]"
                    >
                      <SquarePen size={16} aria-hidden="true" /> Edit
                    </Link>
                    <Link
                      to={`/listings/${listing.id}`}
                      className="press inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-ink/20 px-3 text-sm font-medium transition hover:bg-cream-50 active:scale-[0.98]"
                    >
                      <Eye size={16} aria-hidden="true" /> View
                    </Link>
                    {listing.is_active && (
                      <button
                        type="button"
                        onClick={() => void deactivate(listing.id)}
                        aria-label={`Deactivate ${listing.title}`}
                        title="Deactivate listing"
                        className="press grid min-h-11 min-w-11 place-items-center rounded-lg border border-rose-600/30 text-rose-600 transition hover:bg-rose-600/5 active:scale-[0.98]"
                      >
                        <Power size={18} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="fade-up rounded-xl border border-cream-100 bg-white p-6 sm:col-span-2 sm:p-8 lg:col-span-3">
              <div className="mx-auto max-w-md text-center">
                <span className="mx-auto grid size-12 place-items-center rounded-full bg-cream-100 text-teal-700">
                  <Plus size={22} aria-hidden="true" />
                </span>
                <h2 className="mt-4 text-lg font-semibold">No listings yet</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Add your first service to start connecting with customers in
                  your area.
                </p>
              </div>
            </div>
          )}

          <Link
            to="/provider/listings/new"
            className="card-hover fade-up press flex min-h-[300px] h-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-400/60 bg-white p-6 text-center transition hover:-translate-y-1 hover:border-teal-600 hover:bg-teal-50 active:scale-[0.99]"
          >
            <span className="grid size-12 place-items-center rounded-full bg-cream-100 text-teal-700">
              <Plus size={23} aria-hidden="true" />
            </span>
            <span className="mt-4 font-semibold">Add a new listing</span>
            <span className="mt-1 text-sm text-slate-600">
              Create another service offering
            </span>
          </Link>
        </div>
      )}
    </div>
  );
}
