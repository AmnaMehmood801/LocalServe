import { ArrowUpRight, MapPin, Star } from "lucide-react";
import { Link } from "react-router-dom";

import { ListingCover } from "./ListingCover";

export type ListingCardData = {
  id: string;
  provider_id: string;
  title: string;
  categoryName: string;
  providerName: string;
  providerVerified: boolean;
  rating_avg: number;
  rating_count: number;
  pricing_type: "hourly" | "fixed";
  price_amount: number;
  cover_image_path: string | null;
};

export function ListingCard({
  listing,
  fallbackImageUrl,
}: {
  listing: ListingCardData;
  fallbackImageUrl?: string;
}) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-cream-100 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-teal-600/25 hover:shadow-lg">
      <Link
        to={`/listings/${listing.id}`}
        aria-label={`View ${listing.title}`}
        className="relative block aspect-[4/3] overflow-hidden bg-cream-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-teal-600/40"
      >
        <ListingCover
          path={listing.cover_image_path}
          title={listing.title}
          className="size-full"
          imageClassName="transition duration-500 group-hover:scale-[1.025]"
          fallbackImageUrl={fallbackImageUrl}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy-950/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        />
        {listing.providerVerified && (
          <span className="absolute left-3 top-3 inline-flex min-h-7 items-center gap-1.5 rounded-full border border-white/70 bg-white/95 px-2.5 text-xs font-semibold text-teal-700 shadow-sm backdrop-blur">
            <span
              className="size-1.5 rounded-full bg-teal-600"
              aria-hidden="true"
            />
            Verified
          </span>
        )}
        <span className="absolute bottom-3 right-3 grid size-9 place-items-center rounded-full bg-white/95 text-ink shadow-sm transition duration-300 group-hover:bg-teal-600 group-hover:text-white">
          <ArrowUpRight size={17} aria-hidden="true" />
        </span>
      </Link>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <p className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
          <MapPin size={13} aria-hidden="true" />
          {listing.categoryName} · Samundri
        </p>
        <h2 className="mt-2 line-clamp-2 text-base font-semibold leading-6 tracking-tight text-ink sm:min-h-12">
          <Link
            to={`/listings/${listing.id}`}
            className="rounded-sm transition-colors hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
          >
            {listing.title}
          </Link>
        </h2>
        <Link
          to={`/providers/${listing.provider_id}`}
          className="mt-2 inline-flex min-h-8 max-w-full items-center self-start truncate rounded-sm text-sm text-slate-600 transition hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
        >
          {listing.providerName}
        </Link>
        <div className="mt-3 flex min-h-5 items-center justify-between gap-3">
          <p
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink"
            aria-label={
              listing.rating_count > 0
                ? `${Number(listing.rating_avg).toFixed(1)} out of 5 from ${listing.rating_count} reviews`
                : "No reviews yet"
            }
          >
            {listing.rating_count > 0 ? (
              <>
                <Star
                  size={15}
                  className="fill-amber-500 text-amber-500"
                  aria-hidden="true"
                />
                {Number(listing.rating_avg).toFixed(1)}
                <span className="font-normal text-slate-600">
                  ({listing.rating_count})
                </span>
              </>
            ) : (
              <span className="text-slate-600">New</span>
            )}
          </p>
        </div>
        <p className="mt-3 border-t border-cream-100 pt-3 font-semibold text-ink">
          Rs.{" "}
          {new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(
            Number(listing.price_amount),
          )}
          <span className="ml-1 font-normal text-slate-600">
            {listing.pricing_type === "hourly" ? " / hr" : " fixed"}
          </span>
        </p>
        <div className="mt-auto flex gap-2 pt-4">
          <Link
            to={`/listings/${listing.id}/request`}
            className="inline-flex h-10 flex-[1.3] items-center justify-center whitespace-nowrap rounded-xl bg-teal-600 px-3 text-center text-sm font-semibold text-white transition hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-600/25"
          >
            Book now
          </Link>
          <Link
            to={`/listings/${listing.id}`}
            className="inline-flex h-10 flex-1 items-center justify-center rounded-xl border border-cream-100 px-3 text-sm font-semibold text-ink transition hover:border-teal-600/30 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-600/15"
          >
            View
          </Link>
        </div>
      </div>
    </article>
  );
}
