import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  acceptMatch,
  getAcceptedMatches,
  getReceivedMatches,
  getSentMatches,
  rejectMatch,
  cancelMatch,
  removeMatch,
} from "@/shared/api/matcher.api";
import { getConversation } from "@/shared/api/chat.api";
import { useAuth } from "@/features/auth";
import { showError, showSuccess } from "@/shared/utils/toast"
import { createOrGetConversation } from "@/shared/api/chat.api"
import { useAuthStore } from "@/features/auth/store/auth.store";
import type { PendingMatch, MatchRequestItem, AcceptedMatch } from "@/shared/types/matcher.types";

export function useAcceptedMatches() {
  // const { user } = useAuth();
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ["acceptedMatches"],
    queryFn: getAcceptedMatches,
    enabled: !!user,
    retry: false,
    // Poll so a request the other person just accepted shows up here live.
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });
}

export function useReceivedMatches() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["receivedMatches"],
    queryFn: getReceivedMatches,
    enabled: !!user,
    retry: false,
    // Poll so newly-received interests appear without a manual refresh.
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });
}

export function useSentMatches() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["sentMatches"],
    queryFn: getSentMatches,
    enabled: !!user,
    retry: false,
    // Poll so a sent request the other person rejected/accepted/cancelled drops
    // out of "Sent requests" on its own (status flips off "pending").
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });
}

export function useCancelMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelMatch,
    onMutate: async (matchId: number) => {
      await queryClient.cancelQueries({ queryKey: ["sentMatches"] });
      const prev = queryClient.getQueryData<MatchRequestItem[]>(["sentMatches"]);
      queryClient.setQueryData<MatchRequestItem[]>(["sentMatches"], (old = []) =>
        old.filter((m) => m.id !== matchId)
      );
      return { prev };
    },
    onError: (_err, _matchId, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["sentMatches"], ctx.prev);
      showError(_err, "Could not cancel request.");
    },
    onSuccess: () => showSuccess("Request withdrawn."),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["sentMatches"] }),
  });
}

// Remove an existing (mutual) match — from the Matches list or a profile page.
// Keyed by the OTHER user's id. Optimistically drops them from the accepted list
// and refreshes everything tied to the relationship.
export function useRemoveMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => removeMatch(userId),
    onMutate: async (userId: number) => {
      await queryClient.cancelQueries({ queryKey: ["acceptedMatches"] });
      const prev = queryClient.getQueryData<AcceptedMatch[]>(["acceptedMatches"]);
      queryClient.setQueryData<AcceptedMatch[]>(["acceptedMatches"], (old = []) =>
        old.filter((m) => m.user_id !== userId)
      );
      return { prev };
    },
    onError: (err, _userId, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["acceptedMatches"], ctx.prev);
      showError(err, "Could not remove match.");
    },
    onSuccess: () => showSuccess("Match removed."),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["acceptedMatches"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["deck"] });
    },
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

//   Correct — number matches AcceptedMatch.profile_id
export function useStartConversation() {
  const router = useRouter();

  return useMutation({
    mutationFn: (participantId: number) => createOrGetConversation(participantId),
    onSuccess: (res) => router.push(`/chat/${res.id}`),
    onError: (err) => showError(err, "Could not open conversation. Please try again."),
  });
}
