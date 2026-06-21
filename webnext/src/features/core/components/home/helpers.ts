import type { Profile } from "@/shared/types/profile.types";

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function displayImage(profile: Profile) {
  return profile.profile_image_url || profile.profile_image || "/default.png";
}

export type InterestKind = "like" | "superstar" | "undo";
