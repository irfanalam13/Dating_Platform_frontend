"use client";

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import {
  BadgeCheck,
  Eye,
  Heart,
  HeartHandshake,
  MapPin,
  RefreshCw,
  Star,
  Undo2,
  X,
  Sparkles,
} from "lucide-react";
import { getDiscoverProfiles, getMyTypeProfiles, sendInterest } from "@/shared/api/profile.api";
import { getConversation } from "@/shared/api/chat.api";
import type { Profile } from "@/shared/types/profile.types";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth";
import { createOrGetConversation } from "@/shared/api/chat.api";
import { showError, showSuccess } from "@/shared/utils/toast";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { useMyProfile } from "@/features/profile/hooks/useProfile";
import ProfileImage from "@/shared/components/ProfileImage";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function displayImage(profile: Profile) {
  return profile.profile_image_url || profile.profile_image || "/default.png";
}

type InterestKind = "like" | "superstar" | "undo";

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function DiscoverSkeleton() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-[#EADDD2] shadow-sm animate-pulse">
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
        className="w-full max-w-sm overflow-hidden rounded-2xl shadow-xl"
      >
        <div className="relative h-40 w-full">
          <ProfileImage
            src={displayImage(profile)}
            name={profile.full_name}
            alt={profile.full_name || "Match"}
            className="h-full w-full"
            textClassName="text-5xl"
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
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl glass-glossy text-sm font-semibold disabled:opacity-60"
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
  onViewFull,        // 👈 add this
  isPending,
}: {
  profile: Profile;
  onClose: () => void;
  onLike: () => void;
  onPass: () => void;
  onViewFull: () => void;  // 👈 add this
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
        className="mb-4 max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-2xl shadow-xl"
      >
        {/* Image header — blurred for private accounts */}
        <div className="relative h-56 w-full shrink-0">
          <ProfileImage
            src={displayImage(profile)}
            name={profile.full_name}
            alt={profile.full_name || "Profile"}
            className={`h-full w-full${profile.is_private ? " scale-110 blur-2xl" : ""}`}
            textClassName="text-6xl"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#2D2424]/80 to-transparent" />
          <button
            onClick={onClose}
            className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/20 backdrop-blur-sm"
          >
            <X className="h-4 w-4 text-white" />
          </button>
          {typeof profile.match_percentage === "number" && (
            <span className="absolute left-4 top-4 flex items-center gap-1 rounded-full glass-glossy px-3 py-1 text-xs font-bold shadow-lg">
              <Sparkles className="h-3.5 w-3.5 text-[#FFD27A]" />
              {profile.match_percentage}% match
            </span>
          )}
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
                  className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-[#7A2432]"
                >
                  <Sparkles className="h-3 w-3" />
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
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
                      {/* View Full Profile */}
            <button
              onClick={onViewFull}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#7A2432] text-sm font-semibold text-[#7A2432]"
            >
              <Eye className="h-4 w-4" />
              View Full Profile
            </button>
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
              className="flex h-12 items-center justify-center gap-2 rounded-xl glass-glossy text-sm font-semibold disabled:opacity-50"
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
  const { data: myProfile } = useMyProfile();
  const [activeSection, setActiveSection] = useState<"discover" | "myType">("discover");

  // Once preferences are saved we persist a flag so the "My Type" page always
  // shows the saved state — permanently, even across reloads/cache misses.
  const [prefsSaved, setPrefsSaved] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("loviq_prefs_saved") === "1") {
      setPrefsSaved(true);
    }
  }, []);
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

  // Double-tap-to-superstar (TikTok/Instagram style)
  const [heartBurst, setHeartBurst] = useState(false);
  const lastTapRef = useRef(0);

  // Profiles the user has liked via the heart button — drives the heart fill
  // (hollow → reddish) and toggles on/off. Superstar (double-tap) does NOT
  // touch this, so a double-tap never lights up the like button.
  const [liked, setLiked] = useState<Set<number>>(new Set());
  const likedRef = useRef<Set<number>>(liked);
  likedRef.current = liked;

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
  const goNext = useCallback(() => {
    setIndex((i) => (i >= queue.length - 1 ? i : i + 1));
    setSwipeDirection("up");
    dragY.set(0);
  }, [queue.length, dragY]);

  const goBack = useCallback(() => {
    setIndex((i) => (i <= 0 ? i : i - 1));
    setSwipeDirection("down");
    dragY.set(0);
  }, [dragY]);

  // Express interest. kind === "superstar" (double-tap) vs "like" (heart button)
  // changes only the toast — the backend action is the same.
  const interestMutation = useMutation({
    mutationFn: ({ profileId, action }: { profileId: number; action: "like" | "pass"; kind?: "like" | "superstar" }) =>
      sendInterest(profileId, action),
    onSuccess: (res, variables) => {
      // Only the heart button lights up the "liked" state. A superstar
      // (double-tap) must NOT fill the like button.
      if (variables.kind === "like") {
        setLiked((prev) => new Set(prev).add(variables.profileId));
      }
      if (res.matched && currentRef.current) {
        setMatchProfile(currentRef.current);
      } else {
        const username = currentRef.current?.full_name || "this person";
        showSuccess(
          variables.kind === "superstar"
            ? `you gave ${username} superstar`
            : `you liked ${username}`
        );
      }
      setViewProfile(null);
      dragY.set(0);
    },
    onError: () => {
      dragY.set(0);
    },
  });

  //   FIX 4: isPending ref so handleAction stays stable
  const isPendingRef = useRef(false);
  isPendingRef.current = interestMutation.isPending;

  // const conversationMutation = useMutation({
  //   mutationFn: getConversation,
  //   onSuccess: (res) => router.push(`/chat/${res.id}`),
  // });

  const conversationMutation = useMutation({
    mutationFn: (participantId: number) => createOrGetConversation(participantId),
    onSuccess: (res) => router.push(`/chat/${res.id}`),
    onError: (err) => showError(err, "Could not open conversation. Please try again."),
  });

  // Express interest — "like" (heart button) or "superstar" (double-tap)
  const giveInterest = useCallback((kind: "like" | "superstar") => {
    if (!currentRef.current || isPendingRef.current) return;
    interestMutation.mutate({ profileId: currentRef.current.id, action: "like", kind });
  }, [interestMutation.mutate]);

  // Heart button: toggles. Tap to like, tap again to unlike, again to like…
  // When un-liking we only clear it locally (there is no un-send endpoint).
  const toggleLike = useCallback(() => {
    const cur = currentRef.current;
    if (!cur || isPendingRef.current) return;
    if (likedRef.current.has(cur.id)) {
      setLiked((prev) => {
        const next = new Set(prev);
        next.delete(cur.id);
        return next;
      });
    } else {
      giveInterest("like");
    }
  }, [giveInterest]);

  // Double-tap the photo → star burst + superstar (TikTok/Instagram style)
  const handlePhotoTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      lastTapRef.current = 0;
      setHeartBurst(true);
      giveInterest("superstar");
    } else {
      lastTapRef.current = now;
    }
  }, [giveInterest]);

  useEffect(() => {
    if (data?.results) {
      setQueue(data.results);
      setIndex(0); // start from the first profile on every (re)load
      setQueueReady(true); //   always set ready, even if empty
    }
  }, [data]);

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

        {/* ── Header ── */}
        <header className="mb-5 rounded-[26px] border border-white/60 bg-white/55 p-2 shadow-[0_8px_24px_rgba(16,24,40,0.10)] backdrop-blur-md">
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
                <p className="mt-2 text-sm text-[#746767]">
                  Try widening your preferences — we&apos;ll show matching accounts here as they join.
                </p>
                <button
                  onClick={() => router.push("/preferences")}
                  className="glass-btn mt-5 inline-flex h-11 items-center justify-center rounded-full px-7 text-sm font-semibold text-[#2D2424]"
                >
                  Edit preferences
                </button>
              </div>
            ) : (
              <div>
                <HeartHandshake className="mx-auto mb-4 h-10 w-10 text-[#7A2432]" />
                <h2 className="text-lg font-semibold">You've seen everyone</h2>
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
            <motion.section
              key={current.id}
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
                // Easier to trigger on a phone: small flick OR a short drag.
                if (offset < -60 || velocity < -500) {
                  goBack();
                } else if (offset > 60 || velocity > 500) {
                  goNext();
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
                src={displayImage(current)}
                name={current.full_name}
                alt={current.full_name || "Profile"}
                className={`absolute inset-0 h-full w-full${current.is_private ? " scale-110 blur-2xl" : ""}`}
                textClassName="text-8xl"
                draggable={false}
              />
              {current.is_private && (
                <span className="absolute left-4 top-4 z-10 rounded-full bg-black/45 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                  Private
                </span>
              )}

              {/* My-Type match score — only present on the My-Type deck. */}
              {typeof current.match_percentage === "number" && (
                <span className="absolute right-4 top-4 z-10 flex items-center gap-1 rounded-full glass-glossy px-3 py-1 text-xs font-bold shadow-lg">
                  <Sparkles className="h-3.5 w-3.5 text-[#FFD27A]" />
                  {current.match_percentage}% match
                </span>
              )}

              {/* Double-tap target over the photo (buttons sit above this, z-10).
                  touch-none lets the parent own the vertical drag gesture. */}
              <div
                className="absolute inset-0 z-[6] touch-none"
                onClick={handlePhotoTap}
              />

              {/* Star burst on double-tap → "super interested" */}
              {heartBurst && (
                <motion.div
                  key="star-burst"
                  className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [0, 1.25, 1], opacity: [0, 1, 0] }}
                  transition={{ duration: 0.9, times: [0, 0.3, 1] }}
                  onAnimationComplete={() => setHeartBurst(false)}
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
                    {current.full_name || "Profile"}
                  </h2>
                  {current.verified && <BadgeCheck className="h-6 w-6 text-[#FFD27A]" />}
                </div>

                {(() => {
                  const ageNum = Number(current.age);
                  const bits = [
                    current.city,
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
                  const realTags = (current.compatibility_tags ?? []).filter(
                    (t) => t?.trim().toLowerCase() !== "meaningful profile"
                  );
                  const tags =
                    realTags.length > 0
                      ? realTags
                      : ([current.career, current.values].filter(Boolean) as string[]);
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
                {current.hobbies && (
                  <p className="mt-3 line-clamp-2 text-sm text-white/85">
                    <span className="font-semibold">Hobbies:</span> {current.hobbies}
                  </p>
                )}

                {/* Action row: Previous · View profile · Interested (like) */}
                <div className="mt-5 flex items-center justify-between gap-3">
                  <button
                    onClick={goBack}
                    disabled={index === 0}
                    aria-label="Previous profile"
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/20 text-white backdrop-blur-md transition hover:bg-white/30 disabled:opacity-40"
                  >
                    <Undo2 className="h-5 w-5" />
                  </button>

                  <button
                    onClick={() => router.push(`/profile/${current.user}`)}
                    className="flex h-12 flex-1 items-center justify-center rounded-full bg-[#FF4458] text-sm font-semibold text-white shadow-lg transition hover:brightness-105"
                  >
                    View profile
                  </button>

                  <button
                    onClick={toggleLike}
                    disabled={interestMutation.isPending}
                    aria-label={liked.has(current.id) ? "Unlike" : "Like"}
                    aria-pressed={liked.has(current.id)}
                    className={`grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/20 backdrop-blur-md transition hover:bg-white/30 disabled:opacity-50 ${
                      liked.has(current.id) ? "text-[#FF4458]" : "text-white"
                    }`}
                  >
                    {interestMutation.isPending ? (
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <motion.span
                        key={liked.has(current.id) ? "liked" : "unliked"}
                        initial={{ scale: 0.6 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 18 }}
                      >
                        <Heart
                          className="h-5 w-5"
                          fill={liked.has(current.id) ? "currentColor" : "none"}
                        />
                      </motion.span>
                    )}
                  </button>
                </div>
              </div>
            </motion.section>
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
              onLike={() => giveInterest("like")}
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
            <RefreshCw className="mx-auto mb-4 h-10 w-10 text-[#7A2432]" />
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



