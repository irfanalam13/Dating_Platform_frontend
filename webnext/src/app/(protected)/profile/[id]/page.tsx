"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useUserProfile } from "@/features/profile/hooks/useProfile"; // ✅ not usePublicProfile
import { sendInterest } from "@/shared/api/profile.api";
import ProfileClient from "@/features/profile/components/ProfileClient";

interface ProfilePageProps {
  params: Promise<{ id: string }>;
}

export default function ProfilePage({ params }: ProfilePageProps) {
  const { id } = use(params);
  const numericId = parseInt(id, 10);
  const router = useRouter();

  const { data, isLoading } = useUserProfile(numericId); // ✅ correct hook

  const interestMutation = useMutation({
    mutationFn: (action: "like" | "pass") => sendInterest(numericId, action),
    onSuccess: () => router.back(),
  });

  return (
    <ProfileClient
      mode="public"
      publicData={data}         // ✅ useUserProfile returns PublicProfile
      isLoading={isLoading}
      onLike={() => interestMutation.mutate("like")}
      onPass={() => interestMutation.mutate("pass")}
      isPending={interestMutation.isPending}
    />
  );
}