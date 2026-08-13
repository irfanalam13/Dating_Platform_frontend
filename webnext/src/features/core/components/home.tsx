"use client";

import {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { HeartHandshake, RefreshCw, Sparkles } from "lucide-react";
import {
  getDiscoverProfiles,
  getMyTypeProfiles,
  sendInterest,
} from "@/shared/api/profile.api";
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

function shuffleProfiles<T>(items: T[], seed: number): T[] {
  const copy = [...items];
  let nextSeed = seed;

  for (let index = copy.length - 1; index > 0; index -= 1) {
    nextSeed = (nextSeed * 9301 + 49297) % 233280;
    const randomFactor = nextSeed / 233280;
    const swapIndex = Math.floor(randomFactor * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

export default function HomePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { data: myProfile } = useMyProfile();
  const [activeSection, setActiveSection] = useState<"discover" | "myType">(
    "discover",
  );

  const prefsSaved = useSyncExternalStore(
    () => () => {},
    () => localStorage.getItem("loviq_prefs_saved") === "1",
    () => false,
  );
  const hasChosenType = Boolean(myProfile?.preferences) || prefsSaved;

  const [index, setIndex] = useState(0);
  const [deckSeed, setDeckSeed] = useState(0);
  const [matchProfile, setMatchProfile] = useState<Profile | null>(null);
  const [viewProfile, setViewProfile] = useState<Profile | null>(null);
  const [swipeDirection, setSwipeDirection] = useState<"up" | "down" | null>(
    null,
  );

  const dragY = useMotionValue(0);
  const prevHintOpacity = useTransform(dragY, [-90, -40], [1, 0]);
  const nextHintOpacity = useTransform(dragY, [40, 90], [0, 1]);

  const [heartBurst, setHeartBurst] = useState(false);
  const lastTapRef = useRef(0);

  const [liked, setLiked] = useState<Set<number>>(new Set());
  const likedRef = useRef<Set<number>>(liked);
  useEffect(() => {
    likedRef.current = liked;
  }, [liked]);

  const { isLoading, refetch, isRefetching, data, isError } = useQuery({
    queryKey: ["deck", activeSection],
    queryFn:
      activeSection === "myType" ? getMyTypeProfiles : getDiscoverProfiles,
    enabled: !!user && (activeSection === "discover" || hasChosenType),
    retry: 1,
  });

  const dataResults = data?.results;
  const deckProfiles = useMemo(() => {
    if (!dataResults) return [] as Profile[];
    return shuffleProfiles(dataResults, deckSeed);
  }, [dataResults, deckSeed]);

  const profilesById = useMemo(() => {
    const map = new Map<number, Profile>();
    for (const profile of dataResults ?? []) {
      map.set(profile.id, profile);
    }
    return map;
  }, [dataResults]);

  const current =
    deckProfiles.length > 0
      ? deckProfiles[index % deckProfiles.length]
      : undefined;

  const currentRef = useRef<Profile | undefined>(undefined);
  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  const goNext = useCallback(() => {
    setIndex((i) =>
      deckProfiles.length === 0 ? 0 : (i + 1) % deckProfiles.length,
    );
    setSwipeDirection("up");
    dragY.set(0);
  }, [deckProfiles.length, dragY]);

  const goBack = useCallback(() => {
    setIndex((i) =>
      deckProfiles.length === 0
        ? 0
        : (i - 1 + deckProfiles.length) % deckProfiles.length,
    );
    setSwipeDirection("down");
    dragY.set(0);
  }, [deckProfiles.length, dragY]);

  const sentRequestsRef = useRef<Map<number, number>>(new Map());

  const interestMutation = useMutation({
    mutationFn: ({
      profileId,
      action,
    }: {
      profileId: number;
      action: "like" | "pass";
    }) => sendInterest(profileId, action),
    onSuccess: (res, variables) => {
      const targetProfile =
        profilesById.get(variables.profileId) ?? currentRef.current;

      if (variables.action === "like") {
        setLiked((prev) => new Set(prev).add(variables.profileId));
        if (res.match_id != null) {
          sentRequestsRef.current.set(variables.profileId, res.match_id);
        }
      }

      if (res.matched && targetProfile) {
        setMatchProfile(targetProfile);
      } else {
        const username = targetProfile?.full_name || "this person";
        showSuccess(`Match request sent to ${username}`);
      }

      setViewProfile(null);
      dragY.set(0);
    },
    onError: () => {
      dragY.set(0);
    },
  });

  const isPendingRef = useRef(false);
  useEffect(() => {
    isPendingRef.current = interestMutation.isPending;
  }, [interestMutation.isPending]);

  const conversationMutation = useMutation({
    mutationFn: (participantId: number) =>
      createOrGetConversation(participantId),
    onSuccess: (res) => router.push(`/chat/${res.id}`),
    onError: (err) =>
      showError(err, "Could not open conversation. Please try again."),
  });

  const { mutate: cancelRequest } = useMutation({
    mutationFn: ({ matchId }: { matchId: number; profileId: number }) =>
      cancelMatch(matchId),
    onSuccess: () => showSuccess("Match request withdrawn."),
    onError: (err, { profileId, matchId }) => {
      setLiked((prev) => new Set(prev).add(profileId));
      sentRequestsRef.current.set(profileId, matchId);
      showError(err, "Could not withdraw request.");
    },
  });

  const { mutate: mutateInterest } = interestMutation;
  const giveInterest = useCallback(() => {
    if (!currentRef.current || isPendingRef.current) return;
    mutateInterest({ profileId: currentRef.current.id, action: "like" });
  }, [mutateInterest]);

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

  useEffect(() => {
    let wheelLocked = false;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") goBack();
      if (e.key === "ArrowDown") goNext();
    };

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < 30 || wheelLocked) return;
      wheelLocked = true;
      if (e.deltaY > 0) goNext();
      else goBack();
      window.setTimeout(() => {
        wheelLocked = false;
      }, 450);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("wheel", handleWheel, { passive: true });
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("wheel", handleWheel);
    };
  }, [goBack, goNext]);

  const handleRefresh = () => {
    setIndex(0);
    setDeckSeed((value) => value + 1);
    refetch();
  };

  return (
    <main className="min-h-[100dvh] text-[#2D2424]">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-4 pb-24 pt-4">
        <header className="sticky top-2 z-30 mb-5 rounded-[26px] border border-white/60 bg-white/55 p-2 shadow-[0_8px_24px_rgba(16,24,40,0.10)] backdrop-blur-md">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveSection("discover");
                setIndex(0);
              }}
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
              onClick={() => {
                setActiveSection("myType");
                setIndex(0);
              }}
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

        {activeSection === "myType" && !hasChosenType && (
          <section className="grid flex-1 place-items-center rounded-2xl border border-white/55 bg-white/35 p-8 text-center shadow-[0_8px_24px_rgba(16,24,40,0.08)] backdrop-blur-md">
            <div>
              <h2 className="text-xl font-semibold">
                You haven&apos;t chosen your type yet
              </h2>
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

        {(activeSection === "discover" ||
          (activeSection === "myType" && hasChosenType)) && (
          <>
            {(isLoading || isRefetching) && <DiscoverSkeleton />}

            {!isLoading && !isRefetching && deckProfiles.length === 0 && (
              <div className="grid flex-1 place-items-center rounded-2xl border border-[#EADDD2] p-8 text-center">
                {activeSection === "myType" ? (
                  <div>
                    <Sparkles className="mx-auto mb-4 h-10 w-10 text-[#B78A3B]" />
                    <h2 className="text-lg font-semibold">
                      No one matches your type yet
                    </h2>
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
                    <h2 className="text-lg font-semibold">
                      You&apos;ve seen everyone
                    </h2>
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
