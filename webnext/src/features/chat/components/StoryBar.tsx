"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useStories } from "@/features/chat/hooks/useStories";
import { useAuth } from "@/features/auth";
import ProfileImage from "@/shared/components/ProfileImage";
import StoryViewer from "./StoryViewer";
import StoryComposer from "./StoryComposer";
import type { StoryGroup } from "@/shared/types/story.types";

/**
 * The story bar on the message page. Unlike the old strip — which showed an
 * avatar for *every* match — this only shows people (matches) who have posted
 * an active story, plus the user's own "Your story" entry for posting. Stories
 * live 24h, enforced server-side.
 */
export default function StoryBar() {
  const { user } = useAuth();
  const { data: groups } = useStories();
  const [composerOpen, setComposerOpen] = useState(false);
  const [viewerStart, setViewerStart] = useState<number | null>(null);

  // Self first (if they posted), then matches with active stories.
  const ordered: StoryGroup[] = useMemo(() => {
    if (!groups) return [];
    const self = groups.filter((g) => g.is_self);
    const others = groups.filter((g) => !g.is_self);
    return [...self, ...others];
  }, [groups]);

  const selfGroup = ordered.find((g) => g.is_self) ?? null;
  const others = ordered.filter((g) => !g.is_self);

  const openSelf = () => {
    if (selfGroup) setViewerStart(ordered.indexOf(selfGroup));
    else setComposerOpen(true);
  };

  const selfName = user?.full_name ?? "You";

  return (
    <div className="mb-4">
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-3 pb-3">
          {/* Your story — always present, doubles as the "add" entry. */}
          <button
            type="button"
            onClick={openSelf}
            className="flex shrink-0 flex-col items-center gap-1"
          >
            <div className="relative">
              {selfGroup && selfGroup.stories.length > 0 ? (
                <div
                  className="rounded-full p-[2px]"
                  style={{ background: "linear-gradient(135deg, #4cc9f0, #63d6f6)" }}
                >
                  <div className="rounded-full bg-white p-[2px]">
                    <ProfileImage
                      src={selfGroup.user.profile_image}
                      name={selfName}
                      alt={selfName}
                      className="h-14 w-14 rounded-full"
                      textClassName="text-lg"
                    />
                  </div>
                </div>
              ) : (
                <ProfileImage
                  src={selfGroup?.user.profile_image ?? null}
                  name={selfName}
                  alt={selfName}
                  className="h-14 w-14 rounded-full"
                  textClassName="text-lg"
                />
              )}
              {/* "+" affordance — always opens the composer. */}
              <span
                role="button"
                aria-label="Add to your story"
                onClick={(e) => {
                  e.stopPropagation();
                  setComposerOpen(true);
                }}
                className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full border-2 border-white bg-[#4cc9f0] text-white shadow"
              >
                <Plus className="h-3 w-3" strokeWidth={3} />
              </span>
            </div>
            <span className="max-w-[64px] truncate text-[11px] font-medium text-[#1a1a2e]">
              Your story
            </span>
          </button>

          {/* Matches with an active story. */}
          {others.map((group) => {
            const name = group.user.display_name || group.user.full_name || "Match";
            const ring = group.has_unseen
              ? "linear-gradient(135deg, #ff3b30, #ff5e57)"
              : "linear-gradient(135deg, #d1d5db, #d1d5db)";
            return (
              <button
                key={group.user.id}
                type="button"
                onClick={() => setViewerStart(ordered.indexOf(group))}
                className="flex shrink-0 flex-col items-center gap-1"
              >
                <div className="rounded-full p-[2px]" style={{ background: ring }}>
                  <div className="rounded-full bg-white p-[2px]">
                    <ProfileImage
                      src={group.user.profile_image}
                      name={name}
                      alt={name}
                      className="h-14 w-14 rounded-full"
                      textClassName="text-lg"
                    />
                  </div>
                </div>
                <span className="max-w-[64px] truncate text-[11px] font-medium text-[#1a1a2e]">
                  {name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-1 h-px w-full bg-gray-200" />

      {composerOpen && <StoryComposer onClose={() => setComposerOpen(false)} />}
      {viewerStart !== null && ordered.length > 0 && (
        <StoryViewer
          groups={ordered}
          startGroupIndex={viewerStart}
          onClose={() => setViewerStart(null)}
        />
      )}
    </div>
  );
}
