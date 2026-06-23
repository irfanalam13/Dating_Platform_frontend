// ─────────────────────────────────────────────────────────
// Stories — 24h ephemeral, image-only, matches-only audience.
// ─────────────────────────────────────────────────────────

export type StoryKind = "image" | "text";

export interface Story {
  uuid: string;
  kind: StoryKind;
  image_url: string | null;
  /** Body of a text story. */
  text: string;
  /** CSS background (solid or gradient) for a text story's card. */
  background: string;
  caption: string;
  created_at: string;
  /** When this story disappears (created_at + 24h). */
  expires_at: string;
  /** Whether the current viewer has already seen it. */
  seen: boolean;
}

export interface StoryAuthor {
  id: number;
  profile_id: number | null;
  display_name: string | null;
  full_name: string | null;
  profile_image: string | null;
}

/** Someone who has seen the author's own story (from the viewers endpoint). */
export interface StoryViewerEntry {
  id: number;
  profile_id: number | null;
  display_name: string | null;
  full_name: string | null;
  profile_image: string | null;
  /** When this viewer first opened the story. */
  viewed_at: string;
  /** Emojis this viewer reacted with (empty when they only watched). */
  reactions: string[];
}

/**
 * A snapshot of a story embedded in a chat message's `metadata.story` (for
 * story replies / reactions), so the bubble can show a preview even after the
 * story has expired.
 */
export interface StorySnapshot {
  uuid: string;
  /** Author of the story — used to phrase "your story" vs "their story". */
  author_id: number;
  kind: StoryKind;
  image_url: string | null;
  text: string;
  background: string;
  caption: string;
}

/** Response of GET /chat/stories/:uuid/viewers/ — author-only. */
export interface StoryViewers {
  count: number;
  viewers: StoryViewerEntry[];
}

/** One author's active stories, as returned grouped by the story-bar endpoint. */
export interface StoryGroup {
  user: StoryAuthor;
  stories: Story[];
  /** True when the author has at least one story the viewer hasn't opened. */
  has_unseen: boolean;
  /** True for the current user's own stories ("Your story"). */
  is_self: boolean;
  latest_at: string;
}
