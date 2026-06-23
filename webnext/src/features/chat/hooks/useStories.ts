"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createStory,
  deleteStory,
  getStories,
  getStoryViewers,
  reactToStory,
  replyToStory,
  viewStory,
  type CreateStoryPayload,
} from "@/shared/api/story.api";
import { useAuth } from "@/features/auth";

/** Active story groups (matches + self), refreshed on focus so expired
 *  stories drop off without a manual reload. */
export function useStories() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["stories"],
    queryFn: getStories,
    enabled: !!user,
    // Stories expire after 24h; a light poll keeps the bar honest.
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    retry: false,
  });
}

export function useCreateStory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateStoryPayload) => createStory(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stories"] }),
  });
}

export function useViewStory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (storyUuid: string) => viewStory(storyUuid),
    // Refresh so the ring flips from unseen → seen once the viewer closes.
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stories"] }),
  });
}

/** Viewers of one of your own stories. Disabled until `enabled` (e.g. the
 *  viewer sheet is open) so we don't fetch on every story shown. */
export function useStoryViewers(storyUuid: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["story-viewers", storyUuid],
    queryFn: () => getStoryViewers(storyUuid as string),
    enabled: enabled && !!storyUuid,
    staleTime: 15_000,
    retry: false,
  });
}

/** Send a text reply to a story (delivered as a chat message to the author). */
export function useReplyToStory() {
  return useMutation({
    mutationFn: ({ uuid, text }: { uuid: string; text: string }) =>
      replyToStory(uuid, text),
  });
}

/** Leave an emoji reaction on a story. Refreshes the viewer/reaction state. */
export function useReactToStory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ uuid, emoji }: { uuid: string; emoji: string }) =>
      reactToStory(uuid, emoji),
    onSuccess: (_d, { uuid }) =>
      qc.invalidateQueries({ queryKey: ["story-viewers", uuid] }),
  });
}

export function useDeleteStory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (storyUuid: string) => deleteStory(storyUuid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stories"] }),
  });
}
