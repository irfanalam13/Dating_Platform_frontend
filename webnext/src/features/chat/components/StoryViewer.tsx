"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, Trash2, Eye, Send } from "lucide-react";
import type { StoryGroup } from "@/shared/types/story.types";
import {
  useDeleteStory,
  useReactToStory,
  useReplyToStory,
  useStoryViewers,
  useViewStory,
} from "@/features/chat/hooks/useStories";
import { showError } from "@/shared/utils/toast";
import ProfileImage from "@/shared/components/ProfileImage";
import { formatTime } from "@/shared/utils/time";

const STORY_DURATION_MS = 5000;
// Quick-reaction emojis — must match the backend's ALLOWED_REACTIONS exactly,
// or the react endpoint rejects them.
const STORY_REACTIONS = ["👍", "❤️", "😂", "😮", "😭", "😡", "🔥", "🎉"];

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
  // Shows the "viewed by" sheet for your own story; also freezes auto-advance.
  const [showViewers, setShowViewers] = useState(false);
  // Reply composer (other people's stories): text + whether the input is
  // focused (freezes auto-advance so the story doesn't skip while typing).
  const [replyText, setReplyText] = useState("");
  const [composerActive, setComposerActive] = useState(false);
  // A transient confirmation that floats up after a reply/reaction is sent.
  const [flash, setFlash] = useState<{ id: number; content: string } | null>(null);

  const viewStory = useViewStory();
  const deleteStory = useDeleteStory();
  const replyToStory = useReplyToStory();
  const reactToStory = useReactToStory();

  const group = groups[groupIndex];
  const story = group?.stories[storyIndex];

  // Viewers of the *current* story — only fetched for your own stories, so the
  // eye button can show the count and the sheet can list who saw it.
  const viewersQuery = useStoryViewers(
    story?.uuid ?? null,
    Boolean(group?.is_self),
  );
  const viewersCount = viewersQuery.data?.count ?? 0;

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
    if (confirmDelete || showViewers || composerActive) return;
    const t = setTimeout(goNext, STORY_DURATION_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.uuid, groupIndex, storyIndex, confirmDelete, showViewers, composerActive]);

  // Moving to a different story resets the sheet + reply composer.
  useEffect(() => {
    setShowViewers(false);
    setReplyText("");
    setComposerActive(false);
  }, [story?.uuid]);

  // Auto-dismiss the "sent" confirmation shortly after it appears.
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 1100);
    return () => clearTimeout(t);
  }, [flash]);

  // Esc to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // While a sheet/composer owns focus: Esc dismisses it, nav stays frozen
      // (so arrow keys + space type into the reply box instead of skipping).
      if (showViewers || confirmDelete || composerActive) {
        if (e.key === "Escape") {
          setShowViewers(false);
          setConfirmDelete(false);
          (document.activeElement as HTMLElement | null)?.blur();
        }
        return;
      }
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev, onClose, showViewers, confirmDelete, composerActive]);

  if (!group || !story) return null;

  const name = group.user.display_name || group.user.full_name || "Story";

  const handleDelete = () => {
    if (!group.is_self) return;
    deleteStory.mutate(story.uuid, { onSuccess: onClose });
  };

  // A brief floating confirmation (the emoji, or "Sent") above the composer.
  const popFlash = (content: string) => setFlash({ id: Date.now(), content });

  const sendReply = () => {
    const text = replyText.trim();
    if (!text || replyToStory.isPending) return;
    replyToStory.mutate(
      { uuid: story.uuid, text },
      {
        onSuccess: () => {
          setReplyText("");
          setComposerActive(false);
          (document.activeElement as HTMLElement | null)?.blur();
          popFlash("Sent ✓");
        },
        onError: (e) => showError(e, "Could not send reply."),
      },
    );
  };

  const sendReaction = (emoji: string) => {
    if (reactToStory.isPending) return;
    reactToStory.mutate(
      { uuid: story.uuid, emoji },
      {
        onSuccess: () => popFlash(emoji),
        onError: (e) => showError(e, "Could not send reaction."),
      },
    );
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

      {/* Reply + react composer — other people's stories. */}
      {!group.is_self && (
        <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-4 pb-5 pt-16">
          {/* Caption (image stories) sits above the composer. */}
          {story.kind !== "text" && story.caption && (
            <p className="mb-3 text-center text-sm font-medium text-white drop-shadow">
              {story.caption}
            </p>
          )}

          {/* Quick emoji reactions */}
          <div className="mb-3 flex items-center justify-center gap-2">
            {STORY_REACTIONS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => sendReaction(e)}
                disabled={reactToStory.isPending}
                aria-label={`React ${e}`}
                className="text-2xl leading-none transition hover:scale-110 active:scale-90 disabled:opacity-50"
              >
                {e}
              </button>
            ))}
          </div>

          {/* Text reply */}
          <form
            onSubmit={(ev) => {
              ev.preventDefault();
              sendReply();
            }}
            className="flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-4 py-2 backdrop-blur-md"
          >
            <input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onFocus={() => setComposerActive(true)}
              onBlur={() => setComposerActive(false)}
              maxLength={2000}
              placeholder={`Reply to ${name}…`}
              className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/60 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!replyText.trim() || replyToStory.isPending}
              aria-label="Send reply"
              className="grid h-8 w-8 flex-none place-items-center rounded-full bg-white/90 text-black transition active:scale-90 disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      {/* Floating "sent" confirmation (emoji / ✓) after a reply or reaction. */}
      {flash && (
        <div
          key={flash.id}
          className="pointer-events-none absolute inset-x-0 bottom-44 z-30 flex justify-center"
        >
          <span
            className="rounded-full bg-black/50 px-4 py-2 text-3xl leading-none text-white backdrop-blur-md drop-shadow"
            style={{ animation: "story-flash 1.1s ease-out forwards" }}
          >
            {flash.content}
          </span>
        </div>
      )}

      {/* Footer for your own story — optional caption + "viewed by" button. */}
      {group.is_self && (
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/70 to-transparent px-5 pb-7 pt-12">
          {story.kind !== "text" && story.caption && (
            <p className="mb-3 text-center text-sm font-medium text-white drop-shadow">
              {story.caption}
            </p>
          )}
          <button
            type="button"
            onClick={() => setShowViewers(true)}
            aria-label="See who viewed your story"
            className="mx-auto flex items-center gap-1.5 rounded-full bg-black/40 px-3.5 py-1.5 text-sm font-semibold text-white backdrop-blur-md transition active:scale-95"
          >
            <Eye className="h-4.5 w-4.5" />
            <span>{viewersCount}</span>
          </button>
        </div>
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

      {/* ── "Viewed by" — iOS-style liquid glass bottom sheet ── */}
      {showViewers && (
        <div
          className="absolute inset-0 z-30 flex flex-col justify-end"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowViewers(false)}
        >
          {/* dimming + frost behind the sheet */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />

          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[70%] overflow-hidden rounded-t-[28px] border-t border-white/30 bg-white/10 shadow-[0_-8px_50px_rgba(0,0,0,0.55)] backdrop-blur-2xl backdrop-saturate-[1.8]"
          >
            {/* Glossy top sheen + inner ring — the liquid-glass highlight */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/25 to-transparent" />
            <div className="pointer-events-none absolute inset-0 rounded-t-[28px] ring-1 ring-inset ring-white/20" />

            <div className="relative flex max-h-[70vh] flex-col">
              {/* grabber + header */}
              <div className="px-5 pb-2 pt-3">
                <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-white/40" />
                <div className="flex items-center gap-2 text-white">
                  <Eye className="h-5 w-5" />
                  <h2 className="text-[15px] font-semibold drop-shadow">
                    {viewersCount === 0
                      ? "Viewers"
                      : `Viewed by ${viewersCount}`}
                  </h2>
                </div>
              </div>

              {/* list */}
              <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-2">
                {viewersQuery.isLoading ? (
                  <p className="py-8 text-center text-sm text-white/70">Loading…</p>
                ) : viewersCount === 0 ? (
                  <p className="py-8 text-center text-sm text-white/70">
                    No views yet. Once your matches open this story, they&apos;ll
                    show up here.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {viewersQuery.data?.viewers.map((v) => {
                      const vName = v.display_name || v.full_name || "Member";
                      return (
                        <li key={v.id} className="flex items-center gap-3">
                          <div className="h-10 w-10 overflow-hidden rounded-full ring-1 ring-white/30">
                            <ProfileImage
                              src={v.profile_image}
                              name={vName}
                              alt={vName}
                              className="h-10 w-10 rounded-full"
                              textClassName="text-sm"
                            />
                          </div>
                          <span className="flex-1 truncate text-sm font-medium text-white">
                            {vName}
                          </span>
                          {v.reactions.length > 0 && (
                            <span className="text-base leading-none" aria-label="reacted">
                              {v.reactions.join(" ")}
                            </span>
                          )}
                          <span className="text-xs text-white/60">
                            {formatTime(v.viewed_at)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes story-fill {
          from { width: 0%; }
          to { width: 100%; }
        }
        @keyframes story-flash {
          0% { opacity: 0; transform: translateY(10px) scale(0.8); }
          25% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-44px) scale(1); }
        }
      `}</style>
    </div>
  );
}
