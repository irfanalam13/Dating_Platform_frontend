"use client";

import { useEffect, useState } from "react";
import { getInitials } from "@/shared/lib/utils";

interface ProfileImageProps {
  /** Resolved picture URL. When empty/null, the user's initials are shown instead. */
  src?: string | null;
  /** Full name used to derive the initials fallback. */
  name?: string | null;
  /** Sizing/shape classes applied to both the image and the initials fallback. */
  className?: string;
  /** Font-size classes for the initials fallback. Scale this to the avatar size. */
  textClassName?: string;
  loading?: "eager" | "lazy";
  draggable?: boolean;
  alt?: string;
}

function isRealImage(src?: string | null): boolean {
  if (!src) return false;
  const trimmed = src.trim();
  return trimmed !== "" && trimmed !== "/default.png";
}

/**
 * Shows the user's uploaded picture when one exists, otherwise renders their
 * initials on a branded background — so a brand-new profile reads as the
 * person's initials rather than a generic/default image.
 */
export default function ProfileImage({
  src,
  name,
  className = "",
  textClassName = "text-2xl",
  loading = "eager",
  draggable,
  alt,
}: ProfileImageProps) {
  const [broken, setBroken] = useState(false);

  // Re-attempt the image when the src changes (e.g. right after a new upload).
  useEffect(() => setBroken(false), [src]);

  const label = (alt || name || "Profile").trim();

  if (isRealImage(src) && !broken) {
    return (
      <img
        src={src as string}
        alt={label}
        className={`object-cover ${className}`}
        loading={loading}
        draggable={draggable}
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={label}
      // `className` is applied last so a caller can still override the default
      // background/colour if needed.
      className={`flex select-none items-center justify-center bg-[#EADDD2] font-semibold uppercase text-black ${textClassName} ${className}`}
    >
      {getInitials(name || "") || "?"}
    </div>
  );
}

