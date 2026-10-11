import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  BadgeCheck,
  BriefcaseBusiness,
  MapPin,
  MessageSquareText,
  Star,
  Wrench,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { Avatar } from "../components/Avatar";
import type { ListingCardData } from "../components/listing/ListingCard";
import { ListingCard } from "../components/listing/ListingCard";
import { BackButton } from "../components/ui/BackButton";
import { fetchPublicProviderProfiles, isUuid } from "../lib/catalog";
import { supabase } from "../lib/supabase";

type ProviderListing = ListingCardData & {
  provider_id: string;
  area_id: string;
  category_id: string;
};

type ProviderPageData = {
  id: string;
  displayName: string;
  avatarPath: string | null;
  bio: string | null;
  isVerified: boolean;
  listings: ProviderListing[];
  areas: string[];
};

type ProviderReview = {
  id: string;
  author_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  authorName: string;
  authorAvatarPath: string | null;
};

type ProviderReviewData = {
  reviews: ProviderReview[];
  count: number;
  average: number | null;
};

const providerTabs = ["About Me", "Services", "Reviews"] as const;
type ProviderTab = (typeof providerTabs)[number];

async function loadProviderPage(
  providerId: string,
): Promise<ProviderPageData | null> {
  if (!isUuid(providerId)) return null;

  const profiles = await fetchPublicProviderProfiles({
    providerIds: [providerId],
    cityId: null,
    areaId: null,
  });
  const profile = profiles[0] as
    | ((typeof profiles)[number] & { avatar_path?: string | null })
    | undefined;
  if (!profile) return null;

  const { data: listingRows, error: listingsError } = await supabase
    .from("listings")
    .select(
      "id, provider_id, area_id, category_id, title, pricing_type, price_amount, cover_image_path, rating_avg, rating_count",
    )
    .eq("provider_id", providerId)
    .eq("is_active", true)
    .order("rating_avg", { ascending: false })
    .order("rating_count", { ascending: false });
  if (listingsError) throw listingsError;

  const listings = listingRows ?? [];
  const categoryIds = [
    ...new Set(listings.map((listing) => listing.category_id)),
  ];
  const areaIds = [...new Set(listings.map((listing) => listing.area_id))];
  const [categoryResult, areaResult] = await Promise.all([
    categoryIds.length
      ? supabase.from("categories").select("id, name").in("id", categoryIds)
      : Promise.resolve({ data: [], error: null }),
    areaIds.length
      ? supabase.from("areas").select("id, name").in("id", areaIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (categoryResult.error) throw categoryResult.error;
  if (areaResult.error) throw areaResult.error;

  const categories = new Map(
    (categoryResult.data ?? []).map((category) => [category.id, category.name]),
  );
  const areas = new Map(
    (areaResult.data ?? []).map((area) => [area.id, area.name]),
  );

  return {
    id: profile.id,
    displayName: profile.display_name.trim() || "Local provider",
    avatarPath: profile.avatar_path ?? null,
    bio: profile.bio,
    isVerified: profile.is_verified,
    listings: listings.map((listing) => ({
      ...listing,
      categoryName: categories.get(listing.category_id) ?? "Local service",
      providerName: profile.display_name.trim() || "Local provider",
      providerVerified: profile.is_verified,
    })),
    areas: [
      ...new Set(
        listings
          .map((listing) => areas.get(listing.area_id))
          .filter((name): name is string => Boolean(name)),
      ),
    ].sort((first, second) => first.localeCompare(second)),
  };
}

async function loadProviderReviews(
  providerId: string,
): Promise<ProviderReviewData> {
  const { data, error, count } = await supabase
    .from("reviews")
    .select("id, author_id, rating, comment, created_at", { count: "exact" })
    .eq("target_provider_id", providerId)
    .eq("is_hidden", false)
    .order("created_at", { ascending: false })
    .range(0, 999);
  if (error) throw error;

  const rows = data ?? [];
  const authorIds = [
    ...new Set(rows.slice(0, 10).map((review) => review.author_id)),
  ];
  const { data: profiles, error: profileError } = authorIds.length
    ? await supabase
        .from("profiles_public")
        .select("id, display_name, avatar_path")
        .in("id", authorIds)
    : { data: [], error: null };
  if (profileError) throw profileError;

  const authors = new Map(
    (profiles ?? []).map((profile) => [
      profile.id,
      {
        name: profile.display_name?.trim() || "Local customer",
        avatarPath: profile.avatar_path,
      },
    ]),
  );
  const totalCount = count ?? rows.length;
  const canCalculateAverage = totalCount <= rows.length && rows.length > 0;

  return {
    count: totalCount,
    average: canCalculateAverage
      ? rows.reduce((total, review) => total + review.rating, 0) / rows.length
      : null,
    reviews: rows.slice(0, 10).map((review) => ({
      ...review,
      authorName: authors.get(review.author_id)?.name ?? "Local customer",
      authorAvatarPath: authors.get(review.author_id)?.avatarPath ?? null,
    })),
  };
}

export function PublicProviderPage() {
  const { id = "" } = useParams();
  const { t, i18n } = useTranslation();
  const dateFormatter = new Intl.DateTimeFormat(
    i18n.language === "ur" ? "ur" : "en-US",
    { month: "short", day: "numeric", year: "numeric" },
  );
  const [activeTab, setActiveTab] = useState<ProviderTab>("About Me");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const providerQuery = useQuery({
    queryKey: ["public-provider-page", id],
    queryFn: () => loadProviderPage(id),
    enabled: isUuid(id),
  });
  const reviewsQuery = useQuery({
    queryKey: ["public-provider-reviews", id],
    queryFn: () => loadProviderReviews(id),
    enabled: isUuid(id) && Boolean(providerQuery.data),
  });

  useEffect(() => {
    const displayName =
      providerQuery.data?.displayName === "Local provider"
        ? t("provider.public.localProviderFallback")
        : providerQuery.data?.displayName;
    document.title = providerQuery.data
      ? `${displayName} · LocalServe`
      : "LocalServe";
    return () => {
      document.title = "LocalServe";
    };
  }, [providerQuery.data?.displayName, t]);

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const currentIndex = tabRefs.current.indexOf(event.currentTarget);
    let nextIndex: number | null = null;
    const isRtl = document.documentElement.dir === "rtl";
    if (event.key === "ArrowRight")
      nextIndex =
        (currentIndex + (isRtl ? -1 : 1) + providerTabs.length) %
        providerTabs.length;
    if (event.key === "ArrowLeft") {
      nextIndex =
        (currentIndex + (isRtl ? 1 : -1) + providerTabs.length) %
        providerTabs.length;
    }
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = providerTabs.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    const nextTab = providerTabs[nextIndex];
    setActiveTab(nextTab);
    tabRefs.current[nextIndex]?.focus();
  }

  if (!isUuid(id)) {
    return (
      <section className="shell-container py-16">
        <h1 className="text-2xl font-semibold">
          {t("provider.public.providerNotFound")}
        </h1>
        <Link
          to="/search"
          className="mt-4 inline-flex min-h-11 items-center text-teal-700 underline"
        >
          {t("provider.public.browseServices")}
        </Link>
      </section>
    );
  }

  if (providerQuery.isPending) {
    return (
      <div
        className="shell-container py-10"
        role="status"
        aria-label={t("provider.public.loadingProvider")}
      >
        <div className="h-56 animate-pulse rounded-2xl bg-cream-100 motion-reduce:animate-none" />
        <div className="mt-6 h-9 w-1/2 animate-pulse rounded bg-cream-100 motion-reduce:animate-none" />
        <div className="mt-4 h-64 animate-pulse rounded-2xl bg-cream-100 motion-reduce:animate-none" />
      </div>
    );
  }

  if (providerQuery.isError) {
    return (
      <section className="shell-container py-16">
        <div
          className="rounded-2xl border border-rose-600/20 bg-white p-6"
          role="alert"
        >
          <h1 className="text-xl font-semibold">
            {t("provider.public.profileUnavailable")}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {t("provider.public.profileLoadError")}
          </p>
          <button
            type="button"
            onClick={() => void providerQuery.refetch()}
            className="mt-4 min-h-11 rounded-xl border border-ink/20 px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
          >
            {t("provider.public.tryAgain")}
          </button>
        </div>
      </section>
    );
  }

  const provider = providerQuery.data;
  if (!provider) {
    return (
      <section className="shell-container py-16">
        <div className="max-w-xl rounded-2xl border border-cream-100 bg-white p-7">
          <span className="grid size-12 place-items-center rounded-xl bg-teal-50 text-teal-700">
            <Wrench size={23} aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-2xl font-semibold">
            {t("provider.public.profileUnavailable")}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {t("provider.public.profileUnavailableExplanation")}
          </p>
          <Link
            to="/search"
            className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-teal-600 px-5 text-sm font-semibold text-white transition hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-600/20"
          >
            {t("provider.public.browseServices")}
          </Link>
        </div>
      </section>
    );
  }

  const providerDisplayName =
    provider.displayName === "Local provider"
      ? t("provider.public.localProviderFallback")
      : provider.displayName;
  const reviewData = reviewsQuery.data;
  const ratingLabel =
    reviewData?.average !== null && reviewData?.average !== undefined
      ? reviewData.average.toFixed(1)
      : null;

  return (
    <div className="shell-container py-7 md:py-12">
      <BackButton
        fallback="/search"
        label={t("provider.public.back")}
        className="mb-4"
      />
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
          <Avatar
            avatarPath={provider.avatarPath}
            name={providerDisplayName}
            size={80}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h1 className="min-w-0 break-words text-2xl font-semibold text-[#1D1F23]">
                {providerDisplayName}
              </h1>
              {provider.isVerified && (
                <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full bg-[#E3F7EC] px-2.5 text-xs font-semibold text-[#168A55]">
                  <BadgeCheck size={15} aria-hidden="true" />
                  {t("provider.public.verified")}
                </span>
              )}
            </div>
            {provider.bio && (
              <p className="mt-1 line-clamp-3 max-w-2xl text-sm text-slate-600">
                {provider.bio}
              </p>
            )}
            <div className="mt-3 flex min-w-0 flex-col items-start gap-2 text-sm text-slate-600">
              {reviewsQuery.isPending ? (
                <span role="status">
                  {t("provider.public.loadingReviewSummary")}
                </span>
              ) : reviewsQuery.isError ? (
                <span>{t("provider.public.reviewSummaryUnavailable")}</span>
              ) : reviewData && reviewData.count > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("Reviews");
                    tabRefs.current[2]?.focus();
                  }}
                  className="inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-sm text-ink transition hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                >
                  <Star
                    size={16}
                    className="fill-amber-500 text-amber-500"
                    aria-hidden="true"
                  />
                  {ratingLabel && <strong>{ratingLabel}</strong>}
                  <span>
                    ({t("provider.public.reviewCount", { count: reviewData.count })})
                  </span>
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <MessageSquareText size={15} aria-hidden="true" />
                  {t("provider.public.noReviews")}
                </span>
              )}
              {provider.areas.length > 0 && (
                <span className="inline-flex min-w-0 max-w-full items-start gap-1.5">
                  <MapPin size={15} className="shrink-0" aria-hidden="true" />
                  <span className="min-w-0 break-words">
                    {provider.areas.join(", ")}, Samundri
                  </span>
                </span>
              )}
            </div>
            <div className="mt-3">
              <span className="inline-flex min-h-10 max-w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600">
                <BriefcaseBusiness
                  size={16}
                  className="shrink-0 text-[#168A55]"
                  aria-hidden="true"
                />
                {t("provider.public.activeServiceCount", {
                  count: provider.listings.length,
                })}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div
        role="tablist"
        aria-label={t("provider.public.profileSections", {
          name: providerDisplayName,
        })}
        className="mt-7 flex overflow-x-auto border-b border-cream-100"
      >
        {providerTabs.map((tab, index) => {
          const selected = activeTab === tab;
          return (
            <button
              key={tab}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              id={`provider-tab-${index}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`provider-panel-${index}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveTab(tab)}
              onKeyDown={handleTabKeyDown}
              className={`relative min-h-12 shrink-0 px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-600 sm:px-6 ${
                selected
                  ? "text-teal-700 after:absolute after:inset-x-4 after:bottom-0 after:h-0.5 after:rounded-full after:bg-teal-600 sm:after:inset-x-6"
                  : "text-slate-600 hover:text-ink"
              }`}
            >
              {t(
                tab === "About Me"
                  ? "provider.public.tabs.about"
                  : tab === "Services"
                    ? "provider.public.tabs.services"
                    : "provider.public.tabs.reviews",
              )}
              {tab === "Reviews" && reviewData && (
                <span className="ms-2 rounded-full bg-cream-100 px-2 py-0.5 text-xs text-slate-600">
                  {reviewData.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <section
        id={`provider-panel-${providerTabs.indexOf(activeTab)}`}
        role="tabpanel"
        aria-labelledby={`provider-tab-${providerTabs.indexOf(activeTab)}`}
        tabIndex={0}
        className="min-h-64 py-7 focus-visible:outline-none"
      >
        {activeTab === "About Me" && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.55fr)]">
            <article className="rounded-2xl border border-cream-100 bg-white p-5 sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-teal-700">
                {t("provider.public.introduction")}
              </p>
              <h2 className="mt-2 text-xl font-semibold">
                {t("provider.public.aboutProvider", {
                  name: providerDisplayName,
                })}
              </h2>
              {provider.bio ? (
                <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-600">
                  {provider.bio}
                </p>
              ) : (
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  {t("provider.public.noIntroduction")}
                </p>
              )}
            </article>
            <aside className="rounded-2xl border border-cream-100 bg-white p-5 sm:p-6">
              <h2 className="font-semibold">
                {t("provider.public.serviceArea")}
              </h2>
              {provider.areas.length > 0 ? (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {provider.areas.map((area) => (
                    <li
                      key={area}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-cream-50 px-3 text-sm text-slate-600"
                    >
                      <MapPin size={14} aria-hidden="true" />
                      {area}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-slate-600">
                  {t("provider.public.localityUnavailable")}
                </p>
              )}
              <p className="mt-3 text-xs text-slate-600">Samundri</p>
            </aside>
          </div>
        )}

        {activeTab === "Services" && (
          <div>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-teal-700">
                  {t("provider.public.availableLocally")}
                </p>
                <h2 className="mt-1 text-xl font-semibold">
                  {t("provider.public.servicesByProvider", {
                    name: providerDisplayName,
                  })}
                </h2>
              </div>
              <span className="text-sm text-slate-600">
                {t("provider.public.activeServiceCount", {
                  count: provider.listings.length,
                })}
              </span>
            </div>
            {provider.listings.length > 0 ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {provider.listings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={
                      listing.providerName === "Local provider"
                        ? {
                            ...listing,
                            providerName: t("provider.public.localProviderFallback"),
                          }
                        : listing
                    }
                    avatarPath={provider.avatarPath}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-cream-100 bg-white px-6 py-12 text-center">
                <span className="mx-auto grid size-12 place-items-center rounded-xl bg-teal-50 text-teal-700">
                  <BriefcaseBusiness size={22} aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-semibold">
                  {t("provider.public.noActiveServices")}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {t("provider.public.checkBackForServices")}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "Reviews" && (
          <div id="provider-reviews">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-teal-700">
                {t("provider.public.customerFeedback")}
              </p>
              <h2 className="mt-1 text-xl font-semibold">
                {t("provider.public.reviewsForProvider", {
                  name: providerDisplayName,
                })}
              </h2>
              {!reviewsQuery.isPending &&
                !reviewsQuery.isError &&
                reviewData && (
                  <p className="mt-1 text-sm text-slate-600">
                    {t("provider.public.publicReviewCount", {
                      count: reviewData.count,
                    })}
                    {ratingLabel && (
                      <span className="ms-2 inline-flex items-center gap-1 font-semibold text-ink">
                        <Star
                          size={14}
                          className="fill-amber-500 text-amber-500"
                          aria-hidden="true"
                        />
                        {t("provider.public.ratingAverage", {
                          rating: ratingLabel,
                        })}
                      </span>
                    )}
                  </p>
                )}
            </div>
            {reviewsQuery.isPending ? (
              <div
                className="space-y-3"
                role="status"
                aria-label={t("provider.public.loadingReviews")}
              >
                {[0, 1, 2].map((item) => (
                  <div
                    key={item}
                    className="h-32 animate-pulse rounded-2xl bg-cream-100 motion-reduce:animate-none"
                  />
                ))}
              </div>
            ) : reviewsQuery.isError ? (
              <div
                className="rounded-2xl border border-rose-600/20 bg-white p-5"
                role="alert"
              >
                <p className="text-sm text-slate-600">
                  {t("provider.public.reviewsLoadError")}
                </p>
                <button
                  type="button"
                  onClick={() => void reviewsQuery.refetch()}
                  className="mt-3 min-h-11 rounded-xl border border-ink/20 px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                >
                  {t("provider.public.tryAgain")}
                </button>
              </div>
            ) : reviewData?.reviews.length ? (
              <div className="space-y-3">
                {reviewData.reviews.map((review) => (
                  <article
                    key={review.id}
                    className="rounded-2xl border border-cream-100 bg-white p-5 sm:p-6"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar
                          avatarPath={review.authorAvatarPath}
                          name={
                            review.authorName === "Local customer"
                              ? t("provider.public.localCustomerFallback")
                              : review.authorName
                          }
                          size={36}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {review.authorName === "Local customer"
                              ? t("provider.public.localCustomerFallback")
                              : review.authorName}
                          </p>
                          <time
                            className="text-xs text-slate-600"
                            dateTime={review.created_at}
                          >
                            {dateFormatter.format(new Date(review.created_at))}
                          </time>
                        </div>
                      </div>
                      <span
                        className="inline-flex items-center gap-0.5 self-start sm:self-auto"
                        role="img"
                        aria-label={t("provider.public.ratingStars", {
                          rating: review.rating,
                        })}
                      >
                        {Array.from({ length: 5 }, (_, index) => (
                          <Star
                            key={index}
                            size={16}
                            className={
                              index < review.rating
                                ? "fill-amber-400 text-amber-400"
                                : "text-slate-300"
                            }
                            aria-hidden="true"
                          />
                        ))}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-600">
                        {review.comment}
                      </p>
                    )}
                  </article>
                ))}
                {reviewData.count > reviewData.reviews.length && (
                  <p className="pt-2 text-center text-sm text-slate-600">
                    {t("provider.public.recentReviews", {
                      count: reviewData.count,
                    })}
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-cream-100 bg-white px-6 py-12 text-center">
                <span className="mx-auto grid size-12 place-items-center rounded-xl bg-teal-50 text-teal-700">
                  <MessageSquareText size={22} aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-semibold">
                  {t("provider.public.noReviews")}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {t("provider.public.noReviewFeedback")}
                </p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
