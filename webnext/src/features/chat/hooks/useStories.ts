"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createStory,
  deleteStory,
  getStories,
  getStoryViewers,
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

export function useDeleteStory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (storyUuid: string) => deleteStory(storyUuid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stories"] }),
  });
}
