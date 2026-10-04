import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Link, useParams } from "react-router-dom";
import { Wrench } from "lucide-react";

import { useAuth } from "../app/AuthContext";
import type { ListingCardData } from "../components/listing/ListingCard";
import { ListingCover } from "../components/listing/ListingCover";
import { fetchPublicProviderProfiles } from "../lib/catalog";
import { supabase } from "../lib/supabase";

type ListingDetail = ListingCardData & {
  provider_id: string;
  description: string;
  availability_note: string | null;
  providerBio: string | null;
  areaName: string;
  cityName: string;
  isActive: boolean;
};

type ListingReview = {
  id: string;
  author_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  authorName: string;
};

async function loadListingReviews(listingId: string): Promise<ListingReview[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("id, author_id, rating, comment, created_at")
    .eq("listing_id", listingId)
    .eq("is_hidden", false)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;

  const reviews = (data ?? []) as Omit<ListingReview, "authorName">[];
  if (reviews.length === 0) return [];

  const authorIds = [...new Set(reviews.map((review) => review.author_id))];
  const { data: profiles, error: profileError } = await supabase
    .from("profiles_public")
    .select("id, display_name")
    .in("id", authorIds);
  if (profileError) throw profileError;

  const authors = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile.display_name]),
  );
  return reviews.map((review) => ({
    ...review,
    authorName: authors.get(review.author_id) ?? "Local customer",
  }));
}

async function loadListingDetail(
  listingId: string,
): Promise<ListingDetail | null> {
  const { data: row, error } = await supabase
    .from("listings")
    .select(
      "id, provider_id, city_id, area_id, category_id, title, description, pricing_type, price_amount, cover_image_path, availability_note, is_active, rating_avg, rating_count",
    )
    .eq("id", listingId)
    .maybeSingle();

  if (error) throw error;
  if (!row) return null;

  const [categoryResult, cityResult, areaResult, profiles] =
    await Promise.all([
      supabase
        .from("categories")
        .select("name")
        .eq("id", row.category_id)
        .maybeSingle(),
      supabase
        .from("cities")
        .select("name")
        .eq("id", row.city_id)
        .maybeSingle(),
      supabase.from("areas").select("name").eq("id", row.area_id).maybeSingle(),
      fetchPublicProviderProfiles({
        providerIds: [row.provider_id],
        cityId: row.city_id,
        areaId: row.area_id,
      }),
    ]);

  if (categoryResult.error) throw categoryResult.error;
  if (cityResult.error) throw cityResult.error;
  if (areaResult.error) throw areaResult.error;

  const profile = profiles[0] ?? null;

  return {
    id: row.id,
    provider_id: row.provider_id,
    categoryName: categoryResult.data?.name ?? "Local service",
    title: row.title,
    description: row.description,
    pricing_type: row.pricing_type,
    price_amount: Number(row.price_amount),
    rating_avg: Number(row.rating_avg),
    rating_count: row.rating_count,
    cover_image_path: row.cover_image_path,
    providerName:
      profile?.display_name?.trim() || "Provider details unavailable",
    providerVerified: profile?.is_verified ?? false,
    providerBio: profile?.bio ?? null,
    availability_note: row.availability_note,
    areaName: areaResult.data?.name ?? "Samundri",
    cityName: cityResult.data?.name ?? "Samundri",
    isActive: row.is_active,
  };
}

export function ListingDetailPage() {
  const { id = "" } = useParams();
  const { user, roles } = useAuth();
  const detailQuery = useQuery({
    queryKey: ["listing", "detail", id],
    queryFn: () => loadListingDetail(id),
    enabled: Boolean(id),
  });
  const reviewsQuery = useQuery({
    queryKey: ["reviews", "listing", id],
    queryFn: () => loadListingReviews(id),
    enabled: Boolean(detailQuery.data?.id),
  });

  useEffect(() => {
    document.title = detailQuery.data
      ? `${detailQuery.data.title} · LocalServe`
      : "LocalServe";
    return () => {
      document.title = "LocalServe";
    };
  }, [detailQuery.data?.title]);

  if (detailQuery.isPending) {
    return (
      <div
        className="shell-container py-10"
        role="status"
        aria-label="Loading listing"
      >
        <div className="h-72 animate-pulse rounded-xl bg-cream-100" />
        <div className="mt-6 h-8 w-2/3 animate-pulse rounded bg-cream-100" />
        <div className="mt-3 h-4 w-1/2 animate-pulse rounded bg-cream-100" />
      </div>
    );
  }

  if (detailQuery.isError) {
    return (
      <section className="shell-container py-14">
        <div
          className="rounded-xl border border-rose-600/20 bg-white p-6"
          role="alert"
        >
          <h1 className="text-xl font-semibold">Listing unavailable</h1>
          <p className="mt-2 text-sm text-slate-600">
            We could not load this service. Please try again.
          </p>
          <button
            type="button"
            onClick={() => void detailQuery.refetch()}
            className="mt-4 min-h-11 rounded-lg border border-ink/20 px-4 text-sm font-medium"
          >
            Try again
          </button>
        </div>
      </section>
    );
  }

  const listing = detailQuery.data;
  if (!listing) {
    return (
      <section className="shell-container py-14">
        <h1 className="text-2xl font-semibold">Service not found</h1>
        <p className="mt-2 text-sm text-slate-600">
          This service may be inactive or no longer available.
        </p>
        <Link
          to="/search"
          className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-teal-600 px-5 text-sm font-medium text-white hover:bg-teal-700"
        >
          Browse services
        </Link>
      </section>
    );
  }

  const isOwner = user?.id === listing.provider_id;
  const canRequest = roles.includes("customer");
  const requestPath = `/listings/${listing.id}/request`;
  return (
    <div className="shell-container py-8 md:py-12">
      <nav aria-label="Breadcrumb" className="mb-5 text-sm text-slate-600">
        <Link to="/search" className="underline">
          Services
        </Link>
        <span className="mx-2" aria-hidden="true">
          /
        </span>
        <span>{listing.categoryName}</span>
      </nav>

      {!listing.isActive && isOwner && (
        <p className="mb-4 inline-flex rounded-full bg-cream-100 px-3 py-1 text-sm text-slate-700">
          Inactive listing
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.8fr)]">
        <div>
          <ListingCover
            path={listing.cover_image_path}
            title={listing.title}
            className="aspect-[4/3] rounded-2xl"
          />

          <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-teal-700">
                {listing.categoryName} · {listing.areaName}, {listing.cityName}
              </p>
              <h1 className="mt-2 text-3xl font-semibold">{listing.title}</h1>
            </div>
            {listing.providerVerified && (
              <span className="inline-flex min-h-8 items-center rounded-full bg-teal-50 px-3 text-sm font-medium text-teal-700">
                Verified
              </span>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600">
            <span>
              {listing.rating_count > 0
                ? `★ ${listing.rating_avg.toFixed(1)} (${listing.rating_count} reviews)`
                : "New · No reviews yet"}
            </span>
            <Link
              to={`/providers/${listing.provider_id}`}
              className="min-h-8 rounded-sm font-medium text-teal-700 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
            >
              {listing.providerName}
            </Link>
          </div>

          <section className="mt-8 border-t border-cream-100 pt-6">
            <h2 className="text-xl font-semibold">About this service</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">
              {listing.description}
            </p>
            {listing.availability_note && (
              <div className="mt-5">
                <h3 className="text-sm font-semibold">Availability</h3>
                <p className="mt-1 text-sm text-slate-600">
                  {listing.availability_note}
                </p>
              </div>
            )}
          </section>

          <section className="mt-8 border-t border-cream-100 pt-6">
            <h2 className="text-xl font-semibold">About the provider</h2>
            <div className="mt-3 flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-700">
                <Wrench size={20} aria-hidden="true" />
              </span>
              <div>
                <Link
                  to={`/providers/${listing.provider_id}`}
                  className="inline-flex min-h-9 items-center rounded-sm font-medium text-teal-700 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                >
                  {listing.providerName}
                </Link>
                {listing.providerBio ? (
                  <p className="mt-1 whitespace-pre-line text-sm text-slate-600">
                    {listing.providerBio}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-slate-600">
                    Local service provider in {listing.cityName}.
                  </p>
                )}
                {listing.providerVerified && (
                  <p className="mt-2 text-sm font-medium text-teal-700">
                    Verified by LocalServe
                  </p>
                )}
              </div>
            </div>
          </section>

          <section
            className="mt-8 border-t border-cream-100 pt-6"
            aria-labelledby="listing-reviews-title"
          >
            <h2 id="listing-reviews-title" className="text-xl font-semibold">
              Reviews
            </h2>
            {reviewsQuery.isPending ? (
              <div
                className="mt-4 space-y-3"
                role="status"
                aria-label="Loading reviews"
              >
                {[0, 1].map((item) => (
                  <div
                    key={item}
                    className="h-28 animate-pulse rounded-xl bg-cream-100"
                  />
                ))}
              </div>
            ) : reviewsQuery.isError ? (
              <div
                className="mt-4 rounded-xl border border-rose-600/20 bg-white p-4"
                role="alert"
              >
                <p className="text-sm text-slate-600">
                  Reviews couldn’t be loaded.
                </p>
                <button
                  type="button"
                  onClick={() => void reviewsQuery.refetch()}
                  className="mt-3 min-h-10 rounded-lg border border-ink/20 px-4 text-sm font-medium"
                >
                  Try again
                </button>
              </div>
            ) : reviewsQuery.data.length === 0 ? (
              <p className="mt-3 text-sm text-slate-600">No reviews yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {reviewsQuery.data.map((review) => (
                  <article
                    key={review.id}
                    className="rounded-xl border border-cream-100 bg-white p-5"
                  >
                    <p
                      className="text-amber-500"
                      aria-label={`${review.rating} out of 5 stars`}
                    >
                      {"★".repeat(review.rating)}
                      {"☆".repeat(5 - review.rating)}
                    </p>
                    {review.comment && (
                      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                        {review.comment}
                      </p>
                    )}
                    <p className="mt-3 text-xs text-slate-600">
                      {review.authorName} ·{" "}
                      {format(new Date(review.created_at), "MMM d, yyyy")}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="h-fit rounded-xl border border-cream-100 bg-white p-5 shadow-sm lg:sticky lg:top-6">
          <p className="text-sm text-slate-600">Service price</p>
          <p className="mt-1 text-2xl font-semibold">
            Rs.{" "}
            {new Intl.NumberFormat("en-PK", {
              maximumFractionDigits: 0,
            }).format(listing.price_amount)}
            <span className="text-base font-normal text-slate-600">
              {listing.pricing_type === "hourly" ? " / hr" : " fixed"}
            </span>
          </p>
          {isOwner ? (
            <Link
              to={`/provider/listings/${listing.id}/edit`}
              className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-teal-600 px-5 text-sm font-medium text-white hover:bg-teal-700"
            >
              Edit listing
            </Link>
          ) : !listing.isActive ? null : !user ? (
            <Link
              to={`/login?next=${encodeURIComponent(requestPath)}`}
              className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-teal-600 px-5 text-sm font-medium text-white hover:bg-teal-700"
            >
              Log in to request
            </Link>
          ) : canRequest ? (
            <Link
              to={requestPath}
              className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-teal-600 px-5 text-sm font-medium text-white hover:bg-teal-700"
            >
              Request booking
            </Link>
          ) : (
            <p className="mt-5 rounded-lg bg-cream-50 p-3 text-sm text-slate-600">
              A customer account is required to request this service.
            </p>
          )}
          <p className="mt-4 text-xs leading-5 text-slate-600">
            Contact details are shared only through an eligible booking. Agree
            payment directly with your provider.
          </p>
        </aside>
      </div>
    </div>
  );
}
