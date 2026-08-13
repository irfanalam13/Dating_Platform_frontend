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
  BookOpen,
  Briefcase,
  Sparkles,
  HeartHandshake,
  MoreVertical,
  Ban,
  Flag,
  MessageCircle,
  Check,
  ArrowLeft,
  X,
  UserX,
} from "lucide-react";
import ProfileImage from "@/shared/components/ProfileImage";
import { blockProfile, reportProfile, type ReportReasonValue } from "@/shared/api/mvp.api";
import { showSuccess, showError } from "@/shared/utils/toast";
import type { ProfileClientProps } from "./profile-client/types";
import { getReligionRules } from "@/shared/constants/religionRules";
import {
  CompletionBar,
  InfoCard,
  ProfileSkeleton,
  ReportModal,
  Section,
  SOCIAL_META,
  TagPill,
  completionScore,
} from "./profile-client/parts";
// FUTURE FEATURE: FOLLOWERS / FOLLOWING (disabled). Re-enable this import
// together with the <FollowButton> usages and the "Followers & Following"
// button further down in this file.
// import FollowButton from "@/features/follow/components/FollowButton";

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
  onRemoveMatch,
  isRemoving,
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
    mutationFn: (vars: { pid: number; reason: ReportReasonValue }) =>
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
            onClick={() => router.push("/home")}
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
    // const gan          = isOwn ? data!.gan                 : publicData!.gan;
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
    const industry     = isOwn ? data!.industry             : publicData!.industry;
    const familyType   = isOwn ? data!.family_type          : publicData!.family_type;
    const isProfilePublic = isOwn ? data!.is_profile_public : publicData!.is_profile_public;
    // Someone else viewing a private account → blur the photo (privacy = blur).
    const blurPhoto    = !isOwn && !isProfilePublic;
    const isOnline     = false;
    const distanceKm   = null;
    const languages: string[] = (isOwn ? data!.languages_spoken : publicData!.languages_spoken) ?? [];
    const socialLinks: { platform: string; url: string }[] = [];

    // Build a label/value list of details, dropping anything empty/hidden.
    // The age is shown here next to the DOB, e.g. "Jan 1, 2000 (25)".
    const dobLabel = dob ? new Date(dob).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "";
    const dobWithAge = dobLabel && age ? `${dobLabel} (${age})` : dobLabel;
    const detailItems: { label: string; value: string }[] = [
      { label: "Date of birth", value: dobWithAge },
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
      { label: "Industry", value: industry || "" },
      { label: "Family type", value: familyType || "" },
    ].filter((d) => d.value && d.value.trim() !== "");

    const hobbies: string[] = (() => {
    const raw = isOwn ? data!.hobbies : publicData!.hobbies;
    return raw ? raw.split(",").map((h) => h.trim()).filter(Boolean) : [];
    })();

    //   Fixed — no stray ternary
    const compatibilityTags: string[] = isOwn
    ? ((data as { compatibility_tags?: string[] }).compatibility_tags ?? [])
    : [];

    const score = isOwn ? completionScore(data!) : 0;

  return (
    <main className="min-h-[100dvh] pb-10 text-[#2D2424]">
      <div className="mx-auto max-w-md space-y-4 px-4 py-5">

        {/* ── Header ── */}
        {isOwn ? (
          <header className="flex items-center gap-4">
            <button
              onClick={() => router.push("/home")}
              aria-label="Go back"
              className="glass-btn grid h-10 w-10 shrink-0 place-items-center rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="min-w-0 flex-1 truncate text-2xl font-semibold">
              {data?.full_name || "My Profile"}
            </h1>
            <button
              onClick={() => router.push("/settings")}
              aria-label="Settings"
              className="glass-btn grid h-10 w-10 shrink-0 place-items-center rounded-full"
            >
              <Settings className="h-5 w-5" />
            </button>
          </header>
        ) : (
          <header className="relative">
            <button
              onClick={() => router.push("/home")}
              aria-label="Go back"
              className="glass-btn mb-3 grid h-10 w-10 place-items-center rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B78A3B]">Profile</p>
              <h1 className="text-3xl font-semibold">{name || "View profile"}</h1>
            </div>

            <div className="absolute right-0 top-0 h-4 flex items-center">
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
                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-black/5 text-sm">
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
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[#F87171] hover:bg-gray-50 disabled:opacity-40"
                      >
                        <Ban className="h-4 w-4" /> Block user
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </header>
        )}

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
            {(() => {
              const rules = getReligionRules(religion, community);
              return (
                <div className="flex flex-col gap-0.5 mt-3 text-xs text-[#746767]">
                  <p><span className="font-semibold text-[#2D2424]">Religion:</span> {religion || <span className="italic text-[#BFBFBF]">Not added</span>}</p>
                  <p><span className="font-semibold text-[#2D2424]">Community / Ethnicity:</span> {ethnicity || community || <span className="italic text-[#BFBFBF]">Not added</span>}</p>
                  {rules.levels.includes("caste_v2") && (
                    <p><span className="font-semibold text-[#2D2424]">Caste:</span> {caste || <span className="italic text-[#BFBFBF]">Not added</span>}</p>
                  )}
                  {subCaste && rules.levels.includes("sub_caste") && (
                    <p><span className="font-semibold text-[#2D2424]">Sub-caste:</span> {subCaste}</p>
                  )}
                  {clan && rules.levels.includes("clan") && (
                    <p><span className="font-semibold text-[#2D2424]">Clan:</span> {clan}</p>
                  )}
                  {rules.levels.includes("gotra_v2") && (
                    <p><span className="font-semibold text-[#2D2424]">Gotra:</span> {gotra || <span className="italic text-[#BFBFBF]">Not added</span>}</p>
                  )}
                  {rules.showHoroscope && (
                    <p><span className="font-semibold text-[#2D2424]">Horoscope:</span> {horoscope || <span className="italic text-[#BFBFBF]">Not added</span>}</p>
                  )}
                </div>
              );
            })()}
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
              {/* ───── FUTURE FEATURE: FOLLOWERS / FOLLOWING (disabled) ─────
                  To re-enable, uncomment this button.
              <button
                onClick={() => router.push("/connections")}
                className="glass-btn flex h-12 w-full items-center justify-center gap-2 rounded-3xl font-semibold transition-opacity active:opacity-80"
              >
                <HeartHandshake className="h-4 w-4" />
                Followers &amp; Following
              </button>
              ──────────────────────────────────────────────────────────── */}
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
              {onRemoveMatch && (
                <button
                  onClick={() => {
                    if (window.confirm(`Remove your match with ${name || "this person"}?`)) {
                      onRemoveMatch();
                    }
                  }}
                  disabled={isRemoving}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-3xl border border-[#EADDD2] text-sm font-semibold text-[#F87171] disabled:opacity-50"
                >
                  {isRemoving ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <><UserX className="h-4 w-4" /> Remove match</>
                  )}
                </button>
              )}
              {/* FUTURE FEATURE: FOLLOW (disabled) — re-enable with the import at top.
              {publicData?.user && <FollowButton userId={publicData.user} className="w-full" />}
              */}
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
              {/* FUTURE FEATURE: FOLLOW (disabled) — re-enable with the import at top.
              {publicData?.user && <FollowButton userId={publicData.user} className="w-full" />}
              */}
            </>
          ) : (
            <>
              {/* FUTURE FEATURE: FOLLOW (disabled) — re-enable with the import at top.
              {publicData?.user && (
                <FollowButton userId={publicData.user} className="w-full" />
              )}
              */}
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
            {city || "Location not added"}
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
          {isOwn && (
            <button
                onClick={() => router.push("/profile/edit")}
                className="glass-btn flex h-12 w-full items-center justify-center gap-2 rounded-3xl font-semibold transition-opacity active:opacity-80"
              >
                <PenLine className="h-4 w-4" />
                Edit profile
            </button>
          )}

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
          <ReportModal
            onClose={() => setShowReport(false)}
            onSelect={(reason) => reportMutation.mutate({ pid: targetProfileId, reason })}
            isPending={reportMutation.isPending}
          />
        )}

      </div>
    </main>
  );
}