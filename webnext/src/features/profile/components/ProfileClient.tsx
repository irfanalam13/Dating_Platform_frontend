"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { ImageLightbox } from "@/shared/ui/image-lightbox";
import {
  BadgeCheck,
  MapPin,
  PenLine,
  Settings,
  Eye,
  Lock,
  Heart,
  BookOpen,
  Briefcase,
  Star,
  Globe,
  Sparkles,
  ChevronRight,
  Link,
  Music,
  ExternalLink,
  HeartHandshake,
  MoreVertical,
  Ban,
  Flag,
  MessageCircle,
  Check,
  ArrowLeft,
  X,
} from "lucide-react";
import type { Profile, PublicProfile } from "@/shared/types/profile.types";
import ProfileImage from "@/shared/components/ProfileImage";
import { blockProfile, reportProfile } from "@/shared/api/mvp.api";
import { showSuccess, showError } from "@/shared/utils/toast";
import FollowButton from "@/features/follow/components/FollowButton";

const PROFILE_REPORT_REASONS: { value: "spam" | "fake" | "abuse" | "nudity" | "other"; label: string }[] = [
  { value: "abuse", label: "Harassment / Abuse" },
  { value: "fake", label: "Fake profile" },
  { value: "nudity", label: "Sexual content" },
  { value: "spam", label: "Spam" },
  { value: "other", label: "Other" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

/** "own" = logged-in user viewing their own profile (edit mode)
 *  "public" = someone else viewing another person's profile */
type ProfileMode = "own" | "public";

interface ProfileClientProps {
  mode: ProfileMode;
  // For own profile — pass Profile from useUserProfile()
  data?: Profile;
  // For public profile — pass PublicProfile from usePublicProfile()
  publicData?: PublicProfile;
  isLoading?: boolean;
  // Only used in "public" mode
  onLike?: () => void;
  onPass?: () => void;
  isPending?: boolean;
  // Relationship with the viewed user — drives which actions are shown.
  relationship?: "matched" | "requested" | "none";
  onMessage?: () => void;
  isMessaging?: boolean;
}

// ─── Social link meta ─────────────────────────────────────────────────────────
const SOCIAL_META: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  instagram: { icon: Link,         color: "text-pink-500",    label: "Instagram" },
  linkedin:  { icon: Link,         color: "text-blue-600",    label: "LinkedIn"  },
  twitter:   { icon: Link,         color: "text-sky-500",     label: "Twitter"   },
  spotify:   { icon: Music,        color: "text-green-500",   label: "Spotify"   },
  tiktok:    { icon: Music,        color: "text-neutral-800", label: "TikTok"    },
  other:     { icon: ExternalLink, color: "text-gray-500",    label: "Link"      },
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function ProfileSkeleton() {
  return (
    <main className="min-h-[100dvh] px-4 py-5">
      <div className="mx-auto max-w-md animate-pulse space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-3 w-20 rounded bg-[#EADDD2]" />
            <div className="h-6 w-36 rounded bg-[#EADDD2]" />
          </div>
          <div className="h-10 w-10 rounded-full bg-[#EADDD2]" />
        </div>
        <div className="overflow-hidden rounded-3xl">
          <div className="h-72 w-full bg-[#EADDD2]" />
          <div className="space-y-4 p-5">
            <div className="h-6 w-1/2 rounded bg-[#EADDD2]" />
            <div className="h-4 w-1/3 rounded bg-[#EADDD2]" />
            <div className="space-y-2">
              <div className="h-3 w-full rounded bg-[#EADDD2]" />
              <div className="h-3 w-5/6 rounded bg-[#EADDD2]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 rounded-3xl bg-[#EADDD2]" />
              ))}
            </div>
            <div className="h-12 w-full rounded-3xl bg-[#EADDD2]" />
          </div>
        </div>
      </div>
    </main>
  );
}

// ─── Completion bar (own profile only) ───────────────────────────────────────
function completionScore(data: Profile): number {
  const fields: (keyof Profile)[] = [
    "full_name", "bio", "city", "age", "gender",
    "education", "career",
    "profile_image", "hobbies", "values",
  ];
  const filled = fields.filter((f) => {
    const val = data[f];
    return val !== null && val !== undefined && val !== "";
  }).length;
  return Math.round((filled / fields.length) * 100);
}

function CompletionBar({ score }: { score: number }) {
  const color = "#22ff43ff";
  return (
    <div className="rounded-3xl p-4">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-semibold text-[#2D2424]">Profile strength</span>
        <span className="font-bold text-black">{score}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[#EADDD2]">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      {score < 100 && (
        <p className="mt-2 text-xs text-[#746767]">
          {score < 50
            ? "Complete your profile to get more matches."
            : score < 80
            ? "Almost there — add a few more details."
            : "Great profile! Small touches can still help."}
        </p>
      )}
    </div>
  );
}

// ─── Info Card ────────────────────────────────────────────────────────────────
function InfoCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  const isEmpty = !value || value === "Not added";
  return (
    <div className="flex items-start gap-3 rounded-3xl p-3">
      <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-3xl">
        <Icon className="h-4 w-4 text-black" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-[#746767]">{label}</p>
        <p className={`truncate text-sm font-medium ${isEmpty ? "italic text-[#BFBFBF]" : "text-[#2D2424]"}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

function TagPill({ label }: { label: string }) {
  return (
    <span className="rounded-full px-3 py-1 text-xs font-medium text-[#2D2424]">
      {label}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-[#B78A3B]">
        {title}
      </h3>
      {children}
    </section>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProfileClient({
  mode,
  data,
  publicData,
  isLoading,
  onLike,
  onPass,
  isPending,
  relationship = "none",
  onMessage,
  isMessaging,
}: ProfileClientProps) {
  const router = useRouter();
  const [zoomImage, setZoomImage] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showReport, setShowReport] = useState(false);

  // Profile id of the viewed user (public mode) — used by block/report.
  const targetProfileId = publicData?.id;

  const blockMutation = useMutation({
    mutationFn: (pid: number) => blockProfile(pid),
    onSuccess: () => { showSuccess("User blocked."); router.push("/home"); },
    onError: (err) => showError(err, "Failed to block user."),
  });

  const reportMutation = useMutation({
    mutationFn: (vars: { pid: number; reason: "spam" | "fake" | "abuse" | "nudity" | "other" }) =>
      reportProfile(vars.pid, { reason: vars.reason, description: "Reported from profile." }),
    onSuccess: () => { setShowReport(false); showSuccess("Report submitted. Thank you."); },
    onError: (err) => { setShowReport(false); showError(err, "Failed to submit report."); },
  });

  if (isLoading) return <ProfileSkeleton />;

  // ── Own profile error state ───────────────────────────────────────────────
  if (mode === "own" && !data) {
    return (
      <main className="grid min-h-[100dvh] place-items-center px-4 text-center">
        <div>
          <p className="text-3xl font-semibold text-[#2D2424]">Profile unavailable</p>
          <p className="mt-1 text-sm text-[#746767]">Something went wrong loading your profile.</p>
          <button
            onClick={() => router.refresh()}
            className="glass-btn mt-4 rounded-3xl px-5 py-2.5 text-sm font-semibold"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  // ── Public profile error state ────────────────────────────────────────────
  if (mode === "public" && !publicData) {
    return (
      <main className="grid min-h-[100dvh] place-items-center px-4 text-center">
        <div>
          <p className="text-3xl font-semibold text-[#2D2424]">Profile not found</p>
          <p className="mt-1 text-sm text-[#746767]">This profile may no longer exist.</p>
          <button
            onClick={() => router.back()}
            className="glass-btn mt-4 rounded-3xl px-5 py-2.5 text-sm font-semibold"
          >
            Go back
          </button>
        </div>
      </main>
    );
  }

  // ── Normalise fields ──────────────────────────────────────
  const isOwn = mode === "own";

    const name        = isOwn ? data!.full_name          : publicData!.full_name;
    const age         = isOwn ? data!.age                : publicData!.age;
    const city        = isOwn ? data!.city               : publicData!.city;
    const bio         = isOwn ? data!.bio                : publicData!.bio;
    const verified    = isOwn ? data!.verified           : publicData!.verified;
    const image       = isOwn
    ? (data!.profile_image_url || data!.profile_image || "/default.png")
    : (publicData!.profile_image_url || "/default.png");

    const education    = isOwn ? data!.education           : publicData!.education;
    const career       = isOwn ? data!.career              : publicData!.career;
    const ethnicity    = isOwn ? data!.ethnicity           : publicData!.ethnicity;
    const values       = isOwn ? data!.values              : publicData!.values;
    const religion     = isOwn ? data!.religion_name       : publicData!.religion_name;
    const community    = isOwn ? data!.community_name       : publicData!.community_name;
    // Prefer the deep-taxonomy name (set by the edit cascade), fall back to the legacy FK name.
    const caste        = (isOwn ? (data!.caste_v2_name ?? data!.caste_name)
                                : (publicData!.caste_v2_name ?? publicData!.caste_name));
    const subCaste     = isOwn ? data!.sub_caste_name       : publicData!.sub_caste_name;
    const clan         = isOwn ? data!.clan_name            : publicData!.clan_name;
    const gotra        = (isOwn ? (data!.gotra_v2_name ?? data!.gotra_name)
                                : (publicData!.gotra_v2_name ?? publicData!.gotra_name));
    const gan          = isOwn ? data!.gan                 : publicData!.gan;
    const horoscope    = isOwn ? data!.horoscope           : publicData!.horoscope;

    // Basic details + lifestyle (any may be null when the owner hid it publicly).
    const dob          = isOwn ? data!.date_of_birth        : (publicData!.date_of_birth ?? null);
    const gender       = isOwn ? data!.gender               : publicData!.gender;
    const height       = isOwn ? data!.height_cm            : publicData!.height_cm;
    const weight       = isOwn ? data!.weight_kg            : publicData!.weight_kg;
    const nationality  = isOwn ? data!.nationality          : publicData!.nationality;
    const citizenship  = isOwn ? data!.citizenship          : publicData!.citizenship;
    const relIntent    = isOwn ? data!.relationship_intent  : publicData!.relationship_intent;
    const wantsChildren= isOwn ? data!.wants_children       : publicData!.wants_children;
    const diet         = isOwn ? data!.diet                 : publicData!.diet;
    const alcohol      = isOwn ? data!.alcohol              : publicData!.alcohol;
    const smoking      = isOwn ? data!.smoking              : publicData!.smoking;
    const educationLevel = isOwn ? data!.education_level    : publicData!.education_level;
    const industry     = isOwn ? data!.industry             : publicData!.industry;
    const incomeRange  = isOwn ? data!.income_range         : publicData!.income_range;
    const familyType   = isOwn ? data!.family_type          : publicData!.family_type;
    const isProfilePublic = isOwn ? data!.is_profile_public : publicData!.is_profile_public;
    // Someone else viewing a private account → blur the photo (privacy = blur).
    const blurPhoto    = !isOwn && !isProfilePublic;
    const isOnline     = false;
    const distanceKm   = null;
    const languages: string[] = (isOwn ? data!.languages_spoken : publicData!.languages_spoken) ?? [];
    const socialLinks: { platform: string; url: string }[] = [];

    // Build a label/value list of details, dropping anything empty/hidden.
    const dobLabel = dob ? new Date(dob).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "";
    const detailItems: { label: string; value: string }[] = [
      { label: "Date of birth", value: dobLabel },
      { label: "Gender", value: gender ? String(gender) : "" },
      { label: "Height", value: height ? `${height} cm` : "" },
      { label: "Weight", value: weight ? `${weight} kg` : "" },
      { label: "Languages", value: languages.join(", ") },
      { label: "Nationality", value: nationality || "" },
      { label: "Citizenship", value: citizenship || "" },
      { label: "Looking for", value: relIntent || "" },
      { label: "Wants children", value: wantsChildren || "" },
      { label: "Diet", value: diet || "" },
      { label: "Alcohol", value: alcohol || "" },
      { label: "Smoking", value: smoking || "" },
      { label: "Education level", value: educationLevel || "" },
      { label: "Industry", value: industry || "" },
      { label: "Income", value: incomeRange || "" },
      { label: "Family type", value: familyType || "" },
    ].filter((d) => d.value && d.value.trim() !== "");

    const hobbies: string[] = (() => {
    const raw = isOwn ? data!.hobbies : publicData!.hobbies;
    return raw ? raw.split(",").map((h) => h.trim()).filter(Boolean) : [];
    })();

    //   Fixed — no stray ternary
    const compatibilityTags: string[] = isOwn
    ? ((data as any).compatibility_tags ?? [])
    : [];

    const score = isOwn ? completionScore(data!) : 0;

  return (
    <main className="min-h-[100dvh] pb-10 text-[#2D2424]">
      <div className="mx-auto max-w-md space-y-4 px-4 py-5">

        {/* ── Header ── */}
        <header className="relative">
          <button
            onClick={() => router.back()}
            aria-label="Go back"
            className="glass-btn mb-3 grid h-10 w-10 place-items-center rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            {isOwn ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B78A3B]">My profile</p>
                <br />
                <h1 className="text-3xl font-semibold">
                {data?.full_name || "My Profile"}
                </h1>
              </>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B78A3B]">Profile</p>
                <h1 className="text-3xl font-semibold">{name || "View profile"}</h1>
              </>
            )}
          </div>

          <div className="absolute right-0 top-0 h-4 flex items-center">
            {isOwn ? (
              <button
                onClick={() => router.push("/settings")}
                className="glass-btn grid h-10 w-10 place-items-center rounded-full"
              >
                <Settings className="h-5 w-5" />
              </button>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="glass-btn grid h-10 w-10 place-items-center rounded-full"
                  aria-label="More options"
                >
                  <MoreVertical className="h-5 w-5" />
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-black/5 text-sm">
                      <button
                        onClick={() => { setMenuOpen(false); setShowReport(true); }}
                        disabled={!targetProfileId}
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[#2D2424] hover:bg-gray-50 disabled:opacity-40"
                      >
                        <Flag className="h-4 w-4" /> Report user
                      </button>
                      <button
                        onClick={() => { setMenuOpen(false); if (targetProfileId) blockMutation.mutate(targetProfileId); }}
                        disabled={!targetProfileId || blockMutation.isPending}
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[#7A2432] hover:bg-gray-50 disabled:opacity-40"
                      >
                        <Ban className="h-4 w-4" /> Block user
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </header>

        {/* ── Completion bar (own only) ── */}
        {isOwn && <CompletionBar score={score} />}

        {/* ── Top Section: Profile Pic & Cultural Info ── */}
        <section className="flex items-start gap-12 mb-6">
          <div className="flex-shrink-0 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => { if (!blurPhoto) setZoomImage(true); }}
              aria-label="View profile picture"
              className="rounded-full"
            >
              <ProfileImage
                src={image}
                name={name}
                alt={name || "Profile"}
                className={`h-32 w-32 rounded-full shadow-sm transition${blurPhoto ? " scale-105 blur-xl" : " cursor-pointer hover:opacity-90"}`}
                textClassName="text-4xl"
              />
            </button>

            {/* Lightbox is disabled for blurred (private) photos so it can't reveal them. */}
            {!blurPhoto && (
              <ImageLightbox
                src={image}
                alt={name || "Profile"}
                open={zoomImage}
                onClose={() => setZoomImage(false)}
              />
            )}
            
            {/* Own: public/private badge */}
            {isOwn && (
              <div className="flex flex-col items-center gap-1.5 mt-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isProfilePublic ? "text-[#3F7D63]" : "text-gray-500"}`}>
                  {isProfilePublic ? (
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" />Account Public</span>
                  ) : (
                    <span className="flex items-center gap-1"><Lock className="h-3 w-3" />Account Private</span>
                  )}
                </span>
                {verified && (
                  <span className="rounded-full px-2.5 py-1 text-xs font-semibold text-[#3FC88A]">
                    Verified
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex-grow flex flex-col gap-3 min-w-0">
            <div>
              <div className="flex items-center gap-2">
                {verified && !isOwn && <BadgeCheck className="h-5 w-5 text-[#3FC88A] shrink-0" />}
                {!isOwn && isOnline && (
                  <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs text-emerald-700 shrink-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Online
                  </span>
                )}
              </div>
              <p className="mt-0 flex items-center gap-1 text-sm text-[#746767]">
              </p>
            </div>

            {/* Cultural background block */}
            <div className="flex flex-col gap-0.5 mt-3 text-xs text-[#746767]">
              <p><span className="font-semibold text-[#2D2424]">Ethnicity:</span> {ethnicity || <span className="italic text-[#BFBFBF]">Not added</span>}</p>
              <p><span className="font-semibold text-[#2D2424]">Religion:</span> {religion || <span className="italic text-[#BFBFBF]">Not added</span>}</p>
              {community && <p><span className="font-semibold text-[#2D2424]">Community:</span> {community}</p>}
              <p><span className="font-semibold text-[#2D2424]">Caste:</span> {caste || <span className="italic text-[#BFBFBF]">Not added</span>}</p>
              {subCaste && <p><span className="font-semibold text-[#2D2424]">Sub-caste:</span> {subCaste}</p>}
              {clan && <p><span className="font-semibold text-[#2D2424]">Clan:</span> {clan}</p>}
              <p><span className="font-semibold text-[#2D2424]">Gotra:</span> {gotra || <span className="italic text-[#BFBFBF]">Not added</span>}</p>
              <p><span className="font-semibold text-[#2D2424]">Gan:</span> {gan || <span className="italic text-[#BFBFBF]">Not added</span>}</p>
              <p><span className="font-semibold text-[#2D2424]">Horoscope:</span> {horoscope || <span className="italic text-[#BFBFBF]">Not added</span>}</p>
            </div>
          </div>
        </section>

        <Section title="Bio">
            <div className="rounded-3xl p-4 text-sm leading-6 text-[#746767]">
              {bio || (
                <span className="italic text-[#BFBFBF]">
                  {isOwn ? "Add a bio for yourself" : "No bio added."}
                </span>
              )}
            </div>
        </Section>

        {/* ── Details (DOB, height, languages, lifestyle…) ── */}
        {detailItems.length > 0 && (
          <Section title="Details">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-3xl p-4">
              {detailItems.map((d) => (
                <div key={d.label} className="min-w-0">
                  <p className="text-xs text-[#746767]">{d.label}</p>
                  <p className="truncate text-sm font-medium text-[#2D2424] capitalize">{d.value}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* CTA row */}
        <div className="mb-6 space-y-3">
          {isOwn ? (
            <>
              <button
                onClick={() => router.push("/profile/edit")}
                className="glass-btn flex h-12 w-full items-center justify-center gap-2 rounded-3xl font-semibold transition-opacity active:opacity-80"
              >
                <PenLine className="h-4 w-4" />
                Edit profile
              </button>
              <button
                onClick={() => router.push("/connections")}
                className="glass-btn flex h-12 w-full items-center justify-center gap-2 rounded-3xl font-semibold transition-opacity active:opacity-80"
              >
                <HeartHandshake className="h-4 w-4" />
                Followers &amp; Following
              </button>
            </>
          ) : relationship === "matched" ? (
            // Already friends/matched → message + follow state, no Interest/Pass.
            <>
              <div className="flex items-center justify-center gap-1.5 rounded-3xl py-1 text-sm font-semibold text-[#3F7D63]">
                <Check className="h-4 w-4" /> You’re matched
              </div>
              <button
                onClick={onMessage}
                disabled={isMessaging}
                className="glass-btn flex h-12 w-full items-center justify-center gap-2 rounded-3xl text-sm font-semibold disabled:opacity-50"
              >
                {isMessaging ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
                ) : (
                  <><MessageCircle className="h-4 w-4" /> Message</>
                )}
              </button>
              {publicData?.user && <FollowButton userId={publicData.user} className="w-full" />}
            </>
          ) : relationship === "requested" ? (
            // Interest already sent and still pending.
            <>
              <button
                disabled
                className="glass-btn flex h-12 w-full items-center justify-center gap-2 rounded-3xl text-sm font-semibold opacity-70"
              >
                <Check className="h-4 w-4" /> Request sent
              </button>
              {publicData?.user && <FollowButton userId={publicData.user} className="w-full" />}
            </>
          ) : (
            <>
              {publicData?.user && (
                <FollowButton userId={publicData.user} className="w-full" />
              )}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={onPass}
                  disabled={isPending}
                  className="glass-btn flex h-12 items-center justify-center gap-2 rounded-3xl text-sm font-semibold disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                  Pass
                </button>
                <button
                  onClick={onLike}
                  disabled={isPending}
                  className="glass-btn flex h-12 items-center justify-center gap-2 rounded-3xl text-sm font-semibold disabled:opacity-50"
                >
                  {isPending ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
                  ) : (
                    <>
                      <HeartHandshake className="h-4 w-4" />
                      Interested
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        {/* ── Details Blocks ── */}
        <div className="flex flex-col gap-6 mb-6">
          {hobbies.length > 0 && (
            <Section title="Hobbies">
              <div className="flex flex-wrap gap-2 rounded-3xl p-4">
                {hobbies.map((h) => <TagPill key={h} label={h} />)}
              </div>
            </Section>
          )}

          <div className="mt-8 flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {[age, city].filter(Boolean).join(" · ") || "Location not added"}
            {!isOwn && distanceKm != null && ` · ${distanceKm} km away`}
          </span></div>

          <Section title="Education">
            <InfoCard icon={BookOpen} label="Education" value={education || "Not added"} />
          </Section>

          {values && (
            <Section title="Values">
              <div className="rounded-3xl p-4 text-sm text-[#2D2424]">
                {values}
              </div>
            </Section>
          )}

          <Section title="Career">
            <InfoCard icon={Briefcase} label="Career" value={career || "Not added"} />
          </Section>

          {!isOwn && socialLinks.length > 0 && (
            <Section title="Social Media">
              <div className="flex flex-wrap gap-2 rounded-3xl p-4">
                {socialLinks.map((link: { platform: string; url: string }) => {
                  const meta = SOCIAL_META[link.platform] ?? SOCIAL_META.other;
                  const Icon = meta.icon;
                  return (
                    <a
                      key={link.platform}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-[#2D2424] transition-colors"
                    >
                      <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
                      {meta.label}
                    </a>
                  );
                })}
              </div>
            </Section>
          )}

          {compatibilityTags.length > 0 && (
            <Section title="Compatibility">
              <div className="rounded-3xl p-4">
                <div className="flex flex-wrap gap-2">
                  {compatibilityTags.map((tag: string) => (
                    <span key={tag} className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-black">
                      <Sparkles className="h-3 w-3" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </Section>
          )}
        </div>

        {/* ── Report user modal ── */}
        {showReport && targetProfileId && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-[#2D2424]/50 px-4" onClick={() => setShowReport(false)}>
            <div className="w-full max-w-sm rounded-xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
              <Flag className="mx-auto mb-2 h-7 w-7 text-[#7A2432]" />
              <h2 className="text-center text-base font-semibold text-[#2D2424]">Report this user</h2>
              <p className="mb-3 mt-1 text-center text-xs text-[#746767]">
                Your report goes to the safety team. They won’t be notified.
              </p>
              <div className="space-y-1">
                {PROFILE_REPORT_REASONS.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => reportMutation.mutate({ pid: targetProfileId, reason: r.value })}
                    disabled={reportMutation.isPending}
                    className="w-full rounded-lg border border-white/60 bg-white/60 px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50"
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <button onClick={() => setShowReport(false)} className="mt-3 w-full text-sm font-semibold text-[#746767]">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── Incomplete nudge (own only) ── */}
        {isOwn && score < 80 && (
          <button
            onClick={() => router.push("/profile/edit")}
            className="glass-btn flex w-full items-center justify-between rounded-3xl px-4 py-3"
          >
            <div className="text-left">
              <p className="text-sm font-semibold text-black">Complete your profile</p>
              <p className="text-xs text-[#746767]">More details = better matches</p>
            </div>
            <ChevronRight className="h-5 w-5 text-black" />
          </button>
        )}
      </div>
    </main>
  );
}