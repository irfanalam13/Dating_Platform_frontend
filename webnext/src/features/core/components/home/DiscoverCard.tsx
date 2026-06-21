import { motion, type MotionValue } from "framer-motion";
import { BadgeCheck, Heart, MapPin, Sparkles, Star, Undo2 } from "lucide-react";
import type { Profile } from "@/shared/types/profile.types";
import ProfileImage from "@/shared/components/ProfileImage";
import { displayImage } from "./helpers";

// ─── Profile card ─────────────────────────────────────────────────────────────
// Purely presentational: all swipe/like logic lives in HomePage and is wired in
// through props. Drag offset is driven by a framer MotionValue (GPU, no re-render).
export default function DiscoverCard({
  profile,
  swipeDirection,
  dragY,
  prevHintOpacity,
  nextHintOpacity,
  heartBurst,
  onHeartBurstComplete,
  onPhotoTap,
  onNext,
  onBack,
  isFirst,
  onViewProfile,
  onToggleLike,
  isLiked,
  isPending,
}: {
  profile: Profile;
  swipeDirection: "up" | "down" | null;
  dragY: MotionValue<number>;
  prevHintOpacity: MotionValue<number>;
  nextHintOpacity: MotionValue<number>;
  heartBurst: boolean;
  onHeartBurstComplete: () => void;
  onPhotoTap: () => void;
  onNext: () => void;
  onBack: () => void;
  isFirst: boolean;
  onViewProfile: () => void;
  onToggleLike: () => void;
  isLiked: boolean;
  isPending: boolean;
}) {
  return (
    <motion.section
      key={profile.id}
      initial={{
        opacity: 0,
        scale: 0.96,
        // Enter from the direction we're heading: advancing (next)
        // slides up from below, going back slides down from above.
        y: swipeDirection === "up" ? 320 : swipeDirection === "down" ? -320 : 24,
      }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={
        swipeDirection === "up"
          ? { opacity: 0, y: -320, scale: 0.96 }
          : swipeDirection === "down"
          ? { opacity: 0, y: 320, scale: 0.96 }
          : { opacity: 0, scale: 0.96 }
      }
      transition={{ type: "spring", stiffness: 320, damping: 32 }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.5}
      dragDirectionLock
      onDrag={(_, info) => {
        // Motion value only — does NOT trigger a React re-render.
        dragY.set(info.offset.y);
      }}
      onDragEnd={(_, info) => {
        const offset = info.offset.y;
        const velocity = info.velocity.y;
        // Reel-style: swipe UP → next (new) profile, swipe DOWN → previous (old).
        // Easier to trigger on a phone: small flick OR a short drag.
        if (offset < -60 || velocity < -500) {
          onNext();
        } else if (offset > 60 || velocity > 500) {
          onBack();
        } else {
          dragY.set(0);
        }
      }}
      style={{ touchAction: "none" }}
      className="relative flex flex-1 min-h-[520px] touch-none overflow-hidden rounded-[26px] border border-white/40 shadow-[0_12px_40px_rgba(16,24,40,0.18)] cursor-grab active:cursor-grabbing select-none"
    >
      {/* Full-bleed photo (initials when no picture set). Private
          accounts still appear, but their photo is blurred. */}
      <ProfileImage
        src={displayImage(profile)}
        name={profile.full_name}
        alt={profile.full_name || "Profile"}
        className={`absolute inset-0 h-full w-full${profile.is_private ? " scale-110 blur-2xl" : ""}`}
        textClassName="text-8xl"
        draggable={false}
      />
      {profile.is_private && (
        <span className="absolute left-4 top-4 z-10 rounded-full bg-black/45 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
          Private
        </span>
      )}

      {/* My-Type match score — only present on the My-Type deck. */}
      {typeof profile.match_percentage === "number" && (
        <span className="absolute right-4 top-4 z-10 flex items-center gap-1 rounded-full glass-glossy px-3 py-1 text-xs font-bold shadow-lg">
          <Sparkles className="h-3.5 w-3.5 text-[#FFD27A]" />
          {profile.match_percentage}% match
        </span>
      )}

      {/* Double-tap target over the photo (buttons sit above this, z-10).
          touch-none lets the parent own the vertical drag gesture. */}
      <div
        className="absolute inset-0 z-[6] touch-none"
        onClick={onPhotoTap}
      />

      {/* Star burst on double-tap → "super interested" */}
      {heartBurst && (
        <motion.div
          key="star-burst"
          className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.25, 1], opacity: [0, 1, 0] }}
          transition={{ duration: 0.9, times: [0, 0.3, 1] }}
          onAnimationComplete={onHeartBurstComplete}
        >
          <Star
            className="h-28 w-28 text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.45)]"
            fill="#FFC94D"
          />
        </motion.div>
      )}

      {/* Bottom gradient for legibility */}
      <div className="absolute inset-x-0 bottom-0 top-1/3 bg-gradient-to-t from-black/85 via-black/45 to-transparent" />

      {/* Drag hints: UP = previous, DOWN = next.
          Opacity is driven by the drag motion value (GPU, no re-render). */}
      <motion.div
        className="absolute inset-x-0 top-6 z-10 flex justify-center pointer-events-none"
        style={{ opacity: prevHintOpacity }}
      >
        <span className="rounded-full bg-white/25 px-4 py-1 text-sm font-semibold text-white backdrop-blur-sm">
          ↑ Previous
        </span>
      </motion.div>
      <motion.div
        className="absolute inset-x-0 top-6 z-10 flex justify-center pointer-events-none"
        style={{ opacity: nextHintOpacity }}
      >
        <span className="rounded-full bg-white/25 px-4 py-1 text-sm font-semibold text-white backdrop-blur-sm">
          ↓ Next
        </span>
      </motion.div>

      {/* Overlay content */}
      <div className="relative z-10 mt-auto w-full p-5 text-white">
        <div className="flex items-center gap-2">
          <h2 className="text-3xl font-bold drop-shadow-sm">
            {profile.full_name || "Profile"}
          </h2>
          {profile.verified && <BadgeCheck className="h-6 w-6 text-[#FFD27A]" />}
        </div>

        {(() => {
          const ageNum = Number(profile.age);
          const bits = [
            profile.city,
            Number.isFinite(ageNum) && ageNum > 0 ? String(ageNum) : null,
          ].filter(Boolean) as string[];
          return bits.length > 0 ? (
            <p className="mt-1 flex items-center gap-1 text-sm text-white/90">
              <MapPin className="h-4 w-4" />
              {bits.join(" · ")}
            </p>
          ) : null;
        })()}

        {/* Tag pills */}
        {(() => {
          // Drop the generic "Meaningful profile" tag the backend adds
          const realTags = (profile.compatibility_tags ?? []).filter(
            (t) => t?.trim().toLowerCase() !== "meaningful profile"
          );
          const tags =
            realTags.length > 0
              ? realTags
              : ([profile.career, profile.values].filter(Boolean) as string[]);
          return tags.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/40 bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null;
        })()}

        {/* Hobbies */}
        {profile.hobbies && (
          <p className="mt-3 line-clamp-2 text-sm text-white/85">
            <span className="font-semibold">Hobbies:</span> {profile.hobbies}
          </p>
        )}

        {/* Action row: Previous · View profile · Interested (like) */}
        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            onClick={onBack}
            disabled={isFirst}
            aria-label="Previous profile"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/20 text-white backdrop-blur-md transition hover:bg-white/30 disabled:opacity-40"
          >
            <Undo2 className="h-5 w-5" />
          </button>

          <button
            onClick={onViewProfile}
            className="flex h-12 flex-1 items-center justify-center rounded-full bg-[#FF4458] text-sm font-semibold text-white shadow-lg transition hover:brightness-105"
          >
            View profile
          </button>

          <button
            onClick={onToggleLike}
            disabled={isPending}
            aria-label={isLiked ? "Unlike" : "Like"}
            aria-pressed={isLiked}
            className={`grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/20 backdrop-blur-md transition hover:bg-white/30 disabled:opacity-50 ${
              isLiked ? "text-[#FF4458]" : "text-white"
            }`}
          >
            {isPending ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <motion.span
                key={isLiked ? "liked" : "unliked"}
                initial={{ scale: 0.6 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 18 }}
              >
                <Heart
                  className="h-5 w-5"
                  fill={isLiked ? "currentColor" : "none"}
                />
              </motion.span>
            )}
          </button>
        </div>
      </div>
    </motion.section>
  );
}
