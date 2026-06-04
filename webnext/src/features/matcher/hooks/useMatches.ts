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
import { showError, showSuccess } from "@/shared/utils/toast"
import { createOrGetConversation } from "@/shared/api/chat.api"
import { useAuthStore } from "@/features/auth/store/auth.store";
import type { PendingMatch } from "@/shared/types/matcher.types";

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

// Remove a pending interest from the cache immediately (optimistic)
function removePending(queryClient: ReturnType<typeof useQueryClient>, matchId: number) {
  const prev = queryClient.getQueryData<PendingMatch[]>(["receivedMatches"]);
  queryClient.setQueryData<PendingMatch[]>(["receivedMatches"], (old = []) =>
    old.filter((m) => m.id !== matchId)
  );
  return prev;
}

export function useAcceptMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: acceptMatch,
    // Instantly drop the request from "Pending interests"
    onMutate: async (matchId: number) => {
      await queryClient.cancelQueries({ queryKey: ["receivedMatches"] });
      return { prev: removePending(queryClient, matchId) };
    },
    onError: (_err, _matchId, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["receivedMatches"], ctx.prev);
    },
    onSuccess: () => {
      showSuccess("Match accepted — say hi!");
      // Now a mutual match → refresh Matches list AND the message inbox
      queryClient.invalidateQueries({ queryKey: ["acceptedMatches"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["receivedMatches"] });
    },
  });
}

export function useRejectMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rejectMatch,
    // Instantly drop the request from "Pending interests"
    onMutate: async (matchId: number) => {
      await queryClient.cancelQueries({ queryKey: ["receivedMatches"] });
      return { prev: removePending(queryClient, matchId) };
    },
    onError: (_err, _matchId, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["receivedMatches"], ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["receivedMatches"] });
    },
  });
}

// ✅ Correct — number matches AcceptedMatch.profile_id
export function useStartConversation() {
  const router = useRouter();

  return useMutation({
    mutationFn: (participantId: number) => createOrGetConversation(participantId),
    onSuccess: (res) => router.push(`/chat/${res.id}`),
    onError: (err) => showError(err, "Could not open conversation. Please try again."),
  });
}
