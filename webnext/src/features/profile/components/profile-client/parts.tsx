import { ExternalLink, Flag, Link, Music } from "lucide-react";
import type { Profile } from "@/shared/types/profile.types";
import type { ReportReasonValue } from "@/shared/api/mvp.api";

// Values MUST match the backend ReportReason choices
// (dating_backend/django/apps/report/models.py). Mismatched values 400.
export const PROFILE_REPORT_REASONS: { value: ReportReasonValue; label: string }[] = [
  { value: "harassment", label: "Harassment / Abuse" },
  { value: "fake_identity", label: "Fake profile" },
  { value: "sexual_content", label: "Sexual content" },
  { value: "scam", label: "Scam" },
  { value: "spam", label: "Spam" },
  { value: "other", label: "Other" },
];

// ─── Social link meta ─────────────────────────────────────────────────────────
export const SOCIAL_META: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  instagram: { icon: Link,         color: "text-pink-500",    label: "Instagram" },
  linkedin:  { icon: Link,         color: "text-blue-600",    label: "LinkedIn"  },
  twitter:   { icon: Link,         color: "text-sky-500",     label: "Twitter"   },
  spotify:   { icon: Music,        color: "text-green-500",   label: "Spotify"   },
  tiktok:    { icon: Music,        color: "text-neutral-800", label: "TikTok"    },
  other:     { icon: ExternalLink, color: "text-gray-500",    label: "Link"      },
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
export function ProfileSkeleton() {
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
export function completionScore(data: Profile): number {
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

export function CompletionBar({ score }: { score: number }) {
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
    </div>
  );
}

// ─── Info Card ────────────────────────────────────────────────────────────────
export function InfoCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
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

export function TagPill({ label }: { label: string }) {
  return (
    <span className="rounded-full px-3 py-1 text-xs font-medium text-[#2D2424]">
      {label}
    </span>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-[#B78A3B]">
        {title}
      </h3>
      {children}
    </section>
  );
}

// ─── Report user modal ────────────────────────────────────────────────────────
export function ReportModal({
  onClose,
  onSelect,
  isPending,
}: {
  onClose: () => void;
  onSelect: (reason: ReportReasonValue) => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#2D2424]/50 px-4" onClick={onClose}>
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
              onClick={() => onSelect(r.value)}
              disabled={isPending}
              className="w-full rounded-lg border border-white/60 bg-white/60 px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              {r.label}
            </button>
          ))}
        </div>
        <button onClick={onClose} className="mt-3 w-full text-sm font-semibold text-[#746767]">
          Cancel
        </button>
      </div>
    </div>
  );
}
