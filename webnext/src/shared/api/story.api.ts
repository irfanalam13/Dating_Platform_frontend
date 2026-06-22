import api from "@/shared/api/client";
import type { Story, StoryGroup } from "@/shared/types/story.types";

function data<T>(config: Parameters<typeof api.request>[0]): Promise<T> {
  return api.request<T>(config).then((res) => res.data);
}

/** GET /chat/stories/ — active stories from matches + self, grouped by author. */
export function getStories(): Promise<StoryGroup[]> {
  return data({ method: "GET", url: "/chat/stories/" });
}

export interface CreateStoryPayload {
  /** Image story. */
  image?: File;
  caption?: string;
  /** Text story. */
  text?: string;
  background?: string;
}

/** POST /chat/stories/create/ — an image story or a text story. */
export function createStory(payload: CreateStoryPayload): Promise<Story> {
  const form = new FormData();
  if (payload.image) form.append("image", payload.image);
  if (payload.caption) form.append("caption", payload.caption);
  if (payload.text) form.append("text", payload.text);
  if (payload.background) form.append("background", payload.background);
  return data({
    method: "POST",
    url: "/chat/stories/create/",
    data: form,
    headers: { "Content-Type": "multipart/form-data" },
  });
}

/** POST /chat/stories/:uuid/view/ — mark a story seen (idempotent). */
export function viewStory(storyUuid: string): Promise<void> {
  return data({ method: "POST", url: `/chat/stories/${storyUuid}/view/` });
}

/** DELETE /chat/stories/:uuid/ — remove your own story early. */
export function deleteStory(storyUuid: string): Promise<void> {
  return data({ method: "DELETE", url: `/chat/stories/${storyUuid}/` });
}
