import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { MapPin, MessageSquare, Star, Tag } from "lucide-react";

import { useAuth } from "../app/AuthContext";
import { Avatar } from "../components/Avatar";
import type { ListingCardData } from "../components/listing/ListingCard";
import { ListingCover } from "../components/listing/ListingCover";
import { BackButton } from "../components/ui/BackButton";
import { fetchPublicProviderProfiles } from "../lib/catalog";
import { supabase } from "../lib/supabase";

type ListingDetail = ListingCardData & {
  provider_id: string;
  description: string;
  availability_note: string | null;
  providerBio: string | null;
  providerAvatarPath: string | null;
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
  authorAvatarPath: string | null;
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
    .select("id, display_name, avatar_path")
    .in("id", authorIds);
  if (profileError) throw profileError;

  const authors = new Map(
    (profiles ?? []).map((profile) => [
      profile.id,
      {
        name: profile.display_name,
        avatarPath: profile.avatar_path,
      },
    ]),
  );
  return reviews.map((review) => ({
    ...review,
    authorName: authors.get(review.author_id)?.name ?? "Local customer",
    authorAvatarPath: authors.get(review.author_id)?.avatarPath ?? null,
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

  const [categoryResult, cityResult, areaResult, profiles] = await Promise.all([
    supabase
      .from("categories")
      .select("name")
      .eq("id", row.category_id)
      .maybeSingle(),
    supabase.from("cities").select("name").eq("id", row.city_id).maybeSingle(),
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

  const profile = (profiles[0] ?? null) as
    | ((typeof profiles)[number] & { avatar_path?: string | null })
    | null;

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
    providerAvatarPath: profile?.avatar_path ?? null,
    availability_note: row.availability_note,
    areaName: areaResult.data?.name ?? "Samundri",
    cityName: cityResult.data?.name ?? "Samundri",
    isActive: row.is_active,
  };
}

export function ListingDetailPage() {
  const { id = "" } = useParams();
  const { t, i18n } = useTranslation();
  const dateFormatter = new Intl.DateTimeFormat(
    i18n.language === "ur" ? "ur" : "en-US",
    { month: "short", day: "numeric", year: "numeric" },
  );
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
        aria-label={t("listing.detail.loadingListing")}
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
          <h1 className="text-xl font-semibold">
            {t("listing.detail.listingUnavailable")}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {t("listing.detail.listingLoadError")}
          </p>
          <button
            type="button"
            onClick={() => void detailQuery.refetch()}
            className="mt-4 min-h-11 rounded-lg border border-ink/20 px-4 text-sm font-medium"
          >
            {t("listing.detail.tryAgain")}
          </button>
        </div>
      </section>
    );
  }

  const listing = detailQuery.data;
  if (!listing) {
    return (
      <section className="shell-container py-14">
        <h1 className="text-2xl font-semibold">
          {t("listing.detail.serviceNotFound")}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {t("listing.detail.serviceUnavailable")}
        </p>
        <Link
          to="/search"
          className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-teal-600 px-5 text-sm font-medium text-white hover:bg-teal-700"
        >
          {t("listing.detail.browseServices")}
        </Link>
      </section>
    );
  }

  const providerName =
    listing.providerName === "Provider details unavailable"
      ? t("listing.detail.providerUnavailable")
      : listing.providerName;
  const categoryName =
    listing.categoryName === "Local service"
      ? t("listing.detail.localServiceFallback")
      : listing.categoryName;
  const categoryFallbackImage = /electric/i.test(listing.categoryName)
    ? "/electrical-repair.jpg"
    : undefined;
  const isOwner = user?.id === listing.provider_id;
  const canRequest = roles.includes("customer");
  const requestPath = `/listings/${listing.id}/request`;
  return (
    <div className="shell-container py-4 md:py-12">
      <BackButton
        fallback="/search"
        label={t("listing.detail.backToResults")}
        className="mb-3 md:mb-4"
      />

      {!listing.isActive && isOwner && (
        <p className="mb-4 inline-flex rounded-full bg-cream-100 px-3 py-1 text-sm text-slate-700">
          {t("listing.detail.inactiveListing")}
        </p>
      )}

      <div className="grid gap-x-8 gap-y-0 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.8fr)]">
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <div className="aspect-[2/1] w-full overflow-hidden rounded-2xl border border-slate-200 max-h-[420px] md:aspect-video">
            <ListingCover
              path={listing.cover_image_path}
              title={listing.title}
              fallbackImageUrl={categoryFallbackImage}
              className="size-full"
            />
          </div>

          <div className="mt-3 flex flex-wrap items-start justify-between gap-4 md:mt-6">
            <div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-[#E3F7EC] px-3 py-1 text-xs font-medium text-[#168A55]">
                  {categoryName}
                </span>
              </div>
              <h1 className="mt-1 text-2xl font-semibold leading-7 md:mt-3 md:text-3xl md:leading-9">
                {listing.title}
              </h1>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-600 md:mt-4">
            <span
              className="inline-flex items-center gap-1.5"
              aria-label={
                listing.rating_count > 0
                  ? t("listing.detail.ratingWithCount", {
                      rating: listing.rating_avg.toFixed(1),
                      count: listing.rating_count,
                    })
                  : t("listing.detail.noReviews")
              }
            >
              {listing.rating_count > 0 ? (
                <>
                  <Star
                    size={15}
                    className="fill-amber-500 text-amber-500"
                    aria-hidden="true"
                  />
                  {listing.rating_avg.toFixed(1)}
                  <span>({listing.rating_count})</span>
                </>
              ) : (
                t("listing.detail.new")
              )}
            </span>
            <span aria-hidden="true">·</span>
            <Link
              to={`/providers/${listing.provider_id}`}
              className="inline-flex min-h-8 items-center gap-2 rounded-sm font-medium text-teal-700 no-underline hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
            >
              <Avatar
                avatarPath={listing.providerAvatarPath}
                name={providerName}
                size={24}
              />
              {providerName}
            </Link>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 md:mt-5">
            <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
              <Tag size={16} aria-hidden="true" />
              {listing.pricing_type === "hourly"
                ? t("listing.detail.hourly")
                : t("listing.detail.fixedPrice")}
            </span>
            <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
              <MapPin size={16} aria-hidden="true" />
              {listing.areaName}
            </span>
          </div>

        </div>

        <aside className="mt-6 self-start rounded-xl border border-cream-100 bg-white p-4 shadow-sm md:mt-8 md:p-5 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:mt-0 lg:sticky lg:top-24">
          <p className="text-sm text-slate-600">
            {t("listing.detail.servicePrice")}
          </p>
          <p className="mt-1 text-2xl font-semibold">
            {t("listing.detail.currency")} {" "}
            {new Intl.NumberFormat("en-PK", {
              maximumFractionDigits: 0,
            }).format(listing.price_amount)}
            <span className="text-base font-normal text-slate-600">
              {listing.pricing_type === "hourly"
                ? t("listing.detail.perHour")
                : t("listing.detail.fixedSuffix")}
            </span>
          </p>
          {isOwner ? (
            <Link
              to={`/provider/listings/${listing.id}/edit`}
              className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-teal-600 px-5 text-sm font-medium text-white hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
            >
              {t("listing.detail.editListing")}
            </Link>
          ) : !listing.isActive ? null : !user ? (
            <Link
              to={`/login?next=${encodeURIComponent(requestPath)}`}
              className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-teal-600 px-5 text-sm font-medium text-white hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
            >
              {t("listing.detail.logInToRequest")}
            </Link>
          ) : canRequest ? (
            <Link
              to={requestPath}
              className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-teal-600 px-5 text-sm font-medium text-white hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
            >
              {t("listing.detail.requestBooking")}
            </Link>
          ) : (
            <p className="mt-5 rounded-lg bg-cream-50 p-3 text-sm text-slate-600">
              {t("listing.detail.customerRequired")}
            </p>
          )}
          <p className="mt-4 text-xs leading-5 text-slate-600">
            {t("listing.detail.contactPaymentNote")}
          </p>
        </aside>

        <div className="mt-6 min-w-0 md:mt-8 lg:col-start-1 lg:row-start-2 lg:mt-0">
          <section className="mt-6 border-t border-cream-100 pt-5 md:mt-8 md:pt-6">
            <h2 className="text-xl font-semibold">
              {t("listing.detail.aboutService")}
            </h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">
              {listing.description}
            </p>
            {listing.availability_note && (
              <div className="mt-5">
                <h3 className="text-sm font-semibold">
                  {t("listing.detail.availability")}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {listing.availability_note}
                </p>
              </div>
            )}
          </section>

          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4 md:mt-8 md:p-5">
            <h2 className="text-xl font-semibold">
              {t("listing.detail.aboutProvider")}
            </h2>
            <div className="mt-3 flex items-start gap-3">
              <Avatar
                avatarPath={listing.providerAvatarPath}
                name={providerName}
                size={48}
              />
              <div>
                <Link
                  to={`/providers/${listing.provider_id}`}
                  className="inline-flex min-h-9 items-center rounded-sm font-medium text-teal-700 no-underline hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                >
                  {listing.providerName}
                </Link>
                {listing.providerBio ? (
                  <p className="mt-1 whitespace-pre-line text-sm text-slate-600">
                    {listing.providerBio}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-slate-600">
                    {t("listing.detail.providerInCity", {
                      city: listing.cityName,
                    })}
                  </p>
                )}
                {listing.providerVerified && (
                  <p className="mt-2 inline-flex rounded-full bg-[#E3F7EC] px-3 py-1 text-xs font-medium text-[#168A55]">
                    {t("listing.detail.verifiedBy")}
                  </p>
                )}
              </div>
            </div>
          </section>

          <section
            className="mt-6 border-t border-cream-100 pt-5 md:mt-8 md:pt-6"
            aria-labelledby="listing-reviews-title"
          >
            <h2 id="listing-reviews-title" className="text-xl font-semibold">
              {t("listing.detail.reviews")}
            </h2>
            {reviewsQuery.isPending ? (
              <div
                className="mt-3 space-y-3 md:mt-4"
                role="status"
                aria-label={t("listing.detail.loadingReviews")}
              >
                {[0, 1].map((item) => (
                  <div
                    key={item}
                    className="h-24 animate-pulse rounded-xl bg-cream-100 md:h-28"
                  />
                ))}
              </div>
            ) : reviewsQuery.isError ? (
              <div
                className="mt-3 rounded-xl border border-rose-600/20 bg-white p-4 md:mt-4"
                role="alert"
              >
                <p className="text-sm text-slate-600">
                  {t("listing.detail.reviewsLoadError")}
                </p>
                <button
                  type="button"
                  onClick={() => void reviewsQuery.refetch()}
                  className="mt-3 min-h-10 rounded-lg border border-ink/20 px-4 text-sm font-medium"
                >
                  {t("listing.detail.tryAgain")}
                </button>
              </div>
            ) : reviewsQuery.data.length === 0 ? (
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-cream-50 p-4 text-sm leading-5 text-slate-600">
                <MessageSquare
                  size={18}
                  className="shrink-0 text-[#168A55]"
                  aria-hidden="true"
                />
                <p>{t("listing.detail.emptyReviews")}</p>
              </div>
            ) : (
              <div className="mt-3 space-y-3 md:mt-4">
                {reviewsQuery.data.map((review) => (
                  <article
                    key={review.id}
                    className="rounded-xl border border-cream-100 bg-white p-4 md:p-5"
                  >
                    <p
                      className="text-amber-500"
                      aria-label={t("listing.detail.ratingStars", {
                        rating: review.rating,
                      })}
                    >
                      {"★".repeat(review.rating)}
                      {"☆".repeat(5 - review.rating)}
                    </p>
                    {review.comment && (
                      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                        {review.comment}
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
                      <Avatar
                        avatarPath={review.authorAvatarPath}
                        name={
                          review.authorName === "Local customer"
                            ? t("listing.detail.localCustomerFallback")
                            : review.authorName
                        }
                        size={36}
                      />
                      <p>
                        {review.authorName === "Local customer"
                          ? t("listing.detail.localCustomerFallback")
                          : review.authorName}{" "}·{" "}
                        {dateFormatter.format(new Date(review.created_at))}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
