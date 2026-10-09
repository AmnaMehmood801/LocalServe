import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Brush,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Hammer,
  House,
  MapPin,
  Search,
  ShieldCheck,
  Snowflake,
  Star,
  Wrench,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useAreas } from "../app/AreaContext";
import { Avatar } from "../components/Avatar";
import { ListingCard } from "../components/listing/ListingCard";
import { SelectMenu } from "../components/ui/SelectMenu";
import {
  fetchPublicProviderProfiles,
  fetchSamundriCityId,
  isUuid,
  SAMUNDRI_CITY_QUERY_KEY,
} from "../lib/catalog";
import { getAreaGroup } from "../lib/areaGroups";
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
type ReviewTheme = {
  backgroundColor: string;
  textColor: string;
  quoteColor: string;
  avatarColor: string;
  avatarTextColor: string;
  dividerColor: string;
};

const reviewThemes: ReviewTheme[] = [
  {
    backgroundColor: "#3F4246",
    textColor: "#FFFFFF",
    quoteColor: "#34C98A",
    avatarColor: "#19A463",
    avatarTextColor: "#FFFFFF",
    dividerColor: "rgba(255, 255, 255, 0.2)",
  },
  {
    backgroundColor: "#1F6F4F",
    textColor: "#FFFFFF",
    quoteColor: "#A7E8C8",
    avatarColor: "#CFE9DB",
    avatarTextColor: "#1F3A2E",
    dividerColor: "rgba(255, 255, 255, 0.24)",
  },
  {
    backgroundColor: "#CFE9DB",
    textColor: "#1F3A2E",
    quoteColor: "#19A463",
    avatarColor: "#19A463",
    avatarTextColor: "#FFFFFF",
    dividerColor: "rgba(31, 58, 46, 0.2)",
  },
  {
    backgroundColor: "#E6E9EC",
    textColor: "#2B2E33",
    quoteColor: "#19A463",
    avatarColor: "#19A463",
    avatarTextColor: "#FFFFFF",
    dividerColor: "rgba(43, 46, 51, 0.18)",
  },
];

const categoryIcons: Record<string, typeof Wrench> = {
  electrician: Wrench,
  plumbing: Droplets,
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
  ac: "/ac-repair.jpg",
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

function ReviewCard({
  review,
  theme,
  active = true,
  interactive = true,
}: {
  review: HomeReview;
  theme: ReviewTheme;
  active?: boolean;
  interactive?: boolean;
}) {
  return (
    <article
      style={{
        backgroundColor: theme.backgroundColor,
        color: theme.textColor,
        borderColor: theme.dividerColor,
      }}
      className="relative flex h-full w-full shrink-0 flex-col rounded-2xl border p-6 text-left shadow-md transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:shadow-xl sm:p-8 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <span
        aria-hidden="true"
        style={{ color: theme.quoteColor }}
        className="pointer-events-none absolute left-6 top-4 z-0 font-serif text-[36px] leading-none"
      >
        “
      </span>
      <span
        aria-hidden="true"
        style={{ color: theme.quoteColor }}
        className="pointer-events-none absolute bottom-4 right-6 z-0 font-serif text-[32px] leading-none"
      >
        ”
      </span>
      <div
        className={`relative z-10 flex min-h-0 flex-1 flex-col transition-[opacity,transform] duration-[300ms] delay-0 motion-reduce:transition-none motion-reduce:delay-0 ${
          active ? "translate-y-0 opacity-100" : "translate-y-2 opacity-80"
        }`}
      >
        <div
          className="mt-10 flex gap-1"
          aria-label={`${review.rating} out of 5 stars`}
        >
          {Array.from({ length: 5 }, (_, index) => (
            <Star
              key={index}
              size={14}
              style={{
                color: "#F5B301",
                fill: index < review.rating ? "#F5B301" : "transparent",
              }}
              strokeWidth={1.75}
              aria-hidden="true"
            />
          ))}
        </div>
        <div className="mt-3 flex min-h-0 flex-1 items-center">
          {review.comment?.trim() ? (
            <p className="line-clamp-4 text-lg leading-7">
              {review.comment.slice(0, 160)}
              {review.comment.length > 160 ? "…" : ""}
            </p>
          ) : (
            <p className="text-lg italic">Rated without a comment</p>
          )}
        </div>
        <div
          style={{ borderColor: theme.dividerColor }}
          className="mt-auto flex min-w-0 items-center gap-3 border-t pt-4 pr-12"
        >
          <span
            style={{
              backgroundColor: theme.avatarColor,
              color: theme.avatarTextColor,
            }}
            className="grid size-11 shrink-0 place-items-center rounded-full text-sm font-bold"
          >
            {review.authorName
              .trim()
              .split(/\s+/)
              .map((part) => part.charAt(0))
              .filter(Boolean)
              .slice(0, 2)
              .join("")
              .toUpperCase() || "L"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              {review.authorName}
            </p>
            {interactive ? (
              <Link
                to={`/listings/${review.listing_id}`}
                style={{
                  color: theme.textColor,
                  textDecorationColor: theme.quoteColor,
                }}
                className="mt-0.5 block truncate text-xs underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1DBF73]"
              >
                {review.listingTitle}
              </Link>
            ) : (
              <span className="mt-0.5 block truncate text-xs">
                {review.listingTitle}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

type HomeVerifiedProvider = {
  id: string;
  displayName: string;
  avatarPath: string | null;
};

function VerifiedProvidersSection() {
  const providersQuery = useQuery({
    queryKey: ["providers", "home-verified"],
    queryFn: async (): Promise<HomeVerifiedProvider[]> => {
      const { data, error } = await supabase
        .from("profiles_public")
        .select("id, display_name, avatar_path, is_verified")
        .eq("is_verified", true)
        .limit(7);
      if (error) throw error;

      return (data ?? []).flatMap((profile) =>
        profile.id
          ? [
              {
                id: profile.id,
                displayName: profile.display_name?.trim() || "Local provider",
                avatarPath: profile.avatar_path,
              },
            ]
          : [],
      );
    },
  });
  const sectionRef = useRef<HTMLElement>(null);
  const [hasEntered, setHasEntered] = useState(false);
  const [entranceComplete, setEntranceComplete] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [hoveredTile, setHoveredTile] = useState<number | null>(null);
  const [focusedTile, setFocusedTile] = useState<number | null>(null);
  const [displayedName, setDisplayedName] = useState("");
  const [nameVisible, setNameVisible] = useState(true);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPrefersReducedMotion(true);
      setHasEntered(true);
      setEntranceComplete(true);
      return;
    }

    if (!("IntersectionObserver" in window)) {
      setHasEntered(true);
      setEntranceComplete(true);
      return;
    }

    let completionTimer = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setHasEntered(true);
        observer.disconnect();
        completionTimer = window.setTimeout(
          () => setEntranceComplete(true),
          1900,
        );
      },
      { threshold: 0.3 },
    );
    observer.observe(section);

    return () => {
      observer.disconnect();
      window.clearTimeout(completionTimer);
    };
  }, []);

  const providers = providersQuery.data ?? [];
  const tiles = Array.from({ length: 7 }, (_, index) => ({
    provider: providers[index % Math.max(1, providers.length)],
    index,
    isRepeated: index >= providers.length,
    distance: Math.abs(index - 3),
  }));
  const selectedTile = hoveredTile ?? focusedTile ?? 3;
  const selectedProvider = tiles[selectedTile]?.provider;

  useEffect(() => {
    if (!selectedProvider) return;
    if (!displayedName || prefersReducedMotion) {
      setDisplayedName(selectedProvider.displayName);
      setNameVisible(true);
      return;
    }
    if (displayedName === selectedProvider.displayName) return;

    setNameVisible(false);
    const timer = window.setTimeout(() => {
      setDisplayedName(selectedProvider.displayName);
      setNameVisible(true);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [displayedName, prefersReducedMotion, selectedProvider]);

  if (
    providersQuery.isError ||
    (providersQuery.data !== undefined && providers.length === 0)
  ) {
    return null;
  }

  const revealStyle = (delay: number) => ({
    opacity: hasEntered ? 1 : 0,
    transform: hasEntered ? "translateY(0)" : "translateY(12px)",
    transition: prefersReducedMotion
      ? "none"
      : "transform 600ms cubic-bezier(0.22, 1, 0.36, 1), opacity 600ms cubic-bezier(0.22, 1, 0.36, 1)",
    transitionDelay: hasEntered ? `${delay}ms` : "0ms",
    willChange:
      hasEntered && !entranceComplete ? "transform, opacity" : "auto",
  });

  const dimensions = (distance: number) => {
    if (distance === 0) return "size-[104px] md:size-[168px]";
    if (distance === 1) return "size-[76px] md:size-[128px]";
    if (distance === 2) return "size-[60px] md:size-[100px]";
    return "size-[80px]";
  };

  return (
    <section
      ref={sectionRef}
      aria-labelledby="verified-providers-heading"
      aria-busy={providersQuery.isPending}
      className="overflow-hidden bg-[#F7F8F7] py-12 md:py-16"
    >
      <div className="shell-container text-center">
        <p
          style={revealStyle(0)}
          className="text-sm font-semibold text-[#19A463]"
        >
          Trusted providers
        </p>
        <h2
          id="verified-providers-heading"
          style={revealStyle(100)}
          className="mt-2 text-2xl font-semibold text-[#404145] sm:text-3xl"
        >
          Verified providers you can trust
        </h2>
        <p
          style={revealStyle(200)}
          className="mt-2 whitespace-nowrap text-sm text-slate-600"
        >
          Every provider here is checked by LocalServe.
        </p>

        <div
          className="mt-9 flex items-end justify-center -space-x-4 md:-space-x-6"
          role={providersQuery.isPending ? "status" : undefined}
          aria-label={providersQuery.isPending ? "Loading verified providers" : undefined}
        >
          {providersQuery.isPending
            ? Array.from({ length: 7 }, (_, index) => {
                const distance = Math.abs(index - 3);
                return (
                  <div
                    key={index}
                    aria-hidden="true"
                    className={`${dimensions(distance)} shrink-0 rounded-[20px] bg-[#E3F7EC] animate-pulse motion-reduce:animate-none ${
                      distance === 3 ? "hidden md:block" : ""
                    }`}
                  />
                );
              })
            : tiles.map(({ provider, index, isRepeated, distance }) => {
                if (!provider) return null;
                const isHovered = hoveredTile === index;
                const isFocused = focusedTile === index;
                const isHighlighted = isHovered || isFocused;
                const entranceInProgress = hasEntered && !entranceComplete;
                const baseOpacity = [1, 0.85, 0.65, 0.45][distance];
                const initialX = index < 3 ? 40 : index > 3 ? -40 : 0;
                const delay = 800 + distance * 120;
                const tileTransition = prefersReducedMotion
                  ? "none"
                  : entranceInProgress
                    ? "transform 700ms cubic-bezier(0.22, 1, 0.36, 1), opacity 700ms cubic-bezier(0.22, 1, 0.36, 1)"
                    : "transform 300ms cubic-bezier(0.22, 1, 0.36, 1), opacity 300ms cubic-bezier(0.22, 1, 0.36, 1)";

                return (
                  <Link
                    key={`${index}-${provider.id}`}
                    to={`/providers/${provider.id}`}
                    aria-label={`${provider.displayName}, verified provider`}
                    aria-hidden={isRepeated ? true : undefined}
                    tabIndex={isRepeated ? -1 : 0}
                    onMouseEnter={() => setHoveredTile(index)}
                    onMouseLeave={() => setHoveredTile(null)}
                    onFocus={() => setFocusedTile(index)}
                    onBlur={() => setFocusedTile(null)}
                    style={{
                      opacity: hasEntered
                        ? isHighlighted
                          ? 1
                          : baseOpacity
                        : 0,
                      transform: hasEntered
                        ? `translateX(0) scale(${isHighlighted ? 1.12 : 1})`
                        : `translateX(${initialX}px) scale(0.7)`,
                      transition: tileTransition,
                      transitionDelay: entranceInProgress
                        ? `${delay}ms`
                        : "0ms",
                      willChange: entranceInProgress
                        ? "transform, opacity"
                        : "auto",
                    }}
                    className={`relative z-0 block shrink-0 overflow-hidden rounded-[20px] bg-[#E3F7EC] shadow-sm outline-none transition-[transform,opacity] focus-visible:ring-2 focus-visible:ring-[#19A463] ${dimensions(distance)} [&_img]:!h-full [&_img]:!w-full [&_img]:!rounded-[20px] [&_span]:!h-full [&_span]:!w-full [&_span]:!rounded-[20px] [&_span]:!text-xl md:[&_span]:!text-3xl ${
                      distance === 3 ? "hidden md:block" : ""
                    }`}
                  >
                    <Avatar
                      avatarPath={provider.avatarPath}
                      name={provider.displayName}
                      size={distance === 0 ? 168 : distance === 1 ? 128 : distance === 2 ? 100 : 80}
                    />
                    {index === 3 && (
                      <span className="absolute inset-x-1 bottom-1 mx-auto inline-flex w-fit items-center gap-1 rounded-full bg-[#E3F7EC] px-2 py-1 text-[10px] font-semibold text-[#168A55] shadow-sm md:bottom-2 md:text-xs">
                        <BadgeCheck size={13} aria-hidden="true" />
                        Verified
                      </span>
                    )}
                  </Link>
                );
              })}
        </div>

        <p
          aria-live="polite"
          className="mt-4 min-h-6 text-sm font-semibold text-[#404145] transition-opacity duration-200 motion-reduce:transition-none"
          style={{ opacity: nameVisible ? 1 : 0 }}
        >
          {providersQuery.isPending ? " " : displayedName}
        </p>
      </div>
    </section>
  );
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
  const [activeReviewIndex, setActiveReviewIndex] = useState(0);
  const [reviewTrackOffset, setReviewTrackOffset] = useState(0);
  const [reviewTrackTransition, setReviewTrackTransition] = useState(true);
  const [reviewHovered, setReviewHovered] = useState(false);
  const [reviewFocused, setReviewFocused] = useState(false);
  const reviewViewportRef = useRef<HTMLDivElement>(null);
  const reviewTrackRef = useRef<HTMLDivElement>(null);
  const reviewResetInProgressRef = useRef(false);

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
  const hasRatedListing = (listingsQuery.data ?? []).some(
    (listing) => listing.rating_count > 0,
  );
  const loadedReviews = reviewsQuery.data ?? [];
  const repeatedReviews = Array.from({ length: 3 }, (_, copyIndex) =>
    loadedReviews.map((review, reviewIndex) => ({
      review,
      copyIndex,
      reviewIndex,
      trackIndex: copyIndex * loadedReviews.length + reviewIndex,
    })),
  ).flat();

  useLayoutEffect(() => {
    const count = loadedReviews.length;
    if (count === 0) return;

    setReviewTrackTransition(false);
    setActiveReviewIndex(count > 1 ? count : 0);
    requestAnimationFrame(() => setReviewTrackTransition(true));
  }, [loadedReviews.length]);

  useLayoutEffect(() => {
    const viewport = reviewViewportRef.current;
    const track = reviewTrackRef.current;
    const firstCard = track?.firstElementChild;
    if (!viewport || !track || !(firstCard instanceof HTMLElement)) return;

    const updateOffset = () => {
      const cardWidth = firstCard.offsetWidth;
      const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 24;
      const nextOffset =
        viewport.clientWidth / 2 -
        cardWidth / 2 -
        activeReviewIndex * (cardWidth + gap);
      setReviewTrackOffset((current) =>
        Math.abs(current - nextOffset) < 0.5 ? current : nextOffset,
      );
    };

    updateOffset();
    const observer = new ResizeObserver(updateOffset);
    observer.observe(viewport);
    observer.observe(firstCard);
    window.addEventListener("resize", updateOffset);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateOffset);
    };
  }, [activeReviewIndex, loadedReviews.length]);

  useLayoutEffect(() => {
    const count = loadedReviews.length;
    if (
      count <= 1 ||
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      (activeReviewIndex >= count && activeReviewIndex < count * 2)
    ) {
      return;
    }

    setActiveReviewIndex(
      count + (((activeReviewIndex % count) + count) % count),
    );
  }, [activeReviewIndex, loadedReviews.length]);

  useEffect(() => {
    if (loadedReviews.length <= 1 || reviewHovered || reviewFocused) return;

    const interval = window.setInterval(() => {
      setActiveReviewIndex((current) => current + 1);
    }, 3000);

    return () => window.clearInterval(interval);
  }, [loadedReviews.length, reviewHovered, reviewFocused]);

  const moveToReview = (reviewIndex: number) => {
    const count = loadedReviews.length;
    if (count <= 1 || reviewResetInProgressRef.current) return;

    const candidates = [
      reviewIndex,
      reviewIndex + count,
      reviewIndex + count * 2,
    ];
    const target = candidates.reduce((closest, candidate) =>
      Math.abs(candidate - activeReviewIndex) <
      Math.abs(closest - activeReviewIndex)
        ? candidate
        : closest,
    );
    setActiveReviewIndex(target);
  };

  const handleReviewTrackTransitionEnd = (
    event: React.TransitionEvent<HTMLDivElement>,
  ) => {
    if (
      event.target !== event.currentTarget ||
      event.propertyName !== "transform"
    ) {
      return;
    }

    const count = loadedReviews.length;
    if (
      count <= 1 ||
      (activeReviewIndex >= count && activeReviewIndex < count * 2)
    ) {
      return;
    }

    reviewResetInProgressRef.current = true;
    setReviewTrackTransition(false);
    setActiveReviewIndex(
      count + (((activeReviewIndex % count) + count) % count),
    );
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setReviewTrackTransition(true);
        reviewResetInProgressRef.current = false;
      }),
    );
  };

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
            <p className="mt-4 max-w-2xl text-balance text-sm leading-6 text-white/85 sm:mt-5 sm:text-lg sm:leading-7">
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
                  id="home-category"
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
                  id="home-area"
                  value={selectedAreaId}
                  onChange={setSelectedAreaId}
                  options={areas.map((area) => ({
                    value: area.id,
                    label: area.name,
                    group: getAreaGroup(area.slug),
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
          <div className="home-reveal mt-6 grid items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {featuredCategories.map((category) => {
              const Icon = categoryIcons[category.slug] ?? Wrench;
              return (
                <Link
                  key={category.id}
                  to={`/search?areaId=${encodeURIComponent(selectedAreaId)}&categoryId=${encodeURIComponent(category.id)}`}
                  className="home-category-card group flex h-full flex-col overflow-hidden rounded-xl border border-[#E8EAE8] bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-[#1DBF73]/45 hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1DBF73]/20"
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
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="font-bold tracking-tight">
                      {category.name}
                    </h3>
                    <p className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-slate-600">
                      {categoryBlurbs[category.slug] ??
                        "Explore local services and compare providers."}
                    </p>
                    <p className="mt-auto flex items-center justify-between pt-2 text-xs text-slate-600">
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
                {hasRatedListing ? "Chosen for your area" : "IN YOUR AREA"}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                {hasRatedListing
                  ? `Top rated in ${selectedArea?.name ?? "Samundri"}`
                  : `Services in ${selectedArea?.name ?? "Samundri"}`}
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
          className="home-review-section shell-container py-10 md:py-14"
          aria-label="Recent reviews"
          onMouseEnter={() => setReviewHovered(true)}
          onMouseLeave={() => setReviewHovered(false)}
          onFocusCapture={() => setReviewFocused(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node)) {
              setReviewFocused(false);
            }
          }}
        >
          <div className="text-center">
            <p className="text-sm text-slate-500">Happy customers</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Loved by our customers
            </h2>
          </div>

          {loadedReviews.length === 1 ? (
            <div className="mx-auto mt-8 aspect-square w-[260px] sm:w-[320px]">
              <ReviewCard review={loadedReviews[0]} theme={reviewThemes[0]} />
            </div>
          ) : (
            <>
              <div className="mx-auto mt-8 grid w-full max-w-[1120px] grid-cols-2 items-center gap-x-4 gap-y-4 sm:grid-cols-[40px_minmax(0,1fr)_40px] sm:gap-4">
                <button
                  type="button"
                  aria-label="Previous review"
                  onClick={() => {
                    if (reviewResetInProgressRef.current) return;
                    setActiveReviewIndex((current) => current - 1);
                  }}
                  className="col-start-1 row-start-2 grid size-10 place-items-center justify-self-start rounded-full border border-slate-300 bg-white text-[#404145] shadow-sm transition-[transform,box-shadow,border-color,background-color] duration-200 hover:scale-[1.06] hover:border-[#1DBF73] hover:bg-[#E3F7EC] hover:shadow-md active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1DBF73] motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100 sm:row-start-1"
                >
                  <ChevronLeft size={20} aria-hidden="true" />
                </button>

                <div
                  ref={reviewViewportRef}
                  className="-mx-4 col-span-2 row-start-1 h-[260px] min-w-0 w-[calc(100%+2rem)] overflow-hidden sm:mx-0 sm:col-span-1 sm:col-start-2 sm:h-[320px] sm:w-full"
                >
                  <div
                    ref={reviewTrackRef}
                    onTransitionEnd={handleReviewTrackTransitionEnd}
                    className={`flex h-full w-max items-center gap-4 will-change-transform sm:gap-6 ${
                      reviewTrackTransition
                        ? "transition-transform duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                        : "transition-none"
                    } motion-reduce:transition-none`}
                    style={{ transform: `translateX(${reviewTrackOffset}px)` }}
                  >
                    {repeatedReviews.map(
                      ({ review, copyIndex, reviewIndex, trackIndex }) => {
                        const isActive = trackIndex === activeReviewIndex;
                        const distance = Math.abs(
                          trackIndex - activeReviewIndex,
                        );
                        const scale =
                          distance === 0 ? 1 : distance === 1 ? 0.8 : 0.65;
                        const opacity =
                          distance === 0 ? 1 : distance === 1 ? 0.6 : 0;

                        return (
                          <div
                            key={`${copyIndex}-${review.id}`}
                            aria-hidden={copyIndex === 1 ? undefined : true}
                            className={`relative aspect-square w-[260px] shrink-0 will-change-[transform,opacity] transition-[transform,opacity] duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none sm:w-[320px] ${
                              isActive
                                ? "z-20 pointer-events-auto"
                                : distance === 1
                                  ? "z-10 pointer-events-none"
                                  : "z-0 pointer-events-none"
                            }`}
                            style={{
                              transform: `scale(${scale})`,
                              opacity,
                            }}
                          >
                            <ReviewCard
                              review={review}
                              theme={reviewThemes[reviewIndex % 4]}
                              active={isActive}
                              interactive={copyIndex === 1 && isActive}
                            />
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  aria-label="Next review"
                  onClick={() => {
                    if (reviewResetInProgressRef.current) return;
                    setActiveReviewIndex((current) => current + 1);
                  }}
                  className="col-start-2 row-start-2 grid size-10 place-items-center justify-self-end rounded-full border border-slate-300 bg-white text-[#404145] shadow-sm transition-[transform,box-shadow,border-color,background-color] duration-200 hover:scale-[1.06] hover:border-[#1DBF73] hover:bg-[#E3F7EC] hover:shadow-md active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1DBF73] motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100 sm:col-start-3 sm:row-start-1"
                >
                  <ChevronRight size={20} aria-hidden="true" />
                </button>
              </div>
              <div
                className="mt-5 flex items-center justify-center gap-2"
                role="group"
                aria-label="Review pages"
              >
                {loadedReviews.map((review, index) => {
                  const isActive =
                    activeReviewIndex % loadedReviews.length === index;
                  return (
                    <button
                      key={review.id}
                      type="button"
                      onClick={() => moveToReview(index)}
                      className={`h-2.5 rounded-full transition-[width,background-color] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1DBF73] focus-visible:ring-offset-2 motion-reduce:transition-none ${
                        isActive ? "w-8 bg-[#19A463]" : "w-2.5 bg-slate-300"
                      }`}
                      aria-label={`Go to review ${index + 1}`}
                      aria-current={isActive ? "true" : undefined}
                    />
                  );
                })}
              </div>
            </>
          )}
        </section>
      ) : null}
      <VerifiedProvidersSection />
    </div>
  );
}
