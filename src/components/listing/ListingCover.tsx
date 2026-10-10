import { ImageOff, Wrench } from "lucide-react";
import { useState } from "react";

import { supabase } from "../../lib/supabase";

type ListingCoverProps = {
  path: string | null;
  title: string;
  className?: string;
  imageClassName?: string;
  fallbackImageUrl?: string;
};

export function ListingCover({
  path,
  title,
  className = "",
  imageClassName = "",
  fallbackImageUrl,
}: ListingCoverProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const imageUrl = path?.trim()
    ? supabase.storage.from("listing-covers").getPublicUrl(path).data.publicUrl
    : null;
  const visibleImageUrl =
    (imageUrl && failedUrl !== imageUrl ? imageUrl : null) ??
    (fallbackImageUrl && failedUrl !== fallbackImageUrl
      ? fallbackImageUrl
      : null);

  return (
    <div className={`relative overflow-hidden bg-cream-100 ${className}`}>
      {visibleImageUrl ? (
        <img
          src={visibleImageUrl}
          alt={title}
          loading="lazy"
          decoding="async"
          onError={() => setFailedUrl(visibleImageUrl)}
          className={`size-full object-cover ${imageClassName}`}
        />
      ) : (
        <div
          role="img"
          aria-label={`${title} — image unavailable`}
          className="relative grid size-full place-items-center overflow-hidden bg-gradient-to-br from-teal-50 via-white to-cream-100 text-teal-700"
        >
          <span
            aria-hidden="true"
            className="absolute -end-8 -top-10 size-36 rounded-full border-[18px] border-teal-600/[0.06]"
          />
          <span
            aria-hidden="true"
            className="absolute -bottom-14 -start-8 size-40 rounded-full border-[20px] border-cream-100/80"
          />
          <span className="relative grid size-14 place-items-center rounded-2xl border border-white/80 bg-white/80 shadow-sm">
            {imageUrl ? (
              <ImageOff size={25} aria-hidden="true" />
            ) : (
              <Wrench size={25} aria-hidden="true" />
            )}
          </span>
          <span className="absolute bottom-3 start-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-700/70">
            LocalServe
          </span>
        </div>
      )}
    </div>
  );
}
