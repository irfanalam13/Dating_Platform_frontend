"use client";

import { useRouter } from "next/navigation";
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
  ArrowLeft,
  Link,
  Music,
  ExternalLink,
  HeartHandshake,
  X,
} from "lucide-react";
import type { Profile, PublicProfile } from "@/shared/types/profile.types";

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
    <main className="min-h-[100dvh] bg-[#FFF8F1] px-4 py-5">
      <div className="mx-auto max-w-md animate-pulse space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-3 w-20 rounded bg-[#EADDD2]" />
            <div className="h-6 w-36 rounded bg-[#EADDD2]" />
          </div>
          <div className="h-10 w-10 rounded-full bg-[#EADDD2]" />
        </div>
        <div className="overflow-hidden rounded-2xl border border-[#EADDD2] bg-white">
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
                <div key={i} className="h-16 rounded-xl bg-[#EADDD2]" />
              ))}
            </div>
            <div className="h-12 w-full rounded-xl bg-[#EADDD2]" />
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
    "relationship_intent", "education", "career",
    "profile_image", "hobbies", "values",
  ];
  const filled = fields.filter((f) => {
    const val = data[f];
    return val !== null && val !== undefined && val !== "";
  }).length;
  return Math.round((filled / fields.length) * 100);
}

function CompletionBar({ score }: { score: number }) {
  const color = score >= 80 ? "#3F7D63" : score >= 50 ? "#B78A3B" : "#7A2432";
  return (
    <div className="rounded-xl border border-[#EADDD2] bg-white p-4">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-semibold text-[#2D2424]">Profile strength</span>
        <span className="font-bold" style={{ color }}>{score}%</span>
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
    <div className="flex items-start gap-3 rounded-xl border border-[#EADDD2] bg-white p-3">
      <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#FFF8F1]">
        <Icon className="h-4 w-4 text-[#7A2432]" />
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
    <span className="rounded-full border border-[#EADDD2] bg-white px-3 py-1 text-xs font-medium text-[#2D2424]">
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
}: ProfileClientProps) {
  const router = useRouter();

  if (isLoading) return <ProfileSkeleton />;

  // ── Own profile error state ───────────────────────────────────────────────
  if (mode === "own" && !data) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-[#FFF8F1] px-4 text-center">
        <div>
          <p className="text-lg font-semibold text-[#2D2424]">Profile unavailable</p>
          <p className="mt-1 text-sm text-[#746767]">Something went wrong loading your profile.</p>
          <button
            onClick={() => router.refresh()}
            className="mt-4 rounded-lg bg-[#7A2432] px-5 py-2.5 text-sm font-semibold text-white"
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
      <main className="grid min-h-[100dvh] place-items-center bg-[#FFF8F1] px-4 text-center">
        <div>
          <p className="text-lg font-semibold text-[#2D2424]">Profile not found</p>
          <p className="mt-1 text-sm text-[#746767]">This profile may no longer exist.</p>
          <button
            onClick={() => router.back()}
            className="mt-4 rounded-lg bg-[#7A2432] px-5 py-2.5 text-sm font-semibold text-white"
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
    const relationship = isOwn ? data!.relationship_intent : publicData!.relationship_intent;
    const ethnicity    = isOwn ? data!.ethnicity           : publicData!.ethnicity;
    const values       = isOwn ? data!.values              : publicData!.values;
    const religion     = isOwn ? data!.religion_name       : publicData!.religion_name;
    const caste        = isOwn ? data!.caste_name          : publicData!.caste_name;
    const gotra        = isOwn ? data!.gotra_name          : publicData!.gotra_name;
    const gan          = isOwn ? data!.gan                 : publicData!.gan;
    const horoscope    = isOwn ? data!.horoscope           : publicData!.horoscope;
    const isProfilePublic = isOwn ? data!.is_profile_public : publicData!.is_profile_public;
    const isOnline     = false;
    const distanceKm   = null;
    const languages: string[] = [];
    const socialLinks: { platform: string; url: string }[] = [];

    const hobbies: string[] = (() => {
    const raw = isOwn ? data!.hobbies : publicData!.hobbies;
    return raw ? raw.split(",").map((h) => h.trim()).filter(Boolean) : [];
    })();

    // ✅ Fixed — no stray ternary
    const compatibilityTags: string[] = isOwn
    ? ((data as any).compatibility_tags ?? [])
    : [];

    const score = isOwn ? completionScore(data!) : 0;

  return (
    <main className="min-h-[100dvh] bg-[#FFF8F1] pb-10 text-[#2D2424]">
      <div className="mx-auto max-w-md space-y-4 px-4 py-5">

        {/* ── Header ── */}
        <header className="flex items-center justify-between">
          <div>
            {isOwn ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B78A3B]">My profile</p>
                <h1 className="text-2xl font-semibold">Trust profile</h1>
              </>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B78A3B]">Profile</p>
                <h1 className="text-2xl font-semibold">{name || "View profile"}</h1>
              </>
            )}
          </div>

          {isOwn ? (
            <button
              onClick={() => router.push("/settings")}
              className="grid h-10 w-10 place-items-center rounded-full border border-[#EADDD2] bg-white shadow-sm"
            >
              <Settings className="h-5 w-5" />
            </button>
          ) : (
            <button
              onClick={() => router.back()}
              className="grid h-10 w-10 place-items-center rounded-full border border-[#EADDD2] bg-white shadow-sm"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
        </header>

        {/* ── Completion bar (own only) ── */}
        {isOwn && <CompletionBar score={score} />}

        {/* ── Hero card ── */}
        <section className="overflow-hidden rounded-2xl border border-[#EADDD2] bg-white shadow-sm">
          <div className="relative h-80 w-full">
            <img
              src={image}
              alt={name || "Profile"}
              className="h-full w-full object-cover"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

            <div className="absolute bottom-4 left-4 right-4">
              <div className="flex items-end justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold text-white drop-shadow">
                      {name || "Add your name"}
                    </h2>
                    {verified && <BadgeCheck className="h-5 w-5 text-[#3FC88A]" />}
                    {/* Online badge (public only) */}
                    {!isOwn && isOnline && (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-500/25 px-2 py-0.5 text-xs text-emerald-300 backdrop-blur-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        Online
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 flex items-center gap-1 text-sm text-white/80">
                    <MapPin className="h-3.5 w-3.5" />
                    {[age, city].filter(Boolean).join(" · ") || "Location not added"}
                    {!isOwn && distanceKm != null && (
                      <span className="ml-1">· {distanceKm} km away</span>
                    )}
                  </p>
                </div>

                {/* Own: public/private badge */}
                {isOwn && (
                  <div className="flex flex-col items-end gap-1.5">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isProfilePublic ? "bg-[#3F7D63]/90 text-white" : "bg-black/50 text-white"}`}>
                      {isProfilePublic ? (
                        <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> Public</span>
                      ) : (
                        <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Private</span>
                      )}
                    </span>
                    {verified && (
                      <span className="rounded-full bg-[#3FC88A]/90 px-2.5 py-1 text-xs font-semibold text-white">
                        Verified
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className="border-b border-[#EADDD2] p-5">
            <p className="text-sm leading-6 text-[#746767]">
              {bio || (
                <span className="italic text-[#BFBFBF]">
                  {isOwn ? "Add a short, respectful introduction about yourself." : "No bio added."}
                </span>
              )}
            </p>
          </div>

          {/* CTA row */}
          <div className="p-4">
            {isOwn ? (
              <button
                onClick={() => router.push("/profile/edit")}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#7A2432] font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80"
              >
                <PenLine className="h-4 w-4" />
                Edit profile
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={onPass}
                  disabled={isPending}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl border border-[#EADDD2] text-sm font-semibold text-[#746767] disabled:opacity-50 hover:bg-[#F8EFE6] transition-colors"
                >
                  <X className="h-4 w-4" />
                  Pass
                </button>
                <button
                  onClick={onLike}
                  disabled={isPending}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#7A2432] text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
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
            )}
          </div>
        </section>

        {/* ── About ── */}
        <Section title="About">
          <div className="grid grid-cols-2 gap-3">
            <InfoCard icon={Heart}    label="Intent"    value={relationship || "Not added"} />
            <InfoCard icon={Briefcase} label="Career"   value={career       || "Not added"} />
            <InfoCard icon={BookOpen} label="Education" value={education     || "Not added"} />
            {ethnicity && <InfoCard icon={Globe} label="Ethnicity" value={ethnicity} />}
            {languages.length > 0 && (
              <InfoCard icon={Globe} label="Languages" value={languages.join(", ")} />
            )}
          </div>
        </Section>

        {/* ── Values & Hobbies ── */}
        {(values || hobbies.length > 0) && (
          <Section title="Values & Hobbies">
            <div className="rounded-xl border border-[#EADDD2] bg-white p-4 space-y-3">
              {values && (
                <div>
                  <p className="mb-1.5 text-xs text-[#746767]">Values</p>
                  <p className="text-sm text-[#2D2424]">{values}</p>
                </div>
              )}
              {hobbies.length > 0 && (
                <div>
                  <p className="mb-2 text-xs text-[#746767]">Hobbies</p>
                  <div className="flex flex-wrap gap-2">
                    {hobbies.map((h) => <TagPill key={h} label={h} />)}
                  </div>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* ── Compatibility Tags ── */}
        {compatibilityTags.length > 0 && (
          <Section title="Compatibility">
            <div className="rounded-xl border border-[#EADDD2] bg-white p-4">
              <div className="flex flex-wrap gap-2">
                {compatibilityTags.map((tag: string) => (
                  <span key={tag} className="flex items-center gap-1 rounded-full bg-[#FFF0F2] px-3 py-1 text-xs font-medium text-[#7A2432]">
                    <Sparkles className="h-3 w-3" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </Section>
        )}

        {/* ── Cultural (own profile only) ── */}
        {isOwn && (religion || caste || gotra || gan || horoscope) && (
          <Section title="Cultural background">
            <div className="grid grid-cols-2 gap-3">
              {religion  && <InfoCard icon={Star} label="Religion"  value={religion}  />}
              {caste     && <InfoCard icon={Star} label="Caste"     value={caste}     />}
              {gotra     && <InfoCard icon={Star} label="Gotra"     value={gotra}     />}
              {gan       && <InfoCard icon={Star} label="Gan"       value={gan}       />}
              {horoscope && <InfoCard icon={Star} label="Horoscope" value={horoscope} />}
            </div>
          </Section>
        )}

        {/* ── Social Links (public profile only) ── */}
        {!isOwn && socialLinks.length > 0 && (
          <Section title="Social">
            <div className="flex flex-wrap gap-2">
              {socialLinks.map((link: { platform: string; url: string }) => {
                const meta = SOCIAL_META[link.platform] ?? SOCIAL_META.other;
                const Icon = meta.icon;
                return (
                  <a
                    key={link.platform}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-full border border-[#EADDD2] bg-white px-3 py-1.5 text-xs font-medium text-[#2D2424] hover:bg-[#F8EFE6] transition-colors"
                  >
                    <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
                    {meta.label}
                  </a>
                );
              })}
            </div>
          </Section>
        )}

        {/* ── Incomplete nudge (own only) ── */}
        {isOwn && score < 80 && (
          <button
            onClick={() => router.push("/profile/edit")}
            className="flex w-full items-center justify-between rounded-xl border border-dashed border-[#7A2432]/40 bg-[#FFF0F2] px-4 py-3"
          >
            <div className="text-left">
              <p className="text-sm font-semibold text-[#7A2432]">Complete your profile</p>
              <p className="text-xs text-[#746767]">More details = better matches</p>
            </div>
            <ChevronRight className="h-5 w-5 text-[#7A2432]" />
          </button>
        )}
      </div>
    </main>
  );
}
