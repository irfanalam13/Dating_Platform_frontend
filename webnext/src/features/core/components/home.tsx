"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeCheck,
  BookOpen,
  Briefcase,
  Eye,
  HeartHandshake,
  MapPin,
  RefreshCw,
  SlidersHorizontal,
  X,
  Sparkles,
  ChevronLeft,
  Star,
  Heart,
} from "lucide-react";
import { getDiscoverProfiles, sendInterest } from "@/shared/api/profile.api";
import { getConversation } from "@/shared/api/chat.api";
import type { Profile } from "@/shared/types/profile.types";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth";
import { createOrGetConversation } from "@/shared/api/chat.api";
import { showError } from "@/shared/utils/toast";
import { useAuthStore } from "@/features/auth/store/auth.store";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function displayImage(profile: Profile) {
  return profile.profile_image_url || profile.profile_image || "/default.png";
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function DiscoverSkeleton() {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-gray-800 animate-pulse" style={{ minHeight: "calc(100dvh - 80px)" }}>
      <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900" />
      <div className="absolute bottom-24 left-5 right-5 space-y-3">
        <div className="h-7 w-2/5 rounded-full bg-white/20" />
        <div className="h-4 w-1/3 rounded-full bg-white/15" />
        <div className="flex gap-2">
          <div className="h-7 w-20 rounded-full bg-white/10" />
          <div className="h-7 w-24 rounded-full bg-white/10" />
        </div>
        <div className="h-4 w-3/4 rounded bg-white/10" />
      </div>
    </div>
  );
}

// ─── Detail row for view modal ────────────────────────────────────────────────
function Detail({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="rounded-xl border border-[#EADDD2] p-3">
      <p className="text-xs text-[#746767]">{label}</p>
      <p className="mt-0.5 font-medium text-[#2D2424]">{value}</p>
    </div>
  );
}

// ─── Match Modal ──────────────────────────────────────────────────────────────
function MatchModal({
  profile,
  onMessage,
  onDismiss,
  isPending,
}: {
  profile: Profile;
  onMessage: () => void;
  onDismiss: () => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#2D2424]/60 px-4 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <div className="relative h-40 w-full">
          <img
            src={displayImage(profile)}
            alt={profile.full_name || "Match"}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#2D2424]/70 to-transparent" />
          <div className="absolute bottom-4 left-0 right-0 text-center">
            <HeartHandshake className="mx-auto h-10 w-10 text-white drop-shadow" />
          </div>
        </div>
        <div className="p-6 text-center">
          <h2 className="text-xl font-bold text-[#2D2424]">
            It's a mutual match!
          </h2>
          <p className="mt-1.5 text-sm text-[#746767]">
            You and{" "}
            <span className="font-semibold text-[#2D2424]">
              {profile.full_name || "this person"}
            </span>{" "}
            are both interested. Start with something thoughtful.
          </p>
          <button
            onClick={onMessage}
            disabled={isPending}
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#7A2432] text-sm font-semibold text-white disabled:opacity-60"
          >
            {isPending ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <HeartHandshake className="h-4 w-4" />
                Start Conversation
              </>
            )}
          </button>
          <button
            onClick={onDismiss}
            className="mt-3 text-sm font-medium text-[#746767] hover:text-[#2D2424]"
          >
            Continue discovering
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── View Profile Modal ───────────────────────────────────────────────────────
function ViewProfileModal({
  profile,
  onClose,
  onLike,
  onPass,
  isPending,
}: {
  profile: Profile;
  onClose: () => void;
  onLike: () => void;
  onPass: () => void;
  isPending: boolean;
}) {
  const hobbies = profile.hobbies
    ? profile.hobbies.split(",").map((h) => h.trim()).filter(Boolean)
    : [];

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-[#2D2424]/50 px-4 backdrop-blur-sm sm:place-items-center">
      <motion.div
        initial={{ y: 32, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 32, opacity: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 26 }}
        className="mb-4 max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-xl"
      >
        {/* Image header */}
        <div className="relative h-56 w-full shrink-0">
          <img
            src={displayImage(profile)}
            alt={profile.full_name || "Profile"}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#2D2424]/80 to-transparent" />
          <button
            onClick={onClose}
            className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/20 backdrop-blur-sm"
          >
            <X className="h-4 w-4 text-white" />
          </button>
          <div className="absolute bottom-4 left-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">
                {profile.full_name || "Profile"}
              </h2>
              {profile.verified && (
                <BadgeCheck className="h-5 w-5 text-[#B78A3B]" />
              )}
            </div>
            <p className="flex items-center gap-1 text-sm text-white/80">
              <MapPin className="h-3.5 w-3.5" />
              {[profile.age, profile.city].filter(Boolean).join(" · ") ||
                "Location not set"}
            </p>
          </div>
        </div>

        <div className="space-y-4 p-5">
          {profile.bio && (
            <p className="text-sm leading-6 text-[#746767]">{profile.bio}</p>
          )}

          {(profile.compatibility_tags ?? []).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {(profile.compatibility_tags ?? []).map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 rounded-full bg-[#FFF0F2] px-3 py-1 text-xs font-medium text-[#7A2432]"
                >
                  <Sparkles className="h-3 w-3" />
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Detail label="Intent" value={profile.relationship_intent} />
            <Detail label="Career" value={profile.career} />
            <Detail label="Education" value={profile.education} />
            <Detail label="Ethnicity" value={profile.ethnicity} />
            <Detail label="Religion" value={profile.religion_name} />
            <Detail label="Caste" value={profile.caste_name} />
            <Detail label="Gotra" value={profile.gotra_name} />
            <Detail label="Horoscope" value={profile.horoscope} />
            <Detail label="Values" value={profile.values} />
          </div>

          {hobbies.length > 0 && (
            <div>
              <p className="mb-2 text-xs text-[#746767]">Hobbies & interests</p>
              <div className="flex flex-wrap gap-2">
                {hobbies.map((h) => (
                  <span
                    key={h}
                    className="rounded-full border border-[#EADDD2] px-3 py-1 text-xs font-medium text-[#2D2424]"
                  >
                    {h}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={onPass}
              disabled={isPending}
              className="flex h-12 items-center justify-center gap-2 rounded-xl border border-[#EADDD2] text-sm font-semibold text-[#746767] disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              Pass
            </button>
            <button
              onClick={onLike}
              disabled={isPending}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#7A2432] text-sm font-semibold text-white disabled:opacity-50"
            >
              {isPending ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <HeartHandshake className="h-4 w-4" />
                  Interested
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  // ─── State ────────────────────────────────────────────────────────────────────
  const [queue, setQueue] = useState<Profile[]>([]);
  const [queueReady, setQueueReady] = useState(false);
  const [matchProfile, setMatchProfile] = useState<Profile | null>(null);
  const [viewProfile, setViewProfile] = useState<Profile | null>(null);
  const [swipeDirection, setSwipeDirection] = useState<"up" | "down" | null>(null);

  // ✅ FIX 1: Use ref for dragY so drag events don't cause re-renders
  const dragYRef = useRef(0);
  const [dragYDisplay, setDragYDisplay] = useState(0);

  // ─── Query ────────────────────────────────────────────────────────────────────
  const { isLoading, refetch, isRefetching, data, isError } = useQuery({
    queryKey: ["discoverProfiles"],
    queryFn: getDiscoverProfiles,
    enabled: !!user,
    retry: 1, // retry once on failure
  });



  // ─── Derived ──────────────────────────────────────────────────────────────────
  const current = queue[0];

  // ✅ FIX 2: Keep a stable ref to `current` so event handlers don't need it as dep
  const currentRef = useRef<Profile | undefined>(undefined);
  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  // ─── Mutations ────────────────────────────────────────────────────────────────

  // ✅ FIX 3: Actually remove from queue — NOT recycle to end
  const shiftQueue = useCallback(() => {
    setQueue((prev) => prev.slice(1));
  }, []);

  const interestMutation = useMutation({
    mutationFn: ({ profileId, action }: { profileId: number; action: "like" | "pass" }) =>
      sendInterest(profileId, action),
    onSuccess: (res) => {
      if (res.matched && currentRef.current) setMatchProfile(currentRef.current);
      shiftQueue();
      setViewProfile(null);
      setSwipeDirection(null);
      dragYRef.current = 0;
      setDragYDisplay(0);
    },
    onError: () => {
      setSwipeDirection(null);
      dragYRef.current = 0;
      setDragYDisplay(0);
    },
  });

  // ✅ FIX 4: isPending ref so handleAction stays stable
  const isPendingRef = useRef(false);
  isPendingRef.current = interestMutation.isPending;

  const conversationMutation = useMutation({
    mutationFn: (participantId: number) => createOrGetConversation(participantId),
    onSuccess: (res) => router.push(`/chat/${res.id}`),
    onError: () => showError("Could not open conversation. Please try again."),
  });

  // ✅ FIX 5: handleAction only depends on mutate (stable), not the full mutation object
  const handleAction = useCallback(
    (action: "like" | "pass") => {
      if (!currentRef.current || isPendingRef.current) return;
      setSwipeDirection(action === "like" ? "up" : "down");
      interestMutation.mutate({ profileId: currentRef.current.id, action });
    },
    [interestMutation.mutate]
  );

  useEffect(() => {
    if (data?.results) {
      setQueue(data.results);
      setQueueReady(true); // ✅ always set ready, even if empty
    }
  }, [data]);

  // ✅ FIX 6: Keyboard + scroll — stable because handleAction is now stable
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp")   handleAction("like");
      if (e.key === "ArrowDown") handleAction("pass");
    };
    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY < -50) handleAction("like");
      if (e.deltaY > 50)  handleAction("pass");
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("wheel", handleWheel, { passive: true });
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("wheel", handleWheel);
    };
  }, [handleAction]);

  const handleRefresh = () => {
    setQueueReady(false);
    refetch();
  };

  // ─── Build hobbies for the current profile ─────────────────────────────────
  const currentHobbies = current?.hobbies
    ? current.hobbies.split(",").map((h) => h.trim()).filter(Boolean)
    : [];

  // ─── Build tags for the current profile ─────────────────────────────────
  const currentTags = current?.compatibility_tags ?? [];

  return (
    <main className="relative min-h-[100dvh] bg-black text-white overflow-hidden">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col relative">

        {/* ── Loading ── */}
        {(isLoading || isRefetching) && <DiscoverSkeleton />}

        {/* ── Empty state ── */}
        {!isLoading && !isRefetching && queueReady && !current && (
          <div className="grid flex-1 place-items-center p-8 text-center">
            <div>
              <HeartHandshake className="mx-auto mb-4 h-12 w-12 text-[#FF4458]" />
              <h2 className="text-xl font-bold text-white">You've seen everyone</h2>
              <p className="mt-2 text-sm text-white/60">
                Check back later or refresh for new profiles.
              </p>
              <button
                onClick={handleRefresh}
                className="mt-5 flex h-12 items-center justify-center gap-2 rounded-full bg-[#FF4458] px-8 text-sm font-bold text-white mx-auto"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
        )}

        {/* ── Profile card (Full-screen style like reference) ── */}
        <AnimatePresence mode="wait">
          {current && !isLoading && !isRefetching && (
            <motion.section
              key={current.id}
              initial={{ opacity: 0, scale: 0.97, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={
                swipeDirection === "up"
                  ? { opacity: 0, y: -350, scale: 0.95 }
                  : swipeDirection === "down"
                  ? { opacity: 0, y: 350, scale: 0.95 }
                  : { opacity: 0, scale: 0.97 }
              }
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.8}
              // ✅ FIX 7: Write to ref first, only setDragYDisplay for animation
              onDrag={(_, info) => {
                dragYRef.current = info.offset.y;
                setDragYDisplay(info.offset.y);
              }}
              onDragEnd={(_, info) => {
                const threshold = 80;
                if (info.offset.y < -threshold) {
                  handleAction("like");
                } else if (info.offset.y > threshold) {
                  handleAction("pass");
                }
                dragYRef.current = 0;
                setDragYDisplay(0);
              }}
              className="relative flex flex-1 flex-col cursor-grab active:cursor-grabbing select-none"
              style={{ minHeight: "100dvh" }}
            >
              {/* Full-screen profile image */}
              <div className="absolute inset-0">
                <img
                  src={displayImage(current)}
                  alt={current.full_name || "Profile"}
                  className="h-full w-full object-cover"
                  loading="eager"
                  draggable={false}
                />
              </div>

              {/* LIKE indicator — fades in when dragging UP */}
              <motion.div
                className="absolute inset-x-0 top-20 z-10 flex justify-center pointer-events-none"
                animate={{
                  opacity: dragYDisplay < -40 ? Math.min((-dragYDisplay - 40) / 60, 1) : 0,
                }}
              >
                <div className="rotate-[-5deg] rounded-2xl border-4 border-[#00D46A] bg-black/20 px-6 py-3 backdrop-blur-sm">
                  <span className="text-3xl font-black text-[#00D46A]">
                    LIKE ❤️
                  </span>
                </div>
              </motion.div>

              {/* PASS indicator — fades in when dragging DOWN */}
              <motion.div
                className="absolute inset-x-0 top-1/3 z-10 flex justify-center pointer-events-none"
                animate={{
                  opacity: dragYDisplay > 40 ? Math.min((dragYDisplay - 40) / 60, 1) : 0,
                }}
              >
                <div className="rotate-[5deg] rounded-2xl border-4 border-[#FF4458] bg-black/20 px-6 py-3 backdrop-blur-sm">
                  <span className="text-3xl font-black text-[#FF4458]">
                    NOPE ✕
                  </span>
                </div>
              </motion.div>

              {/* Bottom gradient overlay with profile info */}
              <div className="absolute inset-x-0 bottom-0 z-10 pointer-events-none"
                   style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 40%, transparent 100%)" }}>
                <div className="px-5 pb-24 pt-32 pointer-events-auto">
                  {/* Name + verification */}
                  <div className="mb-1 flex items-center gap-2">
                    <h2 className="text-3xl font-bold tracking-tight text-white drop-shadow-lg">
                      {current.full_name || "Profile"}
                    </h2>
                    {current.verified && (
                      <BadgeCheck className="h-6 w-6 text-blue-400" />
                    )}
                    {current.is_upgraded && (
                      <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 text-xs font-bold text-white">
                        ✨ Upgraded
                      </span>
                    )}
                  </div>

                  {/* Location with green dot */}
                  <div className="flex items-center gap-1.5 mb-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#00D46A] shadow-[0_0_6px_rgba(0,212,106,0.6)]" />
                    <p className="text-sm text-white/85">
                      {[current.city, current.career].filter(Boolean).join(", ") || "Location not set"}
                    </p>
                  </div>

                  {/* Tags as chips */}
                  {currentTags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {currentTags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur-sm"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Hobbies text */}
                  {currentHobbies.length > 0 && (
                    <p className="text-xs text-white/70 mb-3">
                      <span className="text-white/50">Hobbies: </span>
                      {currentHobbies.join(", ")}
                    </p>
                  )}

                  {/* Action row: back arrow, View Profile button, Star */}
                  <div className="flex items-center justify-between gap-3 mt-2">
                    {/* Pass (back arrow) */}
                    <button
                      onClick={() => handleAction("pass")}
                      disabled={interestMutation.isPending}
                      className="grid h-12 w-12 place-items-center rounded-full bg-white/15 backdrop-blur-sm border border-white/20 transition-all hover:bg-white/25 disabled:opacity-50"
                      title="Pass"
                    >
                      <ChevronLeft className="h-6 w-6 text-white" />
                    </button>

                    {/* View Profile button */}
                    <button
                      onClick={() => setViewProfile(current)}
                      className="flex-1 flex h-12 items-center justify-center gap-2 rounded-full bg-[#FF4458] text-sm font-bold text-white shadow-lg shadow-[#FF4458]/30 transition-all hover:bg-[#E83E50] active:scale-[0.97]"
                    >
                      <Eye className="h-4 w-4" />
                      View profile
                    </button>

                    {/* Like (star) */}
                    <button
                      onClick={() => handleAction("like")}
                      disabled={interestMutation.isPending}
                      className="grid h-12 w-12 place-items-center rounded-full bg-[#FFD700]/90 backdrop-blur-sm border border-[#FFD700]/40 transition-all hover:bg-[#FFD700] disabled:opacity-50"
                      title="Like"
                    >
                      {interestMutation.isPending && swipeDirection === "up" ? (
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <Star className="h-6 w-6 text-white fill-white" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      {/* ── Match modal ── */}
      <AnimatePresence>
        {matchProfile && (
          <MatchModal
            profile={matchProfile}
            onMessage={() => conversationMutation.mutate(matchProfile.id)}
            onDismiss={() => setMatchProfile(null)}
            isPending={conversationMutation.isPending}
          />
        )}
      </AnimatePresence>

      {/* ── View profile modal ── */}
      <AnimatePresence>
        {viewProfile && (
          <ViewProfileModal
            profile={viewProfile}
            onClose={() => setViewProfile(null)}
            onLike={() => handleAction("like")}
            onPass={() => handleAction("pass")}
            isPending={interestMutation.isPending}
          />
        )}
      </AnimatePresence>

      {/* ── Error state ── */}
      {!isLoading && !isRefetching && isError && (
        <div className="absolute inset-0 grid place-items-center p-8 text-center bg-black/80">
          <div>
            <RefreshCw className="mx-auto mb-4 h-10 w-10 text-[#FF4458]" />
            <h2 className="text-lg font-bold text-white">Something went wrong</h2>
            <p className="mt-2 text-sm text-white/60">
              Could not load profiles. Please try again.
            </p>
            <button
              onClick={handleRefresh}
              className="mt-5 flex h-12 items-center justify-center gap-2 rounded-full bg-[#FF4458] px-8 text-sm font-bold text-white mx-auto"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
          </div>
        </div>
      )}
    </main>
  );
}