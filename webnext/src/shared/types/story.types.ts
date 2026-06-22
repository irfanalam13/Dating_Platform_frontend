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

/** A single viewer of one of your own stories. */
export interface StoryView {
  id: number;
  user_id: number;
  display_name: string | null;
  full_name: string | null;
  profile_image: string | null;
  /** When this viewer saw the story. */
  viewed_at: string;
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
