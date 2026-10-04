import { useEffect, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";

import { useAreas } from "../app/AreaContext";
import { ListingCard } from "../components/listing/ListingCard";
import {
  fetchPublicProviderProfiles,
  fetchSamundriCityId,
  isUuid,
  SAMUNDRI_CITY_QUERY_KEY,
} from "../lib/catalog";
import { supabase } from "../lib/supabase";

const PAGE_SIZE = 20;

type SearchCategory = { id: string; name: string; slug: string };
type SearchListingRow = {
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
type SearchListing = SearchListingRow & {
  providerName: string;
  providerVerified: boolean;
  categoryName: string;
};
type SearchResult = { listings: SearchListing[]; count: number };

async function loadCategories(): Promise<SearchCategory[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as SearchCategory[];
}

async function loadSearchResults(
  cityId: string,
  filters: {
    areaId: string;
    categoryId: string;
    query: string;
    minRating: string;
    minPrice: string;
    maxPrice: string;
    sort: string;
    page: number;
  },
): Promise<SearchResult> {
  const from = (filters.page - 1) * PAGE_SIZE;
  let request = supabase
    .from("listings")
    .select(
      "id, provider_id, category_id, title, description, pricing_type, price_amount, currency, cover_image_path, rating_avg, rating_count",
      { count: "exact" },
    )
    .eq("city_id", cityId)
    .eq("area_id", filters.areaId)
    .eq("is_active", true);

  if (filters.categoryId)
    request = request.eq("category_id", filters.categoryId);
  if (filters.minRating)
    request = request.gte("rating_avg", Number(filters.minRating));
  if (filters.minPrice)
    request = request.gte("price_amount", Number(filters.minPrice));
  if (filters.maxPrice)
    request = request.lte("price_amount", Number(filters.maxPrice));

  const safeQuery = filters.query
    .trim()
    .replace(/[^a-zA-Z0-9\s-]/g, " ")
    .replace(/\s+/g, " ");
  if (safeQuery) {
    const [profilesByName, categoriesByName] = await Promise.all([
      fetchPublicProviderProfiles({
        providerIds: null,
        cityId,
        areaId: filters.areaId,
        nameQuery: safeQuery,
      }),
      supabase
        .from("categories")
        .select("id")
        .eq("is_active", true)
        .ilike("name", `%${safeQuery}%`),
    ]);
    if (categoriesByName.error) throw categoriesByName.error;

    const terms = [
      `title.ilike.%${safeQuery}%`,
      `description.ilike.%${safeQuery}%`,
    ];
    const matchingProviderIds = profilesByName.map((profile) => profile.id);
    const matchingCategoryIds = (categoriesByName.data ?? []).map(
      (category) => category.id,
    );
    if (matchingProviderIds.length) {
      terms.push(`provider_id.in.(${matchingProviderIds.join(",")})`);
    }
    if (matchingCategoryIds.length) {
      terms.push(`category_id.in.(${matchingCategoryIds.join(",")})`);
    }
    request = request.or(terms.join(","));
  }

  if (filters.sort === "price_asc") {
    request = request.order("price_amount", { ascending: true });
  } else if (filters.sort === "price_desc") {
    request = request.order("price_amount", { ascending: false });
  } else if (filters.sort === "newest") {
    request = request.order("created_at", { ascending: false });
  } else {
    request = request
      .order("rating_avg", { ascending: false })
      .order("rating_count", { ascending: false });
  }

  const { data, error, count } = await request.range(
    from,
    from + PAGE_SIZE - 1,
  );
  if (error) throw error;
  const rows = (data ?? []) as SearchListingRow[];
  if (rows.length === 0) return { listings: [], count: count ?? 0 };

  const providerIds = [...new Set(rows.map((row) => row.provider_id))];
  const categoryIds = [...new Set(rows.map((row) => row.category_id))];
  const [profilesResult, categoriesResult] = await Promise.all([
    fetchPublicProviderProfiles({
      providerIds,
      cityId,
      areaId: filters.areaId,
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

  return {
    count: count ?? rows.length,
    listings: rows.map((row) => {
      const profile = profiles.get(row.provider_id);
      return {
        ...row,
        providerName:
          profile?.display_name?.trim() || "Provider details unavailable",
        providerVerified: profile?.is_verified ?? false,
        categoryName: categories.get(row.category_id) ?? "Local service",
      };
    }),
  };
}

export function SearchPage() {
  const {
    areas,
    selectedAreaId,
    selectedArea,
    setSelectedAreaId,
    loading: areasLoading,
    error: areasError,
  } = useAreas();
  const [searchParams, setSearchParams] = useSearchParams();
  const [draftQuery, setDraftQuery] = useState(searchParams.get("q") ?? "");
  const [draftMinRating, setDraftMinRating] = useState(
    searchParams.get("minRating") ?? "",
  );
  const [draftMinPrice, setDraftMinPrice] = useState(
    searchParams.get("priceMin") ?? "",
  );
  const [draftMaxPrice, setDraftMaxPrice] = useState(
    searchParams.get("priceMax") ?? "",
  );

  const requestedArea = searchParams.get("areaId") ?? "";
  const areaId = areas.some((area) => area.id === requestedArea)
    ? requestedArea
    : selectedAreaId;
  const validAreaId = isUuid(areaId) ? areaId : null;
  const categoryId = searchParams.get("categoryId") ?? "";
  const query = searchParams.get("q") ?? "";
  const minRating = searchParams.get("minRating") ?? "";
  const minPrice = searchParams.get("priceMin") ?? "";
  const maxPrice = searchParams.get("priceMax") ?? "";
  const sort = searchParams.get("sort") ?? "rating";
  const pageValue = Number(searchParams.get("page") ?? 1);
  const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;

  useEffect(() => {
    setDraftQuery(query);
    setDraftMinRating(minRating);
    setDraftMinPrice(minPrice);
    setDraftMaxPrice(maxPrice);
  }, [query, minRating, minPrice, maxPrice]);

  useEffect(() => {
    if (
      !areasLoading &&
      requestedArea &&
      areas.some((area) => area.id === requestedArea) &&
      requestedArea !== selectedAreaId
    ) {
      setSelectedAreaId(requestedArea);
    }
  }, [areas, areasLoading, requestedArea, selectedAreaId, setSelectedAreaId]);
  const cityQuery = useQuery({
    queryKey: SAMUNDRI_CITY_QUERY_KEY,
    queryFn: fetchSamundriCityId,
  });
  const cityId = isUuid(cityQuery.data) ? cityQuery.data : null;
  const categoriesQuery = useQuery({
    queryKey: ["catalog", "active-categories"],
    queryFn: loadCategories,
  });
  const resultsQuery = useQuery({
    queryKey: [
      "search",
      cityId,
      validAreaId,
      categoryId,
      query,
      minRating,
      minPrice,
      maxPrice,
      sort,
      page,
    ],
    queryFn: () => {
      if (!cityId || !validAreaId) {
        throw new Error("Choose an active Samundri locality.");
      }
      return loadSearchResults(cityId, {
        areaId: validAreaId,
        categoryId,
        query,
        minRating,
        minPrice,
        maxPrice,
        sort,
        page,
      });
    },
    enabled: isUuid(cityId) && isUuid(validAreaId),
  });

  useEffect(() => {
    const areaName = selectedArea?.name ?? "Samundri";
    const categoryName = categoriesQuery.data?.find(
      (category) => category.id === categoryId,
    )?.name;
    document.title = `${categoryName ? `${categoryName} in ` : "Services in "}${areaName} · LocalServe`;
    return () => {
      document.title = "LocalServe";
    };
  }, [categoriesQuery.data, categoryId, selectedArea?.name]);

  function updateParams(next: Record<string, string>, resetPage = true) {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    if (resetPage) params.delete("page");
    setSearchParams(params);
  }

  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateParams({
      areaId,
      q: draftQuery.trim(),
      minRating: draftMinRating,
      priceMin: draftMinPrice,
      priceMax: draftMaxPrice,
    });
  }

  const totalPages = Math.max(
    1,
    Math.ceil((resultsQuery.data?.count ?? 0) / PAGE_SIZE),
  );

  return (
    <div className="shell-container py-8 md:py-10">
      <header className="mb-7 border-b border-cream-100 pb-5">
        <p className="text-xs font-semibold uppercase text-slate-600">
          Samundri services
        </p>
        <h1 className="mt-2 text-3xl font-semibold">
          Services in {selectedArea?.name ?? "Samundri"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {resultsQuery.data
            ? `${resultsQuery.data.count} services found`
            : "Find and compare local providers."}
        </p>
      </header>

      <div className="grid gap-8 md:grid-cols-[240px_minmax(0,1fr)]">
        <form
          onSubmit={submitFilters}
          className="h-fit rounded-xl border border-cream-100 bg-white p-4 shadow-sm"
        >
          <div className="mb-5">
            <label
              htmlFor="search-area"
              className="mb-1 block text-sm font-medium"
            >
              Samundri area
            </label>
            <select
              id="search-area"
              value={areaId}
              onChange={(event) => {
                setSelectedAreaId(event.target.value);
                updateParams({ areaId: event.target.value });
              }}
              disabled={areasLoading || areas.length === 0}
              className="min-h-11 w-full rounded-lg border border-slate-400/50 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-teal-600"
            >
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-5">
            <label
              htmlFor="search-category"
              className="mb-1 block text-sm font-medium"
            >
              Category
            </label>
            <select
              id="search-category"
              value={categoryId}
              onChange={(event) =>
                updateParams({ categoryId: event.target.value })
              }
              className="min-h-11 w-full rounded-lg border border-slate-400/50 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-teal-600"
            >
              <option value="">All services</option>
              {(categoriesQuery.data ?? []).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-5">
            <label
              htmlFor="search-query"
              className="mb-1 block text-sm font-medium"
            >
              Keyword
            </label>
            <input
              id="search-query"
              value={draftQuery}
              onChange={(event) => setDraftQuery(event.target.value)}
              className="min-h-11 w-full rounded-lg border border-slate-400/50 px-3 text-sm outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>
          <div className="mb-5">
            <label
              htmlFor="search-rating"
              className="mb-1 block text-sm font-medium"
            >
              Minimum rating
            </label>
            <select
              id="search-rating"
              value={draftMinRating}
              onChange={(event) => setDraftMinRating(event.target.value)}
              className="min-h-11 w-full rounded-lg border border-slate-400/50 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-teal-600"
            >
              <option value="">Any rating</option>
              <option value="3">3+ stars</option>
              <option value="4">4+ stars</option>
              <option value="4.5">4.5+ stars</option>
            </select>
          </div>
          <fieldset className="mb-5">
            <legend className="mb-1 text-sm font-medium">
              Price range (Rs.)
            </legend>
            <div className="grid grid-cols-2 gap-2">
              <label className="sr-only" htmlFor="price-min">
                Minimum price
              </label>
              <input
                id="price-min"
                type="number"
                min="0"
                inputMode="decimal"
                placeholder="Min"
                value={draftMinPrice}
                onChange={(event) => setDraftMinPrice(event.target.value)}
                className="min-h-11 min-w-0 rounded-lg border border-slate-400/50 px-2 text-sm outline-none focus:ring-2 focus:ring-teal-600"
              />
              <label className="sr-only" htmlFor="price-max">
                Maximum price
              </label>
              <input
                id="price-max"
                type="number"
                min="0"
                inputMode="decimal"
                placeholder="Max"
                value={draftMaxPrice}
                onChange={(event) => setDraftMaxPrice(event.target.value)}
                className="min-h-11 min-w-0 rounded-lg border border-slate-400/50 px-2 text-sm outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
          </fieldset>
          <button
            type="submit"
            className="min-h-11 w-full rounded-xl bg-teal-600 px-4 text-sm font-medium text-white hover:bg-teal-700"
          >
            Apply filters
          </button>
        </form>

        <section aria-label="Search results">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              {resultsQuery.data
                ? `${resultsQuery.data.count} results`
                : "Results"}
            </p>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-slate-600">Sort</span>
              <select
                value={sort}
                onChange={(event) => updateParams({ sort: event.target.value })}
                className="min-h-11 rounded-lg border border-slate-400/50 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-teal-600"
              >
                <option value="rating">Highest rated</option>
                <option value="price_asc">Price: low to high</option>
                <option value="price_desc">Price: high to low</option>
                <option value="newest">Newest</option>
              </select>
            </label>
          </div>

          {areasLoading ||
          cityQuery.isPending ||
          (Boolean(areaId) && resultsQuery.isPending) ? (
            <div
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              role="status"
              aria-label="Loading search results"
            >
              {Array.from({ length: 6 }, (_, index) => (
                <div
                  key={index}
                  className="h-80 animate-pulse rounded-xl bg-cream-100"
                />
              ))}
            </div>
          ) : areasError ||
            cityQuery.isError ||
            categoriesQuery.isError ||
            resultsQuery.isError ? (
            <div
              className="rounded-xl border border-rose-600/20 bg-white p-5"
              role="alert"
            >
              <p className="text-sm text-slate-600">
                {areasError ?? "Services could not be loaded."}
              </p>
              <button
                type="button"
                onClick={() => {
                  void cityQuery.refetch();
                  void categoriesQuery.refetch();
                  void resultsQuery.refetch();
                }}
                className="mt-3 min-h-10 rounded-lg border border-ink/20 px-4 text-sm font-medium"
              >
                Try again
              </button>
            </div>
          ) : !areaId ? (
            <p className="rounded-xl bg-white p-5 text-sm text-slate-600">
              Samundri areas are not available right now.
            </p>
          ) : resultsQuery.data?.listings.length ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {resultsQuery.data.listings.map((listing) => {
                  return <ListingCard key={listing.id} listing={listing} />;
                })}
              </div>
              {totalPages > 1 && (
                <nav
                  aria-label="Search result pages"
                  className="mt-7 flex items-center justify-center gap-4"
                >
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() =>
                      updateParams({ page: String(page - 1) }, false)
                    }
                    className="min-h-11 rounded-lg border border-ink/20 bg-white px-4 text-sm disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-slate-600">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() =>
                      updateParams({ page: String(page + 1) }, false)
                    }
                    className="min-h-11 rounded-lg border border-ink/20 bg-white px-4 text-sm disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              )}
            </>
          ) : (
            <p className="rounded-xl bg-white p-5 text-sm text-slate-600">
              No services match. Try another category or area.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
