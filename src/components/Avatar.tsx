import { useState } from "react";

import { supabase } from "../lib/supabase";

type AvatarProps = {
  avatarPath: string | null | undefined;
  name: string;
  size: number;
};

export function Avatar({ avatarPath, name, size }: AvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const initials = name.trim().charAt(0).toUpperCase() || "U";
  const style = { width: size, height: size };
  const imageUrl = avatarPath
    ? supabase.storage.from("profile-images").getPublicUrl(avatarPath).data
        .publicUrl
    : null;

  if (imageUrl && failedUrl !== imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        style={style}
        className="block shrink-0 rounded-full object-cover"
        onError={() => setFailedUrl(imageUrl)}
      />
    );
  }

  return (
    <span
      role="img"
      aria-label={name}
      style={{ ...style, fontSize: Math.max(10, size * 0.4) }}
      className="grid shrink-0 place-items-center rounded-full bg-[#1DBF73] font-semibold text-white"
    >
      {initials}
    </span>
  );
}