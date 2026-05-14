import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  acceptMatch,
  getAcceptedMatches,
  getReceivedMatches,
  rejectMatch,
} from "@/shared/api/matcher.api";
import { startConversation } from "@/shared/api/chat.api";
import { useAuth } from "@/app/providers";

export function useAcceptedMatches() {
  const { user } = useAuth();
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

export function useStartConversation() {
  const router = useRouter();
  return useMutation({
    mutationFn: startConversation,
    onSuccess: (res) => router.push(`/chat/${res.conversation_id}`),
  });
}