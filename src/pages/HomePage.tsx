import { useEffect, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowRight,
  BookOpen,
  Brush,
  Hammer,
  House,
  MapPin,
  Search,
  ShieldCheck,
  Snowflake,
  Wrench,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useAreas } from "../app/AreaContext";
import { ListingCard } from "../components/listing/ListingCard";
import { SelectMenu } from "../components/ui/SelectMenu";
import {
  fetchPublicProviderProfiles,
  fetchSamundriCityId,
  isUuid,
  SAMUNDRI_CITY_QUERY_KEY,
} from "../lib/catalog";
import { supabase } from "../lib/supabase";

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
};
type ListingRow = {
  id: string;
  provider_id: string;
  category_id: string;
  title: string;
  description: string;
  pricing_type: "hourly" | "fixed";
  price_amount: number;
  currency: string;
  cover_image_path: string | null;
  rating_avg: number;
  rating_count: number;
};
type HomeListing = ListingRow & {
  categoryName: string;
  categorySlug: string;
  providerName: string;
  providerVerified: boolean;
};
type ReviewRow = {
  id: string;
  listing_id: string;
  author_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};
type HomeReview = ReviewRow & {
  listingTitle: string;
  authorName: string;
};

const categoryIcons: Record<string, typeof Wrench> = {
  electrician: Wrench,
  plumbing: Wrench,
  ac: Snowflake,
  cleaning: Brush,
  carpentry: Hammer,
  tutoring: BookOpen,
  "home-repair": House,
};

const categoryPhotos: Record<string, string> = {
  electrician:
    "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=720&q=75",
  plumbing:
    "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=720&q=75",
  ac: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=720&q=75",
  cleaning:
    "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=720&q=75",
  carpentry:
    "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=720&q=75",
  tutoring:
    "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=720&q=75",
  "home-repair":
    "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=720&q=75",
};

function getCategoryPhotoSlug(categoryName: string) {
  const normalized = categoryName.toLowerCase().replace(/\s+/g, "-");
  return normalized === "ac-repair" ? "ac" : normalized;
}

const categoryBlurbs: Record<string, string> = {
  electrician: "Wiring, fittings, and everyday electrical repairs.",
  plumbing: "Help with leaks, taps, drains, and pipe repairs.",
  ac: "Air conditioning maintenance and repair services.",
  cleaning: "Local help for a cleaner, more comfortable home.",
  carpentry: "Furniture repairs, fitting, and woodwork.",
  tutoring: "One-to-one learning support from local tutors.",
  "home-repair": "Practical help with everyday household repairs.",
};

async function fetchActiveCategories(): Promise<CategoryRow[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, sort_order")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as CategoryRow[];
}

async function fetchCityCategoryCounts(
  cityId: string,
): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from("listings")
    .select("category_id")
    .eq("city_id", cityId)
    .eq("is_active", true);
  if (error) throw error;
  const counts = new Map<string, number>();
  for (const listing of (data ?? []) as Array<{ category_id: string }>) {
    counts.set(listing.category_id, (counts.get(listing.category_id) ?? 0) + 1);
  }
  return counts;
}

async function fetchTopListings(
  cityId: string,
  areaId: string,
): Promise<HomeListing[]> {
  const { data, error } = await supabase
    .from("listings")
    .select(
      "id, provider_id, category_id, title, description, pricing_type, price_amount, currency, cover_image_path, rating_avg, rating_count",
    )
    .eq("city_id", cityId)
    .eq("area_id", areaId)
    .eq("is_active", true)
    .order("rating_avg", { ascending: false })
    .order("rating_count", { ascending: false })
    .limit(4);
  if (error) throw error;

  const listings = (data ?? []) as ListingRow[];
  if (listings.length === 0) return [];

  const providerIds = [
    ...new Set(listings.map((listing) => listing.provider_id)),
  ];
  const categoryIds = [
    ...new Set(listings.map((listing) => listing.category_id)),
  ];
  const [profilesResult, categoriesResult] = await Promise.all([
    fetchPublicProviderProfiles({
      providerIds,
      cityId,
      areaId,
    }),
    supabase.from("categories").select("id, name").in("id", categoryIds),
  ]);
  if (categoriesResult.error) throw categoriesResult.error;

  const profiles = new Map(
    profilesResult.map((profile) => [profile.id, profile]),
  );
  const categories = new Map(
    ((categoriesResult.data ?? []) as Array<{ id: string; name: string }>).map(
      (category) => [category.id, category.name],
    ),
  );

  return listings.map((listing) => {
    const profile = profiles.get(listing.provider_id);
    return {
      ...listing,
      categoryName: categories.get(listing.category_id) ?? "Local service",
      categorySlug: getCategoryPhotoSlug(
        categories.get(listing.category_id) ?? "",
      ),
      providerName:
        profile?.display_name?.trim() || "Provider details unavailable",
      providerVerified: profile?.is_verified ?? false,
    };
  });
}

async function fetchRecentReviews(): Promise<HomeReview[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("id, listing_id, author_id, rating, comment, created_at")
    .eq("is_hidden", false)
    .order("created_at", { ascending: false })
    .limit(3);
  if (error) throw error;

  const reviews = (data ?? []) as ReviewRow[];
  if (reviews.length === 0) return [];

  const listingIds = [...new Set(reviews.map((review) => review.listing_id))];
  const authorIds = [...new Set(reviews.map((review) => review.author_id))];
  const [listingsResult, profilesResult] = await Promise.all([
    supabase.from("listings").select("id, title").in("id", listingIds),
    supabase
      .from("profiles_public")
      .select("id, display_name")
      .in("id", authorIds),
  ]);
  if (listingsResult.error) throw listingsResult.error;

  const listings = new Map(
    ((listingsResult.data ?? []) as Array<{ id: string; title: string }>).map(
      (listing) => [listing.id, listing.title],
    ),
  );
  const authors = new Map(
    (
      (profilesResult.data ?? []) as Array<{ id: string; display_name: string }>
    ).map((profile) => [profile.id, profile.display_name]),
  );

  return reviews.flatMap((review) => {
    const listingTitle = listings.get(review.listing_id);
    if (!listingTitle) return [];
    return [
      {
        ...review,
        listingTitle,
        authorName: authors.get(review.author_id) ?? "Local customer",
      },
    ];
  });
}

export function HomePage() {
  useEffect(() => {
    document.title = "LocalServe — Trusted local services";
    return () => {
      document.title = "LocalServe";
    };
  }, []);

  const {
    areas,
    selectedArea,
    selectedAreaId,
    setSelectedAreaId,
    loading: areasLoading,
    error: areasError,
  } = useAreas();
  const location = useLocation();
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const cityQuery = useQuery({
    queryKey: SAMUNDRI_CITY_QUERY_KEY,
    queryFn: fetchSamundriCityId,
  });
  const cityId = isUuid(cityQuery.data) ? cityQuery.data : null;
  const areaId = isUuid(selectedAreaId) ? selectedAreaId : null;
  const categoriesQuery = useQuery({
    queryKey: ["catalog", "active-categories"],
    queryFn: fetchActiveCategories,
  });
  const categoryCountsQuery = useQuery({
    queryKey: ["catalog", "category-counts", cityId],
    queryFn: () => {
      if (!cityId) throw new Error("Samundri is not available right now.");
      return fetchCityCategoryCounts(cityId);
    },
    enabled: isUuid(cityId),
  });
  const listingsQuery = useQuery({
    queryKey: ["listings", "home-top-rated", cityId, areaId],
    queryFn: () => {
      if (!cityId || !areaId) {
        throw new Error("Choose an active Samundri locality.");
      }
      return fetchTopListings(cityId, areaId);
    },
    enabled: isUuid(cityId) && isUuid(areaId),
  });
  const reviewsQuery = useQuery({
    queryKey: ["reviews", "home-recent"],
    queryFn: fetchRecentReviews,
  });

  const featuredCategories = (categoriesQuery.data ?? [])
    .map((category) => ({
      ...category,
      listingCount: categoryCountsQuery.data?.get(category.id) ?? 0,
    }))
    .sort(
      (first, second) =>
        second.listingCount - first.listingCount ||
        first.sort_order - second.sort_order,
    )
    .slice(0, 5);

  useEffect(() => {
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>(".home-marketplace .home-reveal"),
    );
    const reveal = (element: HTMLElement) => {
      element.classList.remove("home-reveal-pending");
      element.classList.add("home-reveal-visible");
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      elements.forEach(reveal);
      return;
    }

    if (!("IntersectionObserver" in window)) {
      elements.forEach(reveal);
      return;
    }

    const hiddenElements = elements.filter(
      (element) => !element.classList.contains("home-reveal-visible"),
    );
    if (hiddenElements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          reveal(entry.target as HTMLElement);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -32px 0px" },
    );

    hiddenElements.forEach((element) => {
      element.classList.add("home-reveal-pending");
      const bounds = element.getBoundingClientRect();
      const isInViewport =
        bounds.bottom > 0 &&
        bounds.top < window.innerHeight &&
        bounds.right > 0 &&
        bounds.left < window.innerWidth;
      if (isInViewport) {
        reveal(element);
      } else {
        observer.observe(element);
      }
    });

    const fallback = window.setTimeout(() => {
      hiddenElements.forEach(reveal);
    }, 1500);
    return () => {
      window.clearTimeout(fallback);
      observer.disconnect();
    };
  }, [
    location.key,
    categoriesQuery.data,
    categoryCountsQuery.data,
    listingsQuery.data,
    reviewsQuery.data,
  ]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (selectedAreaId) params.set("areaId", selectedAreaId);
    if (categoryId) params.set("categoryId", categoryId);
    if (keyword.trim()) params.set("q", keyword.trim());
    navigate(`/search?${params.toString()}`);
  }

  function searchFor(query: string) {
    const params = new URLSearchParams();
    if (selectedAreaId) params.set("areaId", selectedAreaId);
    params.set("q", query);
    navigate(`/search?${params.toString()}`);
  }

  return (
    <div className="home-marketplace">
      <section className="home-hero relative isolate z-10 bg-[#292C2A] text-white">
        <div className="absolute inset-0 overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1800&q=82"
            alt="A home-service professional at work in a bright home"
            loading="eager"
            className="absolute inset-0 size-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#171A18]/90 via-[#171A18]/65 to-[#171A18]/25" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#171A18]/80 via-transparent to-[#171A18]/10" />
        </div>
        <div className="shell-container relative py-8 sm:py-12 lg:py-[4.5rem]">
          <div className="home-hero-enter max-w-4xl">
            <p className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 text-xs font-semibold text-white backdrop-blur-sm">
              <ShieldCheck size={16} aria-hidden="true" />
              Local professionals, ready to help
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-extrabold leading-[1.02] sm:mt-5 sm:text-6xl lg:text-7xl">
              Find trusted help
              <span className="block text-[#55D99A]">
                right here in Samundri.
              </span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/85 sm:mt-5 sm:text-lg sm:leading-7">
              Compare local services, prices and reviews, then request a time
              that works for you.
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm font-medium text-white/80 sm:mt-3">
              <MapPin size={16} className="text-[#55D99A]" aria-hidden="true" />
              Choose from approved Samundri localities
            </p>
          </div>
          <div className="mt-6 max-w-5xl sm:mt-8">
            <form
              onSubmit={submitSearch}
              className="home-search-panel relative z-20 grid grid-cols-1 gap-2 rounded-2xl bg-white p-3 text-ink shadow-[0_18px_60px_rgba(0,0,0,0.28)] sm:grid-cols-2 sm:p-4 lg:grid-cols-[0.9fr_1.25fr_0.95fr_auto] lg:items-end lg:gap-3"
            >
              <div className="min-w-0 px-1">
                <label
                  className="mb-1.5 block text-xs font-semibold text-slate-600"
                  htmlFor="home-category"
                >
                  Service
                </label>
                <SelectMenu
                  value={categoryId}
                  onChange={setCategoryId}
                  options={[
                    { value: "", label: "All services" },
                    ...(categoriesQuery.data ?? []).map((category) => ({
                      value: category.id,
                      label: category.name,
                    })),
                  ]}
                  ariaLabel="Service"
                  className="z-50"
                  buttonClassName="home-search-control border-[#E5E7E5] text-sm text-ink focus:border-[#1DBF73] focus:ring-4 focus:ring-[#1DBF73]/15"
                />
              </div>
              <div className="min-w-0 px-1">
                <label
                  className="mb-1.5 block text-xs font-semibold text-slate-600"
                  htmlFor="home-keyword"
                >
                  What do you need?
                </label>
                <div className="relative">
                  <Search
                    size={17}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
                    aria-hidden="true"
                  />
                  <input
                    id="home-keyword"
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    placeholder="Try plumbing, tutoring..."
                    className="home-search-control min-h-12 w-full rounded-lg border border-[#E5E7E5] bg-white pl-10 pr-3 text-sm text-ink outline-none transition placeholder:text-slate-600 focus:border-[#1DBF73] focus:ring-4 focus:ring-[#1DBF73]/15"
                  />
                </div>
              </div>
              <div className="min-w-0 px-1">
                <label
                  className="mb-1.5 block text-xs font-semibold text-slate-600"
                  htmlFor="home-area"
                >
                  Samundri area
                </label>
                <SelectMenu
                  value={selectedAreaId}
                  onChange={setSelectedAreaId}
                  options={areas.map((area) => ({
                    value: area.id,
                    label: area.name,
                  }))}
                  ariaLabel="Samundri area"
                  className="z-50"
                  buttonClassName="home-search-control border-[#E5E7E5] text-sm text-ink focus:border-[#1DBF73] focus:ring-4 focus:ring-[#1DBF73]/15"
                />
              </div>
              <button
                type="submit"
                className="col-span-1 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#1DBF73] px-4 font-bold text-white shadow-sm transition duration-200 hover:bg-[#19A463] hover:brightness-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1DBF73]/35 active:scale-[0.98] lg:mb-0.5 lg:px-6"
              >
                Find a Service
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            </form>

            <div className="mt-3 flex flex-col gap-2 sm:mt-4 sm:flex-row sm:items-center sm:justify-between">
              <div
                className="flex flex-wrap items-center gap-2"
                aria-label="Popular searches"
              >
                <span className="mr-1 text-xs font-medium text-slate-300">
                  Popular:
                </span>
                {[
                  "Generator wiring",
                  "AC gas refill",
                  "Kitchen leak",
                  "Deep cleaning",
                ].map((query) => (
                  <button
                    key={query}
                    type="button"
                    onClick={() => searchFor(query)}
                    className="min-h-10 rounded-full border border-white/20 bg-white/10 px-3.5 text-xs font-semibold text-white transition duration-200 hover:border-white/40 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#55D99A]"
                  >
                    {query}
                  </button>
                ))}
              </div>
              <p className="text-sm text-slate-300">
                Offering a service?{" "}
                <Link
                  to="/register?role=provider"
                  className="inline-flex min-h-11 items-center rounded-sm font-bold text-[#55D99A] underline underline-offset-4 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#55D99A]"
                >
                  Join as a provider
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="home-market-section shell-container py-10 md:py-14">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#168A55]">
              Browse by trade
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Explore trusted services
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Find the right local professional for the job.
            </p>
          </div>
          <Link
            to={`/search?areaId=${encodeURIComponent(selectedAreaId)}`}
            className="hidden min-h-11 items-center gap-2 text-sm font-bold text-[#168A55] transition hover:text-[#19A463] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1DBF73] sm:inline-flex"
          >
            Browse all <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>

        {cityQuery.isPending ||
        categoriesQuery.isPending ||
        (Boolean(cityId) && categoryCountsQuery.isPending) ? (
          <div
            className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
            role="status"
            aria-label="Loading categories"
          >
            {Array.from({ length: 5 }, (_, index) => (
              <div
                key={index}
                className="h-36 animate-pulse rounded-xl bg-cream-100"
              />
            ))}
          </div>
        ) : cityQuery.isError ||
          categoriesQuery.isError ||
          categoryCountsQuery.isError ? (
          <div
            className="mt-6 rounded-xl border border-rose-600/20 bg-white p-5"
            role="alert"
          >
            <p className="text-sm text-slate-600">
              Services could not be loaded.
            </p>
            <button
              type="button"
              onClick={() => {
                void categoriesQuery.refetch();
                void categoryCountsQuery.refetch();
              }}
              className="mt-3 min-h-10 rounded-lg border border-ink/20 px-4 text-sm font-medium"
            >
              Try again
            </button>
          </div>
        ) : featuredCategories.length === 0 ? (
          <p className="mt-6 rounded-xl bg-white p-5 text-sm text-slate-600">
            No services are listed in Samundri yet.
          </p>
        ) : (
          <div className="home-reveal mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {featuredCategories.map((category) => {
              const Icon = categoryIcons[category.slug] ?? Wrench;
              return (
                <Link
                  key={category.id}
                  to={`/search?areaId=${encodeURIComponent(selectedAreaId)}&categoryId=${encodeURIComponent(category.id)}`}
                  className="home-category-card group overflow-hidden rounded-xl border border-[#E8EAE8] bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-[#1DBF73]/45 hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1DBF73]/20"
                >
                  <div className="relative h-28 overflow-hidden bg-[#E9EEE9]">
                    <img
                      src={
                        categoryPhotos[category.slug] ??
                        categoryPhotos["home-repair"]
                      }
                      alt={`${category.name} service at work`}
                      loading="lazy"
                      decoding="async"
                      className="size-full object-cover transition duration-300 group-hover:scale-[1.04]"
                    />
                    <span className="absolute bottom-3 left-3 grid size-9 place-items-center rounded-lg bg-white text-[#168A55] shadow-sm">
                      <Icon size={18} aria-hidden="true" />
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold tracking-tight">
                      {category.name}
                    </h3>
                    <p className="mt-1 min-h-10 text-sm leading-5 text-slate-600">
                      {categoryBlurbs[category.slug] ??
                        "Explore local services and compare providers."}
                    </p>
                    <p className="mt-2 flex items-center justify-between text-xs text-slate-600">
                      {category.listingCount}{" "}
                      {category.listingCount === 1 ? "listing" : "listings"}
                      <ArrowRight
                        size={15}
                        className="text-[#168A55] transition group-hover:translate-x-1"
                        aria-hidden="true"
                      />
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="border-y border-[#E8EAE8] bg-white py-10 md:py-14">
        <div className="shell-container">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#168A55]">
                Chosen for your area
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                Top rated in {selectedArea?.name ?? "Samundri"}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Compare real services and customer ratings.
              </p>
            </div>
            <Link
              to={`/search?areaId=${encodeURIComponent(selectedAreaId)}&sort=rating`}
              className="hidden min-h-11 items-center gap-2 text-sm font-bold text-[#168A55] transition hover:text-[#19A463] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1DBF73] sm:inline-flex"
            >
              View all <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>

          {cityQuery.isPending ||
          areasLoading ||
          (Boolean(cityId && areaId) && listingsQuery.isPending) ? (
            <div
              className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
              role="status"
              aria-label="Loading top rated providers"
            >
              {Array.from({ length: 4 }, (_, index) => (
                <div
                  key={index}
                  className="h-80 animate-pulse rounded-xl bg-cream-100"
                />
              ))}
            </div>
          ) : areasError || cityQuery.isError || listingsQuery.isError ? (
            <div
              className="mt-6 rounded-xl border border-rose-600/20 bg-cream-50 p-5"
              role="alert"
            >
              <p className="text-sm text-slate-600">
                {areasError ?? "Top rated services could not be loaded."}
              </p>
              <button
                type="button"
                onClick={() => void listingsQuery.refetch()}
                className="mt-3 min-h-10 rounded-lg border border-ink/20 px-4 text-sm font-medium"
              >
                Try again
              </button>
            </div>
          ) : selectedAreaId && listingsQuery.data?.length ? (
            <div className="home-reveal mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {listingsQuery.data.map((listing) => {
                return (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    fallbackImageUrl={
                      categoryPhotos[listing.categorySlug] ??
                      categoryPhotos["home-repair"]
                    }
                  />
                );
              })}
            </div>
          ) : (
            <div className="mt-7 rounded-2xl border border-cream-100 bg-cream-50 px-5 py-8 text-center">
              <p className="font-semibold text-ink">
                No providers in {selectedArea?.name ?? "this area"} yet.
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Try another locality to explore available services.
              </p>
            </div>
          )}
          <Link
            to={`/search?areaId=${encodeURIComponent(selectedAreaId)}&sort=rating`}
            className="mt-5 inline-flex min-h-11 items-center text-sm font-bold text-[#168A55] underline sm:hidden"
          >
            View all services
          </Link>
        </div>
      </section>

      <section
        id="how-it-works"
        className="relative isolate overflow-hidden bg-[#252724] py-10 text-white md:py-14"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-40 size-96 rounded-full border border-white/[0.06]"
        />
        <div className="shell-container">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#55D99A]">
            Simple by design
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Good help, without the guesswork.
          </h2>
          <div className="home-reveal mt-7 grid gap-4 sm:grid-cols-3">
            {[
              [
                "01",
                "Choose a service",
                "Compare listings, prices and ratings in your Samundri area.",
              ],
              [
                "02",
                "Request a time",
                "Send a booking request with your time, address and notes.",
              ],
              [
                "03",
                "Get it done",
                "The provider accepts or declines. When the job is done, leave a review.",
              ],
            ].map(([number, title, description]) => (
              <article
                key={number}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition duration-300 hover:border-white/20 hover:bg-white/[0.07] sm:p-6"
              >
                <span className="grid size-10 place-items-center rounded-full bg-[#1DBF73]/20 text-sm font-bold text-[#55D99A]">
                  {number}
                </span>
                <h3 className="mt-5 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {reviewsQuery.isPending ? (
        <section
          className="shell-container py-10 md:py-14"
          aria-label="Loading recent reviews"
          role="status"
        >
          <div className="h-7 w-48 animate-pulse rounded bg-cream-100" />
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                className="h-36 animate-pulse rounded-xl bg-cream-100"
              />
            ))}
          </div>
        </section>
      ) : reviewsQuery.isError ? (
        <section className="shell-container py-8" aria-label="Recent reviews">
          <div
            className="rounded-xl border border-rose-600/20 bg-white p-5"
            role="alert"
          >
            <h2 className="font-semibold">Recent reviews are unavailable.</h2>
            <button
              type="button"
              onClick={() => void reviewsQuery.refetch()}
              className="mt-3 min-h-10 rounded-lg border border-ink/20 px-4 text-sm font-medium"
            >
              Try again
            </button>
          </div>
        </section>
      ) : reviewsQuery.data?.length ? (
        <section
          className="shell-container py-10 md:py-14"
          aria-label="Recent reviews"
        >
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#168A55]">
                Customer feedback
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                Recent reviews
              </h2>
            </div>
          </div>
          <div className="home-reveal mt-6 grid gap-4 md:grid-cols-3">
            {reviewsQuery.data.map((review) => (
              <article
                key={review.id}
                className="flex h-full flex-col rounded-xl border border-[#E8EAE8] bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:p-6"
              >
                <p
                  className="text-sm font-medium text-amber-500"
                  aria-label={`${review.rating} out of 5 stars`}
                >
                  {"★".repeat(review.rating)}
                  {"☆".repeat(5 - review.rating)}
                </p>
                <Link
                  to={`/listings/${review.listing_id}`}
                  className="mt-4 block font-bold leading-6 hover:text-[#168A55] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1DBF73]"
                >
                  {review.listingTitle}
                </Link>
                {review.comment && (
                  <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">
                    “{review.comment.slice(0, 160)}
                    {review.comment.length > 160 ? "…" : ""}”
                  </p>
                )}
                <p className="mt-5 flex items-center gap-2 border-t border-[#E8EAE8] pt-4 text-xs text-slate-600">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#E3F7EC] text-xs font-bold text-[#168A55]">
                    {review.authorName.trim().slice(0, 1).toUpperCase() || "L"}
                  </span>
                  {review.authorName} ·{" "}
                  {format(new Date(review.created_at), "MMM d, yyyy")}
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
