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
} from "lucide-react";
import { getDiscoverProfiles, sendInterest } from "@/shared/api/profile.api";
import { getConversation } from "@/shared/api/chat.api";
import type { Profile } from "@/shared/types/profile.types";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth";
import { createOrGetConversation } from "@/shared/api/chat.api";
import { showError } from "@/shared/utils/toast";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function displayImage(profile: Profile) {
  return profile.profile_image_url || profile.profile_image || "/default.png";
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function DiscoverSkeleton() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-[#EADDD2] bg-white shadow-sm animate-pulse">
      <div className="h-[430px] w-full bg-[#EADDD2]" />
      <div className="space-y-4 p-5">
        <div className="space-y-2">
          <div className="h-5 w-1/2 rounded bg-[#EADDD2]" />
          <div className="h-3 w-1/3 rounded bg-[#EADDD2]" />
        </div>
        <div className="h-10 w-full rounded bg-[#EADDD2]" />
        <div className="flex gap-2">
          <div className="h-6 w-20 rounded-full bg-[#EADDD2]" />
          <div className="h-6 w-16 rounded-full bg-[#EADDD2]" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="h-12 rounded-xl bg-[#EADDD2]" />
          <div className="h-12 rounded-xl bg-[#EADDD2]" />
          <div className="h-12 rounded-xl bg-[#EADDD2]" />
        </div>
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
  const { user } = useAuth();

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
  const { isLoading, refetch, isRefetching, data } = useQuery({
    queryKey: ["discoverProfiles"],
    queryFn: getDiscoverProfiles,
    enabled: !!user,
    retry: false,
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

  // const conversationMutation = useMutation({
  //   mutationFn: getConversation,
  //   onSuccess: (res) => router.push(`/chat/${res.id}`),
  // });

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
    if (data?.results && data.results.length > 0) {
      setQueue(data.results);
      setQueueReady(true);
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

  return (
    <main className="min-h-[100dvh] bg-[#FFF8F1] text-[#2D2424]">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-4 pb-24 pt-4">

        {/* ── Header ── */}
        <header className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B78A3B]">
              Discover
            </p>
            <h1 className="text-2xl font-semibold">Meaningful matches</h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="grid h-10 w-10 place-items-center rounded-full border border-[#EADDD2] bg-white text-[#7A2432]">
              <SlidersHorizontal className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* ── Loading ── */}
        {(isLoading || isRefetching) && <DiscoverSkeleton />}

        {/* ── Empty state ── */}
        {!isLoading && !isRefetching && queueReady && !current && (
          <div className="grid flex-1 place-items-center rounded-2xl border border-[#EADDD2] bg-white p-8 text-center">
            <div>
              <HeartHandshake className="mx-auto mb-4 h-10 w-10 text-[#7A2432]" />
              <h2 className="text-lg font-semibold">You've seen everyone</h2>
              <p className="mt-2 text-sm text-[#746767]">
                Check back later or refresh for new profiles.
              </p>
              <button
                onClick={handleRefresh}
                className="mt-5 flex h-11 items-center justify-center gap-2 rounded-xl bg-[#7A2432] px-5 text-sm font-semibold text-white"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
        )}

        {/* ── Profile card ── */}
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
              className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-[#EADDD2] bg-white shadow-sm cursor-grab active:cursor-grabbing select-none"
            >
              {/* Image */}
              <div className="relative h-[430px] shrink-0 bg-[#F8EFE6]">
                <img
                  src={displayImage(current)}
                  alt={current.full_name || "Profile"}
                  className="h-full w-full object-cover"
                  loading="eager"
                  draggable={false}
                />

                {/* LIKE indicator — fades in when dragging UP */}
                <motion.div
                  className="absolute inset-x-0 top-6 z-10 flex justify-center pointer-events-none"
                  animate={{
                    opacity: dragYDisplay < -40 ? Math.min((-dragYDisplay - 40) / 60, 1) : 0,
                  }}
                >
                  <div className="rotate-[-5deg] rounded-xl border-4 border-[#3F7D63] bg-white/10 px-5 py-2 backdrop-blur-sm">
                    <span className="text-2xl font-black text-[#3F7D63]">
                      LIKE ❤️
                    </span>
                  </div>
                </motion.div>

                {/* PASS indicator — fades in when dragging DOWN */}
                <motion.div
                  className="absolute inset-x-0 bottom-24 z-10 flex justify-center pointer-events-none"
                  animate={{
                    opacity: dragYDisplay > 40 ? Math.min((dragYDisplay - 40) / 60, 1) : 0,
                  }}
                >
                  <div className="rotate-[5deg] rounded-xl border-4 border-[#7A2432] bg-white/10 px-5 py-2 backdrop-blur-sm">
                    <span className="text-2xl font-black text-[#7A2432]">
                      PASS ✕
                    </span>
                  </div>
                </motion.div>

                {/* Gradient + name overlay */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#2D2424]/85 via-[#2D2424]/30 to-transparent p-5 pt-24 text-white">
                  <div className="mb-1 flex items-center gap-2">
                    <h2 className="text-2xl font-bold">
                      {current.full_name || "Profile"}
                    </h2>
                    {current.verified && (
                      <BadgeCheck className="h-5 w-5 text-[#B78A3B]" />
                    )}
                  </div>
                  <p className="flex items-center gap-1 text-sm text-white/85">
                    <MapPin className="h-3.5 w-3.5" />
                    {[current.age, current.city, current.career]
                      .filter(Boolean)
                      .join(" · ") || "Profile"}
                  </p>
                </div>
              </div>

              {/* Card body */}
              <div className="space-y-4 p-5">
                {current.bio && (
                  <p className="line-clamp-3 text-sm leading-6 text-[#746767]">
                    {current.bio}
                  </p>
                )}

                {(current.compatibility_tags ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {(current.compatibility_tags ?? []).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-[#F8EFE6] px-3 py-1 text-xs font-medium text-[#7A2432]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2 rounded-xl border border-[#EADDD2] p-3">
                    <BookOpen className="h-4 w-4 shrink-0 text-[#7A2432]" />
                    <div className="min-w-0">
                      <p className="text-xs text-[#746767]">Education</p>
                      <p className="truncate font-medium">
                        {current.education || "Not added"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-[#EADDD2] p-3">
                    <Briefcase className="h-4 w-4 shrink-0 text-[#7A2432]" />
                    <div className="min-w-0">
                      <p className="text-xs text-[#746767]">Intent</p>
                      <p className="truncate font-medium">
                        {current.relationship_intent || "Not added"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="grid grid-cols-3 gap-3 pt-1">
                  <button
                    onClick={() => handleAction("pass")}
                    disabled={interestMutation.isPending}
                    className="flex h-12 items-center justify-center rounded-xl border border-[#EADDD2] bg-white text-[#746767] transition-colors hover:bg-[#F8EFE6] disabled:opacity-50"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setViewProfile(current)}
                    className="flex h-12 items-center justify-center gap-1.5 rounded-xl border border-[#EADDD2] bg-[#F8EFE6] text-sm font-semibold text-[#7A2432]"
                  >
                    <Eye className="h-4 w-4" />
                    View
                  </button>
                  <button
                    onClick={() => handleAction("like")}
                    disabled={interestMutation.isPending}
                    className="flex h-12 items-center justify-center rounded-xl bg-[#7A2432] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {interestMutation.isPending && swipeDirection === "up" ? (
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <HeartHandshake className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      {/* ── Match modal ── */}
      {/* <AnimatePresence>
        {matchProfile && (
          <MatchModal
            profile={matchProfile}
            onMessage={() => conversationMutation.mutate(matchProfile.id)}
            onDismiss={() => setMatchProfile(null)}
            isPending={conversationMutation.isPending}
          />
        )}
      </AnimatePresence> */}

      <AnimatePresence>
        {matchProfile && (
          <MatchModal
            profile={matchProfile}
            onMessage={() => conversationMutation.mutate(matchProfile.id)}  // number ✅
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
    </main>
  );
}