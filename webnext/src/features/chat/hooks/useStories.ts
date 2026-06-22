"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createStory,
  deleteStory,
  getStories,
  getStoryViews,
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

export function useDeleteStory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (storyUuid: string) => deleteStory(storyUuid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stories"] }),
  });
}

/** Viewers of one of your own stories. Fetched only when the list is opened. */
export function useStoryViews(storyUuid: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["story-views", storyUuid],
    queryFn: () => getStoryViews(storyUuid!),
    enabled: enabled && !!storyUuid,
    staleTime: 15_000,
    retry: false,
  });
}
