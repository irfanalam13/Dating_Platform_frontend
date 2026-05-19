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
import { useAuthStore } from "@/features/auth/store/auth.store";

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
      {/* ── Error state ── */}
      {!isLoading && !isRefetching && isError && (
        <div className="grid flex-1 place-items-center rounded-2xl border border-[#EADDD2] bg-white p-8 text-center">
          <div>
            <RefreshCw className="mx-auto mb-4 h-10 w-10 text-[#7A2432]" />
            <h2 className="text-lg font-semibold">Something went wrong</h2>
            <p className="mt-2 text-sm text-[#746767]">
              Could not load profiles. Please try again.
            </p>
            <button
              onClick={handleRefresh}
              className="mt-5 flex h-11 items-center justify-center gap-2 rounded-xl bg-[#7A2432] px-5 text-sm font-semibold text-white"
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














































// "use client";

// import { useState, useCallback, useEffect, useRef } from "react";
// import { useMutation, useQuery } from "@tanstack/react-query";
// import { AnimatePresence, motion } from "framer-motion";
// import {
//   BadgeCheck,
//   BookOpen,
//   Briefcase,
//   Eye,
//   HeartHandshake,
//   MapPin,
//   RefreshCw,
//   SlidersHorizontal,
//   X,
//   Sparkles,
//   Heart,
//   AlertCircle,
// } from "lucide-react";
// import { getDiscoverProfiles, sendInterest } from "@/shared/api/profile.api";
// import type { Profile } from "@/shared/types/profile.types";
// import { useRouter } from "next/navigation";
// import { useAuth } from "@/features/auth";
// import { createOrGetConversation } from "@/shared/api/chat.api";
// import { showError } from "@/shared/utils/toast";

// // ─── Helpers ──────────────────────────────────────────────────────────────────
// function displayImage(profile: Profile) {
//   return profile.profile_image_url || profile.profile_image || "/default.png";
// }

// // ─── Skeleton ─────────────────────────────────────────────────────────────────
// function DiscoverSkeleton() {
//   return (
//     <div className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-[#EADDD2] bg-white shadow-sm animate-pulse">
//       <div className="h-[440px] w-full bg-gradient-to-br from-[#EADDD2] to-[#F8EFE6]" />
//       <div className="space-y-4 p-5">
//         <div className="space-y-2">
//           <div className="h-6 w-2/5 rounded-full bg-[#EADDD2]" />
//           <div className="h-3 w-1/3 rounded-full bg-[#EADDD2]" />
//         </div>
//         <div className="h-10 w-full rounded-2xl bg-[#EADDD2]" />
//         <div className="flex gap-2">
//           <div className="h-7 w-24 rounded-full bg-[#EADDD2]" />
//           <div className="h-7 w-18 rounded-full bg-[#EADDD2]" />
//         </div>
//         <div className="grid grid-cols-3 gap-3">
//           <div className="h-14 rounded-2xl bg-[#EADDD2]" />
//           <div className="h-14 rounded-2xl bg-[#EADDD2]" />
//           <div className="h-14 rounded-2xl bg-[#EADDD2]" />
//         </div>
//       </div>
//     </div>
//   );
// }

// // ─── Detail row for view modal ────────────────────────────────────────────────
// function Detail({ label, value }: { label: string; value?: string }) {
//   if (!value) return null;
//   return (
//     <div className="rounded-2xl border border-[#EADDD2] bg-[#FDFAF7] p-3">
//       <p className="text-[10px] font-semibold uppercase tracking-widest text-[#B78A3B]">{label}</p>
//       <p className="mt-0.5 text-sm font-medium text-[#2D2424]">{value}</p>
//     </div>
//   );
// }

// // ─── Match Modal ──────────────────────────────────────────────────────────────
// function MatchModal({
//   profile,
//   onMessage,
//   onDismiss,
//   isPending,
// }: {
//   profile: Profile;
//   onMessage: () => void;
//   onDismiss: () => void;
//   isPending: boolean;
// }) {
//   return (
//     <div className="fixed inset-0 z-50 grid place-items-center bg-[#2D2424]/70 px-4 backdrop-blur-md">
//       <motion.div
//         initial={{ scale: 0.88, opacity: 0, y: 24 }}
//         animate={{ scale: 1, opacity: 1, y: 0 }}
//         exit={{ scale: 0.88, opacity: 0, y: 16 }}
//         transition={{ type: "spring", stiffness: 320, damping: 26 }}
//         className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl"
//       >
//         <div className="relative h-52 w-full">
//           <img
//             src={displayImage(profile)}
//             alt={profile.full_name || "Match"}
//             className="h-full w-full object-cover"
//           />
//           <div className="absolute inset-0 bg-gradient-to-t from-[#7A2432]/90 via-[#7A2432]/30 to-transparent" />
//           {/* Animated hearts */}
//           <div className="absolute inset-0 flex items-center justify-center">
//             <motion.div
//               initial={{ scale: 0 }}
//               animate={{ scale: [0, 1.3, 1] }}
//               transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
//               className="rounded-full bg-white/20 p-5 backdrop-blur-sm"
//             >
//               <Heart className="h-12 w-12 fill-white text-white drop-shadow-lg" />
//             </motion.div>
//           </div>
//         </div>
//         <div className="p-6 text-center">
//           <motion.div
//             initial={{ opacity: 0, y: 8 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ delay: 0.3 }}
//           >
//             <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B78A3B]">Mutual Interest</p>
//             <h2 className="mt-1 text-2xl font-bold text-[#2D2424]">It's a Match!</h2>
//             <p className="mt-2 text-sm leading-relaxed text-[#746767]">
//               You and{" "}
//               <span className="font-semibold text-[#2D2424]">
//                 {profile.full_name || "this person"}
//               </span>{" "}
//               are both interested. Start with something thoughtful.
//             </p>
//             <button
//               onClick={onMessage}
//               disabled={isPending}
//               className="mt-5 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-[#7A2432] text-sm font-semibold text-white shadow-lg shadow-[#7A2432]/30 disabled:opacity-60 active:scale-[0.98] transition-transform"
//             >
//               {isPending ? (
//                 <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
//               ) : (
//                 <>
//                   <HeartHandshake className="h-4 w-4" />
//                   Start Conversation
//                 </>
//               )}
//             </button>
//             <button
//               onClick={onDismiss}
//               className="mt-3 text-sm font-medium text-[#746767] hover:text-[#2D2424] transition-colors"
//             >
//               Continue discovering
//             </button>
//           </motion.div>
//         </div>
//       </motion.div>
//     </div>
//   );
// }

// // ─── View Profile Modal ───────────────────────────────────────────────────────
// function ViewProfileModal({
//   profile,
//   onClose,
//   onLike,
//   onPass,
//   isPending,
// }: {
//   profile: Profile;
//   onClose: () => void;
//   onLike: () => void;
//   onPass: () => void;
//   isPending: boolean;
// }) {
//   const hobbies = profile.hobbies
//     ? profile.hobbies.split(",").map((h) => h.trim()).filter(Boolean)
//     : [];

//   return (
//     <div
//       className="fixed inset-0 z-50 grid place-items-end bg-[#2D2424]/60 px-4 pb-4 backdrop-blur-sm sm:place-items-center sm:pb-0"
//       onClick={(e) => e.target === e.currentTarget && onClose()}
//     >
//       <motion.div
//         initial={{ y: 40, opacity: 0 }}
//         animate={{ y: 0, opacity: 1 }}
//         exit={{ y: 40, opacity: 0 }}
//         transition={{ type: "spring", stiffness: 300, damping: 28 }}
//         className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-3xl bg-white shadow-2xl"
//       >
//         {/* Image header */}
//         <div className="relative h-64 w-full shrink-0">
//           <img
//             src={displayImage(profile)}
//             alt={profile.full_name || "Profile"}
//             className="h-full w-full object-cover"
//           />
//           <div className="absolute inset-0 bg-gradient-to-t from-[#2D2424]/90 via-[#2D2424]/20 to-transparent" />
//           <button
//             onClick={onClose}
//             className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/20 backdrop-blur-sm border border-white/20 transition-colors hover:bg-white/30"
//           >
//             <X className="h-4 w-4 text-white" />
//           </button>
//           <div className="absolute bottom-4 left-5 right-5">
//             <div className="flex items-center gap-2">
//               <h2 className="text-2xl font-bold text-white">
//                 {profile.full_name || "Profile"}
//               </h2>
//               {profile.age > 0 && (
//                 <span className="rounded-full bg-white/20 px-2 py-0.5 text-sm text-white backdrop-blur-sm">
//                   {profile.age}
//                 </span>
//               )}
//               {profile.verified && (
//                 <BadgeCheck className="h-5 w-5 text-[#B78A3B]" />
//               )}
//             </div>
//             <p className="mt-1 flex items-center gap-1 text-sm text-white/80">
//               <MapPin className="h-3.5 w-3.5 shrink-0" />
//               {profile.city || "Location not set"}
//             </p>
//           </div>
//         </div>

//         <div className="space-y-4 p-5">
//           {profile.bio && (
//             <p className="text-sm leading-6 text-[#746767] border-l-2 border-[#B78A3B] pl-3">
//               {profile.bio}
//             </p>
//           )}

//           {(profile.compatibility_tags ?? []).length > 0 && (
//             <div className="flex flex-wrap gap-2">
//               {(profile.compatibility_tags ?? []).map((tag) => (
//                 <span
//                   key={tag}
//                   className="flex items-center gap-1 rounded-full bg-[#FFF0F2] px-3 py-1 text-xs font-semibold text-[#7A2432]"
//                 >
//                   <Sparkles className="h-3 w-3" />
//                   {tag}
//                 </span>
//               ))}
//             </div>
//           )}

//           <div className="grid grid-cols-2 gap-2">
//             <Detail label="Intent" value={profile.relationship_intent} />
//             <Detail label="Career" value={profile.career} />
//             <Detail label="Education" value={profile.education} />
//             <Detail label="Ethnicity" value={profile.ethnicity} />
//             <Detail label="Religion" value={profile.religion_name} />
//             <Detail label="Caste" value={profile.caste_name} />
//             <Detail label="Gotra" value={profile.gotra_name} />
//             <Detail label="Horoscope" value={profile.horoscope} />
//             <Detail label="Values" value={profile.values} />
//           </div>

//           {hobbies.length > 0 && (
//             <div>
//               <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#B78A3B]">
//                 Hobbies & Interests
//               </p>
//               <div className="flex flex-wrap gap-2">
//                 {hobbies.map((h) => (
//                   <span
//                     key={h}
//                     className="rounded-full border border-[#EADDD2] bg-[#FDFAF7] px-3 py-1 text-xs font-medium text-[#2D2424]"
//                   >
//                     {h}
//                   </span>
//                 ))}
//               </div>
//             </div>
//           )}

//           <div className="grid grid-cols-2 gap-3 pt-2">
//             <button
//               onClick={onPass}
//               disabled={isPending}
//               className="flex h-13 items-center justify-center gap-2 rounded-2xl border-2 border-[#EADDD2] text-sm font-semibold text-[#746767] disabled:opacity-50 hover:border-[#7A2432]/30 hover:text-[#7A2432] transition-colors active:scale-[0.97]"
//             >
//               <X className="h-4 w-4" />
//               Pass
//             </button>
//             <button
//               onClick={onLike}
//               disabled={isPending}
//               className="flex h-13 items-center justify-center gap-2 rounded-2xl bg-[#7A2432] text-sm font-semibold text-white shadow-lg shadow-[#7A2432]/25 disabled:opacity-50 hover:bg-[#6a1f2b] transition-colors active:scale-[0.97]"
//             >
//               {isPending ? (
//                 <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
//               ) : (
//                 <>
//                   <HeartHandshake className="h-4 w-4" />
//                   Interested
//                 </>
//               )}
//             </button>
//           </div>
//         </div>
//       </motion.div>
//     </div>
//   );
// }

// // ─── Auth Loading ─────────────────────────────────────────────────────────────
// function AuthLoading() {
//   return (
//     <main className="min-h-[100dvh] bg-[#FFF8F1] grid place-items-center">
//       <div className="flex flex-col items-center gap-3">
//         <span className="h-8 w-8 animate-spin rounded-full border-2 border-[#7A2432] border-t-transparent" />
//         <p className="text-sm text-[#746767]">Loading...</p>
//       </div>
//     </main>
//   );
// }

// // ─── Main Page ────────────────────────────────────────────────────────────────
// export default function HomePage() {
//   const router = useRouter();
//   const { user } = useAuth();

//   // ─── State ──────────────────────────────────────────────────────────────────
//   const [queue, setQueue] = useState<Profile[]>([]);
//   const [queueReady, setQueueReady] = useState(false);
//   const [matchProfile, setMatchProfile] = useState<Profile | null>(null);
//   const [viewProfile, setViewProfile] = useState<Profile | null>(null);
//   const [swipeDirection, setSwipeDirection] = useState<"up" | "down" | null>(null);

//   const dragYRef = useRef(0);
//   const [dragYDisplay, setDragYDisplay] = useState(0);

//   // ─── Guard: wait for auth ────────────────────────────────────────────────────
//   // useAuth may return null on first render before token is read
//   const authReady = user !== undefined; // adjust if useAuth uses isLoading flag

//   // ─── Query ──────────────────────────────────────────────────────────────────
//   const { isLoading, refetch, isRefetching, data, isError } = useQuery({
//     queryKey: ["discoverProfiles"],
//     queryFn: getDiscoverProfiles,
//     enabled: !!user,   // only run when user is loaded
//     retry: 1,
//     staleTime: 30_000, // don't refetch unnecessarily within 30s
//   });

//   // ─── Populate queue — always set queueReady so blank page never happens ─────
//   useEffect(() => {
//     if (data?.results) {
//       setQueue(data.results);
//       setQueueReady(true);
//     }
//   }, [data]);

//   // ─── Derived ────────────────────────────────────────────────────────────────
//   const current = queue[0];

//   const currentRef = useRef<Profile | undefined>(undefined);
//   useEffect(() => {
//     currentRef.current = current;
//   }, [current]);

//   // ─── Mutations ──────────────────────────────────────────────────────────────
//   const shiftQueue = useCallback(() => {
//     setQueue((prev) => prev.slice(1));
//   }, []);

//   const interestMutation = useMutation({
//     mutationFn: ({ profileId, action }: { profileId: number; action: "like" | "pass" }) =>
//       sendInterest(profileId, action),
//     onSuccess: (res) => {
//       if (res.matched && currentRef.current) setMatchProfile(currentRef.current);
//       shiftQueue();
//       setViewProfile(null);
//       setSwipeDirection(null);
//       dragYRef.current = 0;
//       setDragYDisplay(0);
//     },
//     onError: () => {
//       setSwipeDirection(null);
//       dragYRef.current = 0;
//       setDragYDisplay(0);
//       showError("Something went wrong. Please try again.");
//     },
//   });

//   const isPendingRef = useRef(false);
//   isPendingRef.current = interestMutation.isPending;

//   const conversationMutation = useMutation({
//     mutationFn: (participantId: number) => createOrGetConversation(participantId),
//     onSuccess: (res) => router.push(`/chat/${res.id}`),
//     onError: () => showError("Could not open conversation. Please try again."),
//   });

//   const handleAction = useCallback(
//     (action: "like" | "pass") => {
//       if (!currentRef.current || isPendingRef.current) return;
//       setSwipeDirection(action === "like" ? "up" : "down");
//       interestMutation.mutate({ profileId: currentRef.current.id, action });
//     },
//     [interestMutation.mutate]
//   );

//   // ─── Keyboard + scroll ──────────────────────────────────────────────────────
//   useEffect(() => {
//     const handleKeyDown = (e: KeyboardEvent) => {
//       if (e.key === "ArrowUp")   handleAction("like");
//       if (e.key === "ArrowDown") handleAction("pass");
//     };
//     const handleWheel = (e: WheelEvent) => {
//       if (e.deltaY < -50) handleAction("like");
//       if (e.deltaY > 50)  handleAction("pass");
//     };
//     window.addEventListener("keydown", handleKeyDown);
//     window.addEventListener("wheel", handleWheel, { passive: true });
//     return () => {
//       window.removeEventListener("keydown", handleKeyDown);
//       window.removeEventListener("wheel", handleWheel);
//     };
//   }, [handleAction]);

//   // ─── Refresh ────────────────────────────────────────────────────────────────
//   const handleRefresh = () => {
//     setQueueReady(false);
//     setQueue([]);       // ← clear queue so stale data doesn't linger
//     refetch();
//   };

//   // ─── Auth guard ─────────────────────────────────────────────────────────────
//   if (!authReady || (!user && !isError)) return <AuthLoading />;

//   // ─── Render ─────────────────────────────────────────────────────────────────
//   return (
//     <main className="min-h-[100dvh] bg-[#FFF8F1] text-[#2D2424]">
//       <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-4 pb-24 pt-4">

//         {/* ── Header ── */}
//         <header className="mb-4 flex items-center justify-between">
//           <div>
//             <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B78A3B]">
//               Discover
//             </p>
//             <h1 className="text-2xl font-bold tracking-tight">Meaningful matches</h1>
//           </div>
//           <button className="grid h-10 w-10 place-items-center rounded-full border border-[#EADDD2] bg-white text-[#7A2432] shadow-sm hover:bg-[#FFF0F2] transition-colors">
//             <SlidersHorizontal className="h-5 w-5" />
//           </button>
//         </header>

//         {/* ── Loading skeleton ── */}
//         {(isLoading || isRefetching) && <DiscoverSkeleton />}

//         {/* ── Error state ── */}
//         {!isLoading && !isRefetching && isError && (
//           <div className="grid flex-1 place-items-center rounded-3xl border border-[#EADDD2] bg-white p-8 text-center shadow-sm">
//             <div>
//               <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-[#FFF0F2]">
//                 <AlertCircle className="h-8 w-8 text-[#7A2432]" />
//               </div>
//               <h2 className="text-lg font-semibold">Something went wrong</h2>
//               <p className="mt-2 text-sm text-[#746767]">
//                 Could not load profiles. Check your connection and try again.
//               </p>
//               <button
//                 onClick={handleRefresh}
//                 className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#7A2432] px-5 text-sm font-semibold text-white shadow-lg shadow-[#7A2432]/25 active:scale-[0.98] transition-transform"
//               >
//                 <RefreshCw className="h-4 w-4" />
//                 Try Again
//               </button>
//             </div>
//           </div>
//         )}

//         {/* ── Empty state ── */}
//         {!isLoading && !isRefetching && !isError && queueReady && !current && (
//           <div className="grid flex-1 place-items-center rounded-3xl border border-[#EADDD2] bg-white p-8 text-center shadow-sm">
//             <div>
//               <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-[#FFF0F2]">
//                 <HeartHandshake className="h-8 w-8 text-[#7A2432]" />
//               </div>
//               <h2 className="text-lg font-semibold">You've seen everyone</h2>
//               <p className="mt-2 text-sm text-[#746767]">
//                 Check back later or refresh for new profiles.
//               </p>
//               <button
//                 onClick={handleRefresh}
//                 className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#7A2432] px-5 text-sm font-semibold text-white shadow-lg shadow-[#7A2432]/25 active:scale-[0.98] transition-transform"
//               >
//                 <RefreshCw className="h-4 w-4" />
//                 Refresh
//               </button>
//             </div>
//           </div>
//         )}

//         {/* ── Profile card ── */}
//         <AnimatePresence mode="wait">
//           {current && !isLoading && !isRefetching && (
//             <motion.section
//               key={current.id}
//               initial={{ opacity: 0, scale: 0.96, y: 24 }}
//               animate={{ opacity: 1, scale: 1, y: 0 }}
//               exit={
//                 swipeDirection === "up"
//                   ? { opacity: 0, y: -380, scale: 0.93, rotate: -3 }
//                   : swipeDirection === "down"
//                   ? { opacity: 0, y: 380, scale: 0.93, rotate: 3 }
//                   : { opacity: 0, scale: 0.96 }
//               }
//               transition={{ type: "spring", stiffness: 280, damping: 26 }}
//               drag="y"
//               dragConstraints={{ top: 0, bottom: 0 }}
//               dragElastic={0.75}
//               onDrag={(_, info) => {
//                 dragYRef.current = info.offset.y;
//                 setDragYDisplay(info.offset.y);
//               }}
//               onDragEnd={(_, info) => {
//                 const threshold = 90;
//                 if (info.offset.y < -threshold) {
//                   handleAction("like");
//                 } else if (info.offset.y > threshold) {
//                   handleAction("pass");
//                 }
//                 dragYRef.current = 0;
//                 setDragYDisplay(0);
//               }}
//               className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-[#EADDD2] bg-white shadow-md cursor-grab active:cursor-grabbing select-none"
//             >
//               {/* Image */}
//               <div className="relative h-[440px] shrink-0 bg-[#F8EFE6]">
//                 <img
//                   src={displayImage(current)}
//                   alt={current.full_name || "Profile"}
//                   className="h-full w-full object-cover"
//                   loading="eager"
//                   draggable={false}
//                 />

//                 {/* Hint bar — shows swipe instructions on first load */}
//                 <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-black/30 px-4 py-1.5 backdrop-blur-sm">
//                   <p className="text-[10px] font-medium tracking-widest text-white/90 uppercase">
//                     Swipe up to like · down to pass
//                   </p>
//                 </div>

//                 {/* LIKE indicator */}
//                 <motion.div
//                   className="absolute inset-x-0 top-8 z-10 flex justify-center pointer-events-none"
//                   animate={{
//                     opacity: dragYDisplay < -40 ? Math.min((-dragYDisplay - 40) / 60, 1) : 0,
//                     y: dragYDisplay < -40 ? 0 : -8,
//                   }}
//                   transition={{ type: "tween", duration: 0.1 }}
//                 >
//                   <div className="rotate-[-4deg] rounded-2xl border-4 border-[#3F7D63] bg-white/15 px-6 py-2.5 backdrop-blur-sm shadow-xl">
//                     <span className="text-2xl font-black text-[#3F7D63] drop-shadow">
//                       LIKE ❤️
//                     </span>
//                   </div>
//                 </motion.div>

//                 {/* PASS indicator */}
//                 <motion.div
//                   className="absolute inset-x-0 bottom-28 z-10 flex justify-center pointer-events-none"
//                   animate={{
//                     opacity: dragYDisplay > 40 ? Math.min((dragYDisplay - 40) / 60, 1) : 0,
//                     y: dragYDisplay > 40 ? 0 : 8,
//                   }}
//                   transition={{ type: "tween", duration: 0.1 }}
//                 >
//                   <div className="rotate-[4deg] rounded-2xl border-4 border-[#7A2432] bg-white/15 px-6 py-2.5 backdrop-blur-sm shadow-xl">
//                     <span className="text-2xl font-black text-[#7A2432] drop-shadow">
//                       PASS ✕
//                     </span>
//                   </div>
//                 </motion.div>

//                 {/* Gradient + name overlay */}
//                 <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#2D2424]/90 via-[#2D2424]/40 to-transparent p-5 pt-20 text-white">
//                   <div className="mb-1 flex items-center gap-2">
//                     <h2 className="text-2xl font-bold tracking-tight">
//                       {current.full_name || "Profile"}
//                     </h2>
//                     {current.age > 0 && (
//                       <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-sm font-medium backdrop-blur-sm">
//                         {current.age}
//                       </span>
//                     )}
//                     {current.verified && (
//                       <BadgeCheck className="h-5 w-5 text-[#B78A3B]" />
//                     )}
//                   </div>
//                   <p className="flex items-center gap-1.5 text-sm text-white/80">
//                     <MapPin className="h-3.5 w-3.5 shrink-0" />
//                     {[current.city, current.career].filter(Boolean).join(" · ") || "Profile incomplete"}
//                   </p>
//                 </div>
//               </div>

//               {/* Card body */}
//               <div className="space-y-4 p-5">
//                 {current.bio ? (
//                   <p className="line-clamp-2 text-sm leading-6 text-[#746767] border-l-2 border-[#B78A3B] pl-3">
//                     {current.bio}
//                   </p>
//                 ) : (
//                   <p className="text-sm italic text-[#BFAAA0]">No bio added yet.</p>
//                 )}

//                 {(current.compatibility_tags ?? []).length > 0 && (
//                   <div className="flex flex-wrap gap-2">
//                     {(current.compatibility_tags ?? []).map((tag) => (
//                       <span
//                         key={tag}
//                         className="flex items-center gap-1 rounded-full bg-[#FFF0F2] px-3 py-1 text-xs font-semibold text-[#7A2432]"
//                       >
//                         <Sparkles className="h-3 w-3" />
//                         {tag}
//                       </span>
//                     ))}
//                   </div>
//                 )}

//                 <div className="grid grid-cols-2 gap-2 text-sm">
//                   <div className="flex items-center gap-2.5 rounded-2xl border border-[#EADDD2] bg-[#FDFAF7] p-3">
//                     <BookOpen className="h-4 w-4 shrink-0 text-[#B78A3B]" />
//                     <div className="min-w-0">
//                       <p className="text-[10px] font-semibold uppercase tracking-widest text-[#B78A3B]">Education</p>
//                       <p className="truncate text-sm font-medium text-[#2D2424]">
//                         {current.education || "Not added"}
//                       </p>
//                     </div>
//                   </div>
//                   <div className="flex items-center gap-2.5 rounded-2xl border border-[#EADDD2] bg-[#FDFAF7] p-3">
//                     <Briefcase className="h-4 w-4 shrink-0 text-[#B78A3B]" />
//                     <div className="min-w-0">
//                       <p className="text-[10px] font-semibold uppercase tracking-widest text-[#B78A3B]">Intent</p>
//                       <p className="truncate text-sm font-medium text-[#2D2424]">
//                         {current.relationship_intent || "Not added"}
//                       </p>
//                     </div>
//                   </div>
//                 </div>

//                 {/* Action buttons */}
//                 <div className="grid grid-cols-3 gap-3 pt-1">
//                   <button
//                     onClick={() => handleAction("pass")}
//                     disabled={interestMutation.isPending}
//                     className="flex h-13 items-center justify-center rounded-2xl border-2 border-[#EADDD2] bg-white text-[#746767] transition-all hover:border-[#7A2432]/30 hover:text-[#7A2432] disabled:opacity-50 active:scale-95"
//                     title="Pass"
//                   >
//                     <X className="h-5 w-5" />
//                   </button>
//                   <button
//                     onClick={() => setViewProfile(current)}
//                     className="flex h-13 items-center justify-center gap-1.5 rounded-2xl border-2 border-[#EADDD2] bg-[#FDFAF7] text-sm font-semibold text-[#7A2432] transition-all hover:bg-[#FFF0F2] active:scale-95"
//                     title="View full profile"
//                   >
//                     <Eye className="h-4 w-4" />
//                     View
//                   </button>
//                   <button
//                     onClick={() => handleAction("like")}
//                     disabled={interestMutation.isPending}
//                     className="flex h-13 items-center justify-center rounded-2xl bg-[#7A2432] text-white shadow-lg shadow-[#7A2432]/25 transition-all hover:bg-[#6a1f2b] disabled:opacity-50 active:scale-95"
//                     title="Interested"
//                   >
//                     {interestMutation.isPending && swipeDirection === "up" ? (
//                       <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
//                     ) : (
//                       <HeartHandshake className="h-5 w-5" />
//                     )}
//                   </button>
//                 </div>

//                 {/* Queue count */}
//                 {queue.length > 1 && (
//                   <p className="text-center text-xs text-[#BFAAA0]">
//                     {queue.length - 1} more profile{queue.length - 1 !== 1 ? "s" : ""} to discover
//                   </p>
//                 )}
//               </div>
//             </motion.section>
//           )}
//         </AnimatePresence>
//       </div>

//       {/* ── Match modal ── */}
//       <AnimatePresence>
//         {matchProfile && (
//           <MatchModal
//             profile={matchProfile}
//             onMessage={() => conversationMutation.mutate(matchProfile.user)}
//             onDismiss={() => setMatchProfile(null)}
//             isPending={conversationMutation.isPending}
//           />
//         )}
//       </AnimatePresence>

//       {/* ── View profile modal ── */}
//       <AnimatePresence>
//         {viewProfile && (
//           <ViewProfileModal
//             profile={viewProfile}
//             onClose={() => setViewProfile(null)}
//             onLike={() => handleAction("like")}
//             onPass={() => handleAction("pass")}
//             isPending={interestMutation.isPending}
//           />
//         )}
//       </AnimatePresence>
//     </main>
//   );
// }