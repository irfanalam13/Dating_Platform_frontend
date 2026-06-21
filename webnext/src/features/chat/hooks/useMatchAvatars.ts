import { useMemo } from "react";
import { useAcceptedMatches } from "@/features/matcher/hooks/useMatches";
import { resolveImageUrl } from "@/shared/lib/mediaUrl";

/**
 * The chat/conversation serializer doesn't return a usable profile picture on
 * its participants, so chat avatars fell back to initials even for users who
 * have set a photo. Conversations, however, only exist between MATCHED users —
 * and the accepted-matches endpoint DOES return a working `profile_image` per
 * user. We build a `user_id → image` lookup from it and use that as the avatar
 * source for chat. (Unlike fetching the public profile, this logs no profile
 * view, and the query is shared/cached across all chat components.)
 */
export function useMatchAvatars(): Map<number, string> {
  const { data: accepted } = useAcceptedMatches();
  return useMemo(() => {
    const map = new Map<number, string>();
    for (const m of accepted ?? []) {
      const url = resolveImageUrl(m.profile_image);
      if (url && url !== "/default.png") map.set(m.user_id, url);
    }
    return map;
  }, [accepted]);
}

/**
 * Best avatar URL for a chat participant: prefer the image on the participant
 * payload (if the backend ever sends a real one), otherwise the matched-user
 * image. Returns null when neither exists so ProfileImage shows initials.
 */
export function pickAvatar(
  ownSrc: string | null | undefined,
  userId: number | undefined,
  matchAvatars: Map<number, string>,
): string | null {
  const own = resolveImageUrl(ownSrc);
  if (own && own !== "/default.png") return own;
  if (userId != null) return matchAvatars.get(userId) ?? null;
  return null;
}
