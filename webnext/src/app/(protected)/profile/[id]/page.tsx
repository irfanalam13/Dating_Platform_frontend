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

  const targetUserId = data?.user;

  // Relationship drives which actions are shown (friend vs request vs discover).
  const relationship: "matched" | "requested" | "none" = useMemo(() => {
    if (targetUserId == null) return "none";
    if (accepted.some((m) => m.user_id === targetUserId || m.profile_id === numericId)) {
      return "matched";
    }
    if (sent.some((s) => s.user?.user_id === targetUserId && s.status === "pending")) {
      return "requested";
    }
    return "none";
  }, [accepted, sent, targetUserId, numericId]);

  const interestMutation = useMutation({
    mutationFn: (action: "like" | "pass") => sendInterest(numericId, action),
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
