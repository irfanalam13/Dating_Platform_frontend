import type { Profile, PublicProfile } from "@/shared/types/profile.types";

// ─── Types ────────────────────────────────────────────────────────────────────

/** "own" = logged-in user viewing their own profile (edit mode)
 *  "public" = someone else viewing another person's profile */
export type ProfileMode = "own" | "public";

export interface ProfileClientProps {
  mode: ProfileMode;
  // For own profile — pass Profile from useUserProfile()
  data?: Profile;
  // For public profile — pass PublicProfile from usePublicProfile()
  publicData?: PublicProfile;
  isLoading?: boolean;
  // Only used in "public" mode
  onLike?: () => void;
  onPass?: () => void;
  isPending?: boolean;
  // Relationship with the viewed user — drives which actions are shown.
  relationship?: "matched" | "requested" | "none";
  onMessage?: () => void;
  isMessaging?: boolean;
  // Matched state only — remove/undo the mutual match.
  onRemoveMatch?: () => void;
  isRemoving?: boolean;
}
