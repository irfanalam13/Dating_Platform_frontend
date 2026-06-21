"use client";

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { HeartHandshake, RefreshCw, Sparkles } from "lucide-react";
import { getDiscoverProfiles, getMyTypeProfiles, sendInterest } from "@/shared/api/profile.api";
import { cancelMatch } from "@/shared/api/matcher.api";
import type { Profile } from "@/shared/types/profile.types";
import { useRouter } from "next/navigation";
import { createOrGetConversation } from "@/shared/api/chat.api";
import { showError, showSuccess } from "@/shared/utils/toast";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { useMyProfile } from "@/features/profile/hooks/useProfile";
import DiscoverSkeleton from "./home/DiscoverSkeleton";
import MatchModal from "./home/MatchModal";
import ViewProfileModal from "./home/ViewProfileModal";
import DiscoverCard from "./home/DiscoverCard";

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { data: myProfile } = useMyProfile();
  const [activeSection, setActiveSection] = useState<"discover" | "myType">("discover");

  // Once preferences are saved we persist a flag so the "My Type" page always
  // shows the saved state — permanently, even across reloads/cache misses.
  // Read via useSyncExternalStore so the localStorage value is picked up
  // SSR-safely (server snapshot is false) without a setState-in-effect.
  const prefsSaved = useSyncExternalStore(
    () => () => {},
    () => localStorage.getItem("loviq_prefs_saved") === "1",
    () => false,
  );
  const hasChosenType = Boolean(myProfile?.preferences) || prefsSaved;

  // ─── State ────────────────────────────────────────────────────────────────────
  const [queue, setQueue] = useState<Profile[]>([]);
  const [index, setIndex] = useState(0);
  const [queueReady, setQueueReady] = useState(false);
  const [matchProfile, setMatchProfile] = useState<Profile | null>(null);
  const [viewProfile, setViewProfile] = useState<Profile | null>(null);
  const [swipeDirection, setSwipeDirection] = useState<"up" | "down" | null>(null);

  //   Drag is tracked with a framer motion value, NOT React state — so the
  // page does not re-render on every drag frame (that was the source of the
  // mobile jank/glitches). Hint opacities are derived purely on the GPU.
  const dragY = useMotionValue(0);
  const prevHintOpacity = useTransform(dragY, [-90, -40], [1, 0]);
  const nextHintOpacity = useTransform(dragY, [40, 90], [0, 1]);

  // Double-tap-to-like pop (Instagram style). The burst animation itself lives
  // in <DiscoverCard>; HomePage only toggles `heartBurst` on/off.
  const [heartBurst, setHeartBurst] = useState(false);
  const lastTapRef = useRef(0);

  // Profiles the user has liked via the heart button — drives the heart fill
  // (hollow → reddish) and toggles on/off. Superstar (double-tap) does NOT
  // touch this, so a double-tap never lights up the like button.
  const [liked, setLiked] = useState<Set<number>>(new Set());
  // Mirror `liked` into a ref via an effect (not during render) so event
  // handlers can read the latest set without taking it as a dependency.
  const likedRef = useRef<Set<number>>(liked);
  useEffect(() => {
    likedRef.current = liked;
  }, [liked]);

  // ─── Query ────────────────────────────────────────────────────────────────────
  // The deck is driven by the active tab. DISCOVER shows everyone; MY TYPE shows
  // only accounts that fit the saved preferences — and only once a type is chosen
  // (you must set your preference first, then matching accounts appear here).
  const { isLoading, refetch, isRefetching, data, isError } = useQuery({
    queryKey: ["deck", activeSection],
    queryFn: activeSection === "myType" ? getMyTypeProfiles : getDiscoverProfiles,
    enabled: !!user && (activeSection === "discover" || hasChosenType),
    retry: 1, // retry once on failure
  });




  // ─── Derived ──────────────────────────────────────────────────────────────────
  const current = queue[index];

  //   FIX 2: Keep a stable ref to `current` so event handlers don't need it as dep
  const currentRef = useRef<Profile | undefined>(undefined);
  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  // ─── Mutations ────────────────────────────────────────────────────────────────

  // ── Browse navigation: scroll/drag DOWN → next, UP → previous ──
  // Reaching the last profile wraps back to the first, so the deck scrolls
  // endlessly like a reel instead of dead-ending on the final card.
  const goNext = useCallback(() => {
    setIndex((i) => (queue.length === 0 ? 0 : (i + 1) % queue.length));
    setSwipeDirection("up");
    dragY.set(0);
  }, [queue.length, dragY]);

  const goBack = useCallback(() => {
    setIndex((i) => (i <= 0 ? i : i - 1));
    setSwipeDirection("down");
    dragY.set(0);
  }, [dragY]);

  // Maps a liked profile's id → the match-request id the server returns, so the
  // heart button can later WITHDRAW (cancel) that exact request.
  const sentRequestsRef = useRef<Map<number, number>>(new Map());

  // Express interest by sending a like (the heart button and the double-tap
  // gesture both route through here).
  const interestMutation = useMutation({
    mutationFn: ({ profileId, action }: { profileId: number; action: "like" | "pass" }) =>
      sendInterest(profileId, action),
    onSuccess: (res, variables) => {
      // A like lights up the heart button's "liked" state.
      if (variables.action === "like") {
        setLiked((prev) => new Set(prev).add(variables.profileId));
        if (res.match_id != null) sentRequestsRef.current.set(variables.profileId, res.match_id);
      }
      if (res.matched && currentRef.current) {
        setMatchProfile(currentRef.current);
      } else {
        const username = currentRef.current?.full_name || "this person";
        showSuccess(`Match request sent to ${username}`);
      }
      setViewProfile(null);
      dragY.set(0);
    },
    onError: () => {
      dragY.set(0);
    },
  });

  //   FIX 4: isPending ref so handleAction stays stable. Mirror via an effect
  // (not during render) so reading it outside render stays current.
  const isPendingRef = useRef(false);
  useEffect(() => {
    isPendingRef.current = interestMutation.isPending;
  }, [interestMutation.isPending]);

  // const conversationMutation = useMutation({
  //   mutationFn: getConversation,
  //   onSuccess: (res) => router.push(`/chat/${res.id}`),
  // });

  const conversationMutation = useMutation({
    mutationFn: (participantId: number) => createOrGetConversation(participantId),
    onSuccess: (res) => router.push(`/chat/${res.id}`),
    onError: (err) => showError(err, "Could not open conversation. Please try again."),
  });

  // Withdraw a previously-sent like (heart button only — never the double-tap).
  const { mutate: cancelRequest } = useMutation({
    mutationFn: ({ matchId }: { matchId: number; profileId: number }) => cancelMatch(matchId),
    onSuccess: () => showSuccess("Match request withdrawn."),
    onError: (err, { profileId }) => {
      // Roll back the optimistic un-like so the UI matches the server.
      setLiked((prev) => new Set(prev).add(profileId));
      showError(err, "Could not withdraw request.");
    },
  });

  // Express interest — send a like for the current profile.
  const { mutate: mutateInterest } = interestMutation;
  const giveInterest = useCallback(() => {
    if (!currentRef.current || isPendingRef.current) return;
    mutateInterest({ profileId: currentRef.current.id, action: "like" });
  }, [mutateInterest]);

  // Heart button: tap to like (sends a match request), tap again to WITHDRAW
  // that request. (Double-tap never withdraws — withdrawing is button-only.)
  const toggleLike = useCallback(() => {
    const cur = currentRef.current;
    if (!cur || isPendingRef.current) return;
    if (likedRef.current.has(cur.id)) {
      setLiked((prev) => {
        const next = new Set(prev);
        next.delete(cur.id);
        return next;
      });
      const matchId = sentRequestsRef.current.get(cur.id);
      if (matchId != null) {
        sentRequestsRef.current.delete(cur.id);
        cancelRequest({ matchId, profileId: cur.id });
      }
    } else {
      giveInterest();
    }
  }, [giveInterest, cancelRequest]);

  // Double-tap the photo → pop a heart on EVERY double-tap, but only ever LIKE
  // (double-tapping again never removes the like — only the heart button toggles).
  const handlePhotoTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      lastTapRef.current = 0;
      setHeartBurst(true);
      const cur = currentRef.current;
      if (cur && !likedRef.current.has(cur.id)) giveInterest();
    } else {
      lastTapRef.current = now;
    }
  }, [giveInterest]);

  // Seed the local deck whenever a new query result lands. Adjusting state
  // during render via a prev-value tracker (instead of an effect) reseeds the
  // queue exactly when `data` changes, without a setState-in-effect cascade.
  const [prevData, setPrevData] = useState(data);
  if (data !== prevData) {
    setPrevData(data);
    if (data?.results) {
      setQueue(data.results);
      setIndex(0); // start from the first profile on every (re)load
      setQueueReady(true); //   always set ready, even if empty
    }
  }

  // Keyboard + scroll — UP goes back a profile, DOWN advances to the next.
  // The wheel is throttled so one scroll gesture = exactly one profile.
  useEffect(() => {
    let wheelLocked = false;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp")   goBack();
      if (e.key === "ArrowDown") goNext();
    };
    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < 30 || wheelLocked) return;
      wheelLocked = true;
      if (e.deltaY > 0) goNext();
      else goBack();
      window.setTimeout(() => { wheelLocked = false; }, 450);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("wheel", handleWheel, { passive: true });
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("wheel", handleWheel);
    };
  }, [goBack, goNext]);

  const handleRefresh = () => {
    setQueueReady(false);
    refetch();
  };

  return (
    <main className="min-h-[100dvh] text-[#2D2424]">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-4 pb-24 pt-4">

        {/* ── Header (stays pinned to the top while the deck scrolls) ── */}
        <header className="sticky top-2 z-30 mb-5 rounded-[26px] border border-white/60 bg-white/55 p-2 shadow-[0_8px_24px_rgba(16,24,40,0.10)] backdrop-blur-md">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setActiveSection("discover")}
              className={`rounded-full px-5 py-2.5 text-sm font-semibold tracking-[0.16em] transition ${
                activeSection === "discover"
                  ? "border border-white/75 bg-white/80 text-[#B78A3B] shadow-[0_6px_16px_rgba(16,24,40,0.08)]"
                  : "text-[#746767]"
              }`}
            >
              DISCOVER
            </button>

            <button
              type="button"
              onClick={() => setActiveSection("myType")}
              className={`rounded-full px-5 py-2.5 text-sm font-semibold tracking-[0.16em] transition ${
                activeSection === "myType"
                  ? "border border-white/75 bg-white/80 text-[#B78A3B] shadow-[0_6px_16px_rgba(16,24,40,0.08)]"
                  : "text-[#746767]"
              }`}
            >
              MY TYPE
            </button>
          </div>
        </header>

        {/* MY TYPE — must choose a type first; then the matching deck appears below. */}
        {activeSection === "myType" && !hasChosenType && (
          <section className="grid flex-1 place-items-center rounded-2xl border border-white/55 bg-white/35 p-8 text-center shadow-[0_8px_24px_rgba(16,24,40,0.08)] backdrop-blur-md">
            <div>
              <h2 className="text-xl font-semibold">You haven&apos;t chosen your type yet</h2>
              <p className="mt-2 text-sm text-[#746767]">
                Set your vibe so we can tune better matches.
              </p>
              <button
                onClick={() => router.push("/preferences")}
                className="glass-btn mt-6 inline-flex h-11 items-center justify-center rounded-full px-7 text-sm font-semibold"
              >
                Choose
              </button>
            </div>
          </section>
        )}

        {(activeSection === "discover" || (activeSection === "myType" && hasChosenType)) && (
          <>

        {/* ── Loading ── */}
        {(isLoading || isRefetching) && <DiscoverSkeleton />}

        {/* ── Empty state ── */}
        {!isLoading && !isRefetching && queueReady && !current && (
          <div className="grid flex-1 place-items-center rounded-2xl border border-[#EADDD2] p-8 text-center">
            {activeSection === "myType" ? (
              <div>
                <Sparkles className="mx-auto mb-4 h-10 w-10 text-[#B78A3B]" />
                <h2 className="text-lg font-semibold">No one matches your type yet</h2>
                <button
                  onClick={() => router.push("/preferences")}
                  className="glass-btn mt-5 inline-flex h-11 items-center justify-center rounded-full px-7 text-sm font-semibold text-[#2D2424]"
                >
                  Edit preferences
                </button>
              </div>
            ) : (
              <div>
                <HeartHandshake className="mx-auto mb-4 h-10 w-10 text-[#F87171]" />
                <h2 className="text-lg font-semibold">You&apos;ve seen everyone</h2>
                <p className="mt-2 text-sm text-[#746767]">
                  Check back later or refresh for new profiles.
                </p>
                <button
                  onClick={handleRefresh}
                  className="mt-5 flex h-11 items-center justify-center gap-2 rounded-xl glass-glossy px-5 text-sm font-semibold"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Profile card ── */}
        <AnimatePresence mode="wait">
          {current && !isLoading && !isRefetching && (
            <DiscoverCard
              key={current.id}
              profile={current}
              swipeDirection={swipeDirection}
              dragY={dragY}
              prevHintOpacity={prevHintOpacity}
              nextHintOpacity={nextHintOpacity}
              heartBurst={heartBurst}
              onHeartBurstComplete={() => setHeartBurst(false)}
              onPhotoTap={handlePhotoTap}
              onNext={goNext}
              onBack={goBack}
              isFirst={index === 0}
              onViewProfile={() => router.push(`/profile/${current.user}`)}
              onToggleLike={toggleLike}
              isLiked={liked.has(current.id)}
              isPending={interestMutation.isPending}
            />
          )}
        </AnimatePresence>
          </>
        )}
      </div>

      {/* ── Match modal — shown when a SuperStar becomes a mutual match ── */}
        <AnimatePresence>
          {matchProfile && (
            <MatchModal
              profile={matchProfile}
              onMessage={() => conversationMutation.mutate(matchProfile.user)}
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
              onLike={() => giveInterest()}
              onPass={() => {
                setViewProfile(null);
                goNext();
              }}
              onViewFull={() => router.push(`/profile/${viewProfile.user}`)}
              isPending={interestMutation.isPending}
            />
          )}
        </AnimatePresence>
      {/* ── Error state ── */}
      {!isLoading && !isRefetching && isError && (
        <div className="grid flex-1 place-items-center rounded-2xl border border-[#EADDD2] p-8 text-center">
          <div>
            <RefreshCw className="mx-auto mb-4 h-10 w-10 text-[#F87171]" />
            <h2 className="text-lg font-semibold">Something went wrong</h2>
            <p className="mt-2 text-sm text-[#746767]">
              Could not load profiles. Please try again.
            </p>
            <button
              onClick={handleRefresh}
              className="mt-5 flex h-11 items-center justify-center gap-2 rounded-xl glass-glossy px-5 text-sm font-semibold"
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



