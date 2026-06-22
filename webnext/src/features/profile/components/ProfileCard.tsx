"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck, MapPin, PenLine, Settings, Eye, Lock,
  Heart, BookOpen, Briefcase, Star, Globe, Sparkles, ChevronRight,
} from "lucide-react";
import { useMyProfile } from "@/features/profile/hooks/useProfile";
import type { Profile } from "@/shared/types/profile.types";
import ProfileImage from "@/shared/components/ProfileImage";

// ─── Skeleton ────────────────────────────────────────────────────────────────
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
        <div className="overflow-hidden rounded-2xl border border-[#EADDD2]">
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

// ─── Completion Bar ───────────────────────────────────────────────────────────
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
  const color = score >= 80 ? "#3F7D63" : score >= 50 ? "#B78A3B" : "#F87171";
  return (
    <div className="rounded-xl border border-[#EADDD2] p-4">
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
    </div>
  );
}


// ─── Info Card ────────────────────────────────────────────────────────────────
function InfoCard({ icon: Icon, label, value }: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  const isEmpty = !value || value === "Not added";
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[#EADDD2] p-3">
      <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg">
        <Icon className="h-4 w-4 text-[#F87171]" />
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

// ─── Tag Pill ─────────────────────────────────────────────────────────────────
function TagPill({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-[#EADDD2] px-3 py-1 text-xs font-medium text-[#2D2424]">
      {label}
    </span>
  );
}

// ─── Section ─────────────────────────────────────────────────────────────────
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
export default function ProfileCard() {
  const router = useRouter();
  const { data, isLoading, isError, refetch, isFetching } = useMyProfile();

  // `isLoading` is only true on the FIRST load with no cached data. Keep showing
  // the skeleton while a manual refetch is in flight so "Try again" gives visible
  // feedback instead of flashing the error screen again.
  if (isLoading || (isFetching && !data)) return <ProfileSkeleton />;

  // Distinguish a genuine fetch failure (network/proxy/cold-start timeout — the
  // request never came back, even if the origin logged a 200) from an empty body.
  // `router.refresh()` only re-renders server components; it does NOT refetch a
  // client React Query, so the old "Try again" was a no-op. Use refetch().
  if (isError || !data) {
    return (
      <main className="grid min-h-[100dvh] place-items-center px-4 text-center">
        <div>
          <p className="text-lg font-semibold text-[#2D2424]">Profile unavailable</p>
          <p className="mt-1 text-sm text-[#746767]">
            {isError
              ? "We couldn't reach the server. This can happen on the first load after a period of inactivity — please try again."
              : "Something went wrong loading your profile."}
          </p>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="glass-btn-rose mt-4 rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
          >
            {isFetching ? "Retrying…" : "Try again"}
          </button>
        </div>
      </main>
    );
  }

  const score = completionScore(data);
  const image = data.profile_image_url || data.profile_image || "/default.png";
  const hobbies = data.hobbies
    ? data.hobbies.split(",").map((h) => h.trim()).filter(Boolean)
    : [];
  const compatibilityTags = (data as { compatibility_tags?: string[] }).compatibility_tags ?? [];

  // Parse preferences → your_hobbies section
  let yourHobbies: { gotra?: string; religion?: string; caste?: string; horoscope?: string; preferences?: string; hobbies?: string } = {};
  if (data.preferences) {
    try {
      const parsed = JSON.parse(data.preferences as string);
      yourHobbies = parsed.your_hobbies ?? {};
    } catch {}
  }
  const hobbyChips = [yourHobbies.gotra, yourHobbies.religion, yourHobbies.caste, yourHobbies.horoscope].filter(Boolean) as string[];
  const hasHobbySection = hobbyChips.length > 0 || yourHobbies.preferences || yourHobbies.hobbies;

  return (
    <main className="min-h-[100dvh] pb-10 text-[#2D2424]">
      <div className="mx-auto max-w-md space-y-4 px-4 py-5">

        {/* ── Header ── */}
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B78A3B]">
              My profile
            </p>
            <h1 className="text-2xl font-semibold">Trust profile</h1>
          </div>
          <button
            onClick={() => router.push("/settings")}
            className="grid h-10 w-10 place-items-center rounded-full border border-[#EADDD2] shadow-sm"
          >
            <Settings className="h-5 w-5" />
          </button>
        </header>

        {/* ── Completion bar ── */}
        <CompletionBar score={score} />

        {/* ── Hero card ── */}
        <section className="overflow-hidden rounded-2xl border border-[#EADDD2] shadow-sm">
          <div className="relative h-80 w-full">
            <ProfileImage
              src={image}
              name={data.full_name}
              alt={data.full_name || "Profile"}
              className="h-full w-full"
              textClassName="text-7xl"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <div className="flex items-end justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold text-white drop-shadow">
                      {data.full_name || "Add your name"}
                    </h2>
                    {data.verified && <BadgeCheck className="h-5 w-5 text-[#3FC88A]" />}
                  </div>
                  <p className="mt-0.5 flex items-center gap-1 text-sm text-white/80">
                    <MapPin className="h-3.5 w-3.5" />
                    {[data.age, data.city].filter(Boolean).join(" · ") || "Location not added"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${data.is_profile_public ? "bg-[#3F7D63]/90 text-white" : "bg-black/50 text-white"}`}>
                    {data.is_profile_public ? (
                      <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> Public</span>
                    ) : (
                      <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Private</span>
                    )}
                  </span>
                  {data.verified && (
                    <span className="rounded-full bg-[#3FC88A]/90 px-2.5 py-1 text-xs font-semibold text-white">
                      Verified
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="border-b border-[#EADDD2] p-5">
            <p className="text-sm leading-6 text-[#746767]">
              {data.bio || (
                <span className="italic text-[#BFBFBF]">
                  Add a bio
                </span>
              )}
            </p>
          </div>

          <div className="p-4">
            <button
              onClick={() => router.push("/profile/edit")}
              className="glass-btn-rose flex h-12 w-full items-center justify-center gap-2 rounded-xl font-semibold transition-opacity"
            >
              <PenLine className="h-4 w-4" />
              Edit profile
            </button>
          </div>
        </section>

        {/* ── About ── */}
        <Section title="About">
          <div className="grid grid-cols-2 gap-3">
            <InfoCard icon={Briefcase} label="Career" value={data.career || "Not added"} />
            <InfoCard icon={BookOpen} label="Education" value={data.education || "Not added"} />
            <InfoCard icon={Globe} label="Ethnicity" value={data.ethnicity || "Not added"} />
          </div>
        </Section>

        {/* ── Values & Hobbies ── */}
        {(data.values || hobbies.length > 0) && (
          <Section title="Values & Hobbies">
            <div className="rounded-xl border border-[#EADDD2] p-4 space-y-3">
              {data.values && (
                <div>
                  <p className="mb-1.5 text-xs text-[#746767]">Values</p>
                  <p className="text-sm text-[#2D2424]">{data.values}</p>
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

        {/* ── Your Hobbies (from preferences) ── */}
        {hasHobbySection && (
          <Section title="My Interests">
            <div className="rounded-xl border border-[#EADDD2] p-4 space-y-3">
              {hobbyChips.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {hobbyChips.map((chip) => (
                    <TagPill key={chip} label={chip} />
                  ))}
                </div>
              )}
              {yourHobbies.hobbies && (
                <div>
                  <p className="mb-1.5 text-xs text-[#746767]">Hobbies</p>
                  <p className="text-sm text-[#2D2424]">{yourHobbies.hobbies}</p>
                </div>
              )}
              {yourHobbies.preferences && (
                <div>
                  <p className="mb-1.5 text-xs text-[#746767]">Preferences</p>
                  <p className="text-sm text-[#2D2424]">{yourHobbies.preferences}</p>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* ── Compatibility Tags ── */}
        {compatibilityTags.length > 0 && (
          <Section title="Compatibility">
            <div className="rounded-xl border border-[#EADDD2] p-4">
              <div className="flex flex-wrap gap-2">
                {compatibilityTags.map((tag: string) => (
                  <span key={tag} className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-[#F87171]">
                    <Sparkles className="h-3 w-3" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </Section>
        )}

        {/* ── Cultural ── */}
        {(data.religion_name || data.caste_name || data.gotra_name || data.horoscope) && (
          <Section title="Cultural background">
            <div className="grid grid-cols-2 gap-3">
              {data.religion_name && <InfoCard icon={Star} label="Religion" value={data.religion_name} />}
              {data.caste_name && <InfoCard icon={Star} label="Caste" value={data.caste_name} />}
              {data.gotra_name && <InfoCard icon={Star} label="Gotra" value={data.gotra_name} />}

              {data.horoscope && <InfoCard icon={Star} label="Horoscope" value={data.horoscope} />}
            </div>
          </Section>
        )}
      </div>
    </main>
  );
}