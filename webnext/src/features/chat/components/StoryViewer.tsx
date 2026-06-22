"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, Trash2, Eye } from "lucide-react";
import type { StoryGroup } from "@/shared/types/story.types";
import { useDeleteStory, useStoryViews, useViewStory } from "@/features/chat/hooks/useStories";
import ProfileImage from "@/shared/components/ProfileImage";
import { resolveImageUrl } from "@/shared/lib/mediaUrl";

const STORY_DURATION_MS = 5000;

interface StoryViewerProps {
  groups: StoryGroup[];
  /** Index into `groups` to open first. */
  startGroupIndex: number;
  onClose: () => void;
}

/**
 * Instagram/Messenger-style full-screen viewer. Auto-advances through the
 * current author's stories, then on to the next author, and closes after the
 * last one. Tapping the left/right half steps backward/forward. Each story is
 * marked seen the moment it shows.
 */
export default function StoryViewer({ groups, startGroupIndex, onClose }: StoryViewerProps) {
  // Single position state so step transitions are computed atomically (a story
  // index that crosses an author boundary moves to the next author in one go).
  const [pos, setPos] = useState({ g: startGroupIndex, s: 0 });
  const { g: groupIndex, s: storyIndex } = pos;
  const seenRef = useRef<Set<string>>(new Set());
  // Shows the glass confirm sheet; while open we freeze the auto-advance.
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Shows the "who viewed this story" sheet (own stories only); also pauses.
  const [showViewers, setShowViewers] = useState(false);

  const viewStory = useViewStory();
  const deleteStory = useDeleteStory();

  const group = groups[groupIndex];
  const story = group?.stories[storyIndex];

  // Viewers of the current own-story — fetched for your own stories so the eye
  // pill can show the count; the list itself opens in the sheet below.
  const { data: viewers = [], isLoading: viewersLoading } = useStoryViews(
    story?.uuid,
    !!group?.is_self,
  );

  const goNext = useCallback(() => {
    setPos((p) => {
      const g = groups[p.g];
      if (!g) return p;
      if (p.s + 1 < g.stories.length) return { g: p.g, s: p.s + 1 };
      if (p.g + 1 < groups.length) return { g: p.g + 1, s: 0 };
      onClose();
      return p;
    });
  }, [groups, onClose]);

  const goPrev = useCallback(() => {
    setPos((p) => {
      if (p.s > 0) return { g: p.g, s: p.s - 1 };
      if (p.g > 0) {
        const prev = groups[p.g - 1];
        return { g: p.g - 1, s: Math.max(0, prev.stories.length - 1) };
      }
      return p;
    });
  }, [groups]);

  // Mark the visible story seen (once) + auto-advance after the duration.
  // Paused while the delete-confirmation sheet is open.
  useEffect(() => {
    if (!story) return;
    if (!group.is_self && !seenRef.current.has(story.uuid)) {
      seenRef.current.add(story.uuid);
      viewStory.mutate(story.uuid);
    }
    if (confirmDelete || showViewers) return;
    const t = setTimeout(goNext, STORY_DURATION_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.uuid, groupIndex, storyIndex, confirmDelete, showViewers]);

  // Esc to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev, onClose]);

  if (!group || !story) return null;

  const name = group.user.display_name || group.user.full_name || "Story";

  const handleDelete = () => {
    if (!group.is_self) return;
    deleteStory.mutate(story.uuid, { onSuccess: onClose });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black">
      {/* Progress bars */}
      <div className="absolute left-0 right-0 top-0 z-20 flex gap-1 px-3 pt-3">
        {group.stories.map((s, i) => (
          <div key={s.uuid} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
            <div
              key={`${s.uuid}-${i === storyIndex ? "active" : "static"}`}
              className="h-full bg-white"
              style={{
                width: i < storyIndex ? "100%" : i > storyIndex ? "0%" : "100%",
                animation:
                  i === storyIndex
                    ? `story-fill ${STORY_DURATION_MS}ms linear forwards`
                    : undefined,
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute left-0 right-0 top-0 z-20 flex items-center gap-3 px-4 pt-6">
        <div className="h-9 w-9 overflow-hidden rounded-full ring-2 ring-white/80">
          <ProfileImage
            src={group.user.profile_image}
            name={name}
            alt={name}
            className="h-9 w-9 rounded-full"
            textClassName="text-sm"
          />
        </div>
        <span className="flex-1 truncate text-sm font-semibold text-white drop-shadow">
          {group.is_self ? "Your story" : name}
        </span>
        {group.is_self && (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            aria-label="Delete story"
            className="grid h-9 w-9 place-items-center rounded-full bg-black/30 text-white"
          >
            <Trash2 className="h-4.5 w-4.5" />
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid h-9 w-9 place-items-center rounded-full bg-black/30 text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Body — image story vs text card */}
      {story.kind === "text" ? (
        <div
          className="flex h-full w-full items-center justify-center px-8"
          style={{ background: story.background || "linear-gradient(135deg, #4cc9f0, #4361ee)" }}
        >
          <p className="max-w-md whitespace-pre-wrap break-words text-center text-2xl font-bold leading-snug text-white drop-shadow">
            {story.text}
          </p>
        </div>
      ) : (
        story.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={story.image_url}
            alt={story.caption || name}
            className="max-h-full max-w-full object-contain"
          />
        )
      )}

      {/* Caption (image stories) */}
      {story.kind !== "text" && story.caption && (
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/70 to-transparent px-5 pb-8 pt-12">
          <p className="text-center text-sm font-medium text-white drop-shadow">{story.caption}</p>
        </div>
      )}

      {/* Viewers pill (own stories) — tap to see who viewed this story. */}
      {group.is_self && (
        <button
          type="button"
          onClick={() => setShowViewers(true)}
          aria-label="See who viewed this story"
          className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/45 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md"
        >
          <Eye className="h-4 w-4" />
          {viewers.length > 0 ? viewers.length : "Viewers"}
        </button>
      )}

      {/* Tap zones (below the header/footer controls) */}
      <button
        type="button"
        aria-label="Previous"
        onClick={goPrev}
        className="absolute bottom-0 left-0 top-20 z-10 w-1/3"
      />
      <button
        type="button"
        aria-label="Next"
        onClick={goNext}
        className="absolute bottom-0 right-0 top-20 z-10 w-2/3"
      />

      {/* ── Delete confirmation — iOS-style liquid glass sheet ── */}
      {confirmDelete && (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center px-8"
          role="dialog"
          aria-modal="true"
          onClick={() => setConfirmDelete(false)}
        >
          {/* dimming + frost behind the sheet */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />

          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-xs overflow-hidden rounded-[28px] border border-white/30 bg-white/10 p-5 text-center shadow-[0_8px_50px_rgba(0,0,0,0.55)] backdrop-blur-2xl backdrop-saturate-[1.8]"
          >
            {/* Glossy top sheen + inner ring — the liquid-glass highlight */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent" />
            <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-inset ring-white/20" />

            <div className="relative">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-white/15 ring-1 ring-white/30 backdrop-blur-md">
                <Trash2 className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-[17px] font-semibold text-white drop-shadow">
                Delete this story?
              </h2>
              <p className="mt-1 text-sm leading-5 text-white/75">
                Do you want to delete your story?
              </p>

              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 rounded-2xl border border-white/30 bg-white/10 py-2.5 text-sm font-semibold text-white backdrop-blur-md transition active:scale-[0.97]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleteStory.isPending}
                  className="flex-1 rounded-2xl border border-white/20 bg-red-500/80 py-2.5 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(239,68,68,0.45)] backdrop-blur-md transition active:scale-[0.97] disabled:opacity-60"
                >
                  {deleteStory.isPending ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── "Viewed by" sheet — slides up from the bottom (own stories) ── */}
      {showViewers && (
        <div
          className="absolute inset-0 z-30 flex items-end"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowViewers(false)}
        >
          <div className="absolute inset-0 bg-black/40" />

          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[70%] w-full overflow-hidden rounded-t-[28px] border-t border-white/20 bg-[#1c1c1e]/80 backdrop-blur-2xl backdrop-saturate-[1.6]"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/15 to-transparent" />

            {/* Grab handle + header */}
            <div className="relative px-5 pt-3">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/30" />
              <div className="mb-2 flex items-center gap-2 text-white">
                <Eye className="h-4.5 w-4.5" />
                <h2 className="text-[15px] font-semibold">
                  Viewed by {viewers.length > 0 ? viewers.length : ""}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowViewers(false)}
                  aria-label="Close"
                  className="ml-auto grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="relative max-h-[calc(70vh-72px)] overflow-y-auto px-3 pb-6">
              {viewersLoading ? (
                <p className="py-8 text-center text-sm text-white/60">Loading…</p>
              ) : viewers.length === 0 ? (
                <p className="py-8 text-center text-sm text-white/60">No views yet.</p>
              ) : (
                viewers.map((v) => {
                  const vName = v.display_name || v.full_name || "Someone";
                  return (
                    <div key={v.id} className="flex items-center gap-3 rounded-2xl px-2 py-2">
                      <ProfileImage
                        src={resolveImageUrl(v.profile_image)}
                        name={vName}
                        alt={vName}
                        className="h-10 w-10 rounded-full"
                        textClassName="text-sm"
                      />
                      <span className="truncate text-sm font-medium text-white">{vName}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes story-fill {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
}
