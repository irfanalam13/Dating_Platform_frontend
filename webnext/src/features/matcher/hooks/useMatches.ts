import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  acceptMatch,
  getAcceptedMatches,
  getReceivedMatches,
  rejectMatch,
} from "@/shared/api/matcher.api";
import { getConversation } from "@/shared/api/chat.api";
import { useAuth } from "@/features/auth";
import { showError } from "@/shared/utils/toast"
import { createOrGetConversation } from "@/shared/api/chat.api"
import { useAuthStore } from "@/features/auth/store/auth.store";

export function useAcceptedMatches() {
  // const { user } = useAuth();
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ["acceptedMatches"],
    queryFn: getAcceptedMatches,
    enabled: !!user,
    retry: false,
  });
}

export function useReceivedMatches() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["receivedMatches"],
    queryFn: getReceivedMatches,
    enabled: !!user,
    retry: false,
  });
}

export function useAcceptMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: acceptMatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["acceptedMatches"] });
      queryClient.invalidateQueries({ queryKey: ["receivedMatches"] });
    },
  });
}

export function useRejectMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rejectMatch,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["receivedMatches"] }),
  });
}

// ✅ Correct — number matches AcceptedMatch.profile_id
export function useStartConversation() {
  const router = useRouter();

  return useMutation({
    mutationFn: (participantId: number) => createOrGetConversation(participantId),
    onSuccess: (res) => router.push(`/chat/${res.id}`),
    onError: () => showError("Could not open conversation. Please try again."),
  });
}
