"use client";

import { use, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useUserProfile } from "@/features/profile/hooks/useProfile"; //   not usePublicProfile
import { sendInterest } from "@/shared/api/profile.api";
import {
  useAcceptedMatches, useSentMatches, useStartConversation,
} from "@/features/matcher/hooks/useMatches";
import ProfileClient from "@/features/profile/components/ProfileClient";

interface ProfilePageProps {
  params: Promise<{ id: string }>;
}

export default function ProfilePage({ params }: ProfilePageProps) {
  const { id } = use(params);
  const numericId = parseInt(id, 10);
  const router = useRouter();

  const { data, isLoading } = useUserProfile(numericId); //   returns PublicProfile

  const { data: accepted = [] } = useAcceptedMatches();
  const { data: sent = [] } = useSentMatches();
  const startConversation = useStartConversation();

  // The route param is the *user* id, but the match endpoint
  // (/matcher/send/<profile_id>/) keys off the Profile PK. They differ — using
  // the user id here is what caused "No Profile matches the given query."
  const targetUserId = data?.user;
  const profileId = data?.id;

  // Relationship drives which actions are shown (friend vs request vs discover).
  const relationship: "matched" | "requested" | "none" = useMemo(() => {
    if (targetUserId == null) return "none";
    if (accepted.some((m) => m.user_id === targetUserId || m.profile_id === profileId)) {
      return "matched";
    }
    if (sent.some((s) => s.user?.user_id === targetUserId && s.status === "pending")) {
      return "requested";
    }
    return "none";
  }, [accepted, sent, targetUserId, profileId]);

  const interestMutation = useMutation({
    mutationFn: (action: "like" | "pass") => {
      if (profileId == null) {
        return Promise.reject(new Error("Profile not loaded yet"));
      }
      return sendInterest(profileId, action);
    },
    onSuccess: () => router.back(),
  });

  return (
    <ProfileClient
      mode="public"
      publicData={data}
      isLoading={isLoading}
      onLike={() => interestMutation.mutate("like")}
      onPass={() => interestMutation.mutate("pass")}
      isPending={interestMutation.isPending}
      relationship={relationship}
      onMessage={() => targetUserId && startConversation.mutate(targetUserId)}
      isMessaging={startConversation.isPending}
    />
  );
}
