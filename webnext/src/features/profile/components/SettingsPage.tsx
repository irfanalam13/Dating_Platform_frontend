"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
// NOTE: `GraduationCap` and `Users` icons were removed from this import because
// the College Mode / Subscription / Followers links below are temporarily
// disabled (see "FUTURE FEATURE" blocks). Re-add them to this import when you
// uncomment those sections.
import { Bell, Lock, LogOut, SlidersHorizontal, UserRound, MessageCircle, ShieldCheck, Sparkles, GraduationCap, Crown, type LucideIcon } from "lucide-react";
import {
  getBlockedUsers,
  getPrivacySettings,
  updatePrivacySettings,
} from "@/shared/api/mvp.api";
import { getChatPrivacy, updateChatPrivacy, type ChatPrivacy } from "@/shared/api/chat.api";
import { useLogout } from "@/features/auth/hooks/useAuth";

export default function SettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const logout = useLogout();

  const { data: privacy } = useQuery({ queryKey: ["privacy"], queryFn: getPrivacySettings, retry: false });
  const { data: blocked = [] } = useQuery({ queryKey: ["blockedUsers"], queryFn: getBlockedUsers, retry: false });

  const privacyMutation = useMutation({
    mutationFn: updatePrivacySettings,
    onSuccess: () => {
      // Also refresh the profile so its public/private badge + hidden fields
      // reflect the change immediately (not just the Settings toggles).
      queryClient.invalidateQueries({ queryKey: ["privacy"] });
      queryClient.invalidateQueries({ queryKey: ["myProfile"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  const { data: chatPrivacy } = useQuery({ queryKey: ["chatPrivacy"], queryFn: getChatPrivacy, retry: false });
  const chatPrivacyMutation = useMutation({
    mutationFn: (patch: Partial<ChatPrivacy>) => updateChatPrivacy(patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chatPrivacy"] }),
  });

  return (
    <main className="min-h-[100dvh] px-4 py-5 text-[#2D2424]">
      <div className="mx-auto max-w-md">
        <header className="mb-5 rounded-full border border-white/55 bg-white/55 px-4 py-3 shadow-[0_8px_24px_rgba(16,24,40,0.10)] backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Go back"
              className="glass-btn grid h-10 w-10 shrink-0 place-items-center rounded-full"
            >
              <span className="text-lg leading-none">←</span>
            </button>
            <div>
              <h1 className="text-2xl font-semibold">Settings</h1>
              <p className="text-sm text-[#746767]">Privacy, Preferences, & Safety</p>
            </div>
          </div>
        </header>

        <section className="mb-4 rounded-3xl border border-white/60 bg-white/40 p-4 shadow-[0_10px_30px_rgba(16,24,40,0.08)] backdrop-blur-md">
          <SectionTitle icon={Lock} title="Account privacy" />
          <div className="overflow-hidden rounded-2xl">
            <div className="divide-y divide-[#EADDD2]/70">
              <Toggle
                label="Private account"
                checked={!(privacy?.is_profile_public ?? true)}
                onChange={(value) => privacyMutation.mutate({ is_profile_public: !value })}
              />
              <Toggle
                label="Show profile image"
                checked={privacy?.show_profile_image ?? true}
                onChange={(value) => privacyMutation.mutate({ show_profile_image: value })}
              />
              <Toggle
                label="Show location"
                checked={privacy?.show_location ?? true}
                onChange={(value) => privacyMutation.mutate({ show_location: value })}
              />
            </div>
          </div>
        </section>

        <section className="mb-4 rounded-3xl border border-white/60 bg-white/40 p-4 shadow-[0_10px_30px_rgba(16,24,40,0.08)] backdrop-blur-md">
          <SectionTitle icon={SlidersHorizontal} title="Your preferences" />
          <div className="mt-2 h-px w-full bg-[#EADDD2]/70" />
          <button
            onClick={() => router.push("/preferences")}
            className="flex h-11 w-full items-center justify-between pt-1 text-sm font-semibold text-[#2D2424]"
          >
            Update preferences
            <span className="text-[#746767]">→</span>
          </button>
        </section>

        <section className="mb-4 rounded-3xl border border-white/60 bg-white/40 p-4 shadow-[0_10px_30px_rgba(16,24,40,0.08)] backdrop-blur-md">
          <SectionTitle icon={UserRound} title="Blocked contacts" />
          <div className="mt-2 h-px w-full bg-[#EADDD2]/70" />
          <button
            onClick={() => router.push("/settings/blocked")}
            className="flex h-11 w-full items-center justify-between pt-1 text-sm font-semibold text-[#2D2424]"
          >
            {blocked.length > 0 ? `View blocked list (${blocked.length})` : "View blocked list"}
            <span className="text-[#746767]">→</span>
          </button>
        </section>

        {/* Profile field visibility (Facebook-style hide) */}
        <section className="mb-4 rounded-3xl border border-white/60 bg-white/40 p-4 shadow-[0_10px_30px_rgba(16,24,40,0.08)] backdrop-blur-md">
          <SectionTitle icon={Lock} title="Profile visibility options" />
          <div className="divide-y divide-[#EADDD2]/70">
            <Toggle label="Show date of birth" checked={privacy?.show_dob ?? false}
              onChange={(v) => privacyMutation.mutate({ show_dob: v })} />
            <Toggle label="Show age" checked={privacy?.show_age ?? true}
              onChange={(v) => privacyMutation.mutate({ show_age: v })} />
            <Toggle label="Show location" checked={privacy?.show_location ?? true}
              onChange={(v) => privacyMutation.mutate({ show_location: v })} />
            <Toggle label="Show height" checked={privacy?.show_height ?? true}
              onChange={(v) => privacyMutation.mutate({ show_height: v })} />
            <Toggle label="Show weight" checked={privacy?.show_weight ?? false}
              onChange={(v) => privacyMutation.mutate({ show_weight: v })} />
            <Toggle label="Show languages" checked={privacy?.show_languages ?? true}
              onChange={(v) => privacyMutation.mutate({ show_languages: v })} />
            <Toggle label="Show education" checked={privacy?.show_education ?? true}
              onChange={(v) => privacyMutation.mutate({ show_education: v })} />
            <Toggle label="Show career" checked={privacy?.show_career ?? true}
              onChange={(v) => privacyMutation.mutate({ show_career: v })} />
            <Toggle label="Show religion & caste" checked={privacy?.show_religion ?? true}
              onChange={(v) => privacyMutation.mutate({ show_religion: v })} />
          </div>
        </section>

        {/* Chat privacy */}
        <section className="mb-4 rounded-3xl border border-white/60 bg-white/40 p-4 shadow-[0_10px_30px_rgba(16,24,40,0.08)] backdrop-blur-md">
          <SectionTitle icon={MessageCircle} title="Chat privacy" />
          <div className="space-y-3">
            <Select
              label="Who can message me"
              value={chatPrivacy?.allow_messages_from ?? "everyone"}
              options={[["everyone", "Everyone"], ["matches", "Matches only"], ["none", "Nobody"]]}
              onChange={(v) => chatPrivacyMutation.mutate({ allow_messages_from: v })}
            />
            <Select
              label="Who can send me images"
              value={chatPrivacy?.who_can_send_images ?? "everyone"}
              options={[["everyone", "Everyone"], ["matches", "Matches only"], ["none", "Nobody"]]}
              onChange={(v) => chatPrivacyMutation.mutate({ who_can_send_images: v })}
            />
            <Select
              label="Who can see my last seen"
              value={chatPrivacy?.last_seen_visibility ?? "everyone"}
              options={[["everyone", "Everyone"], ["matches", "Matches only"], ["nobody", "Nobody"]]}
              onChange={(v) => chatPrivacyMutation.mutate({ last_seen_visibility: v })}
            />
            <Select
              label="Who can see my online status"
              value={chatPrivacy?.online_status_visibility ?? "everyone"}
              options={[["everyone", "Everyone"], ["matches", "Matches only"], ["nobody", "Nobody"]]}
              onChange={(v) => chatPrivacyMutation.mutate({ online_status_visibility: v })}
            />
          </div>
          <div className="mt-1 divide-y divide-[#EADDD2]/70">
            <Toggle
              label="Read receipts"
              checked={chatPrivacy?.read_receipts_enabled ?? true}
              onChange={(value) => chatPrivacyMutation.mutate({ read_receipts_enabled: value })}
            />
          </div>
        </section>

        {/* Account quick links */}
        <section className="mb-4 rounded-3xl border border-white/60 bg-white/40 p-2 shadow-[0_10px_30px_rgba(16,24,40,0.08)] backdrop-blur-md">
          <div className="divide-y divide-[#EADDD2]/70">
            <LinkRow icon={Bell} label="Notification preferences" onClick={() => router.push("/settings/notifications")} />
            <LinkRow icon={ShieldCheck} label="Verification" onClick={() => router.push("/settings/verification")} />
            {/* ───── FUTURE FEATURE: FOLLOWERS / FOLLOWING (disabled) ─────
                To re-enable: uncomment the line below and re-add `Users` to the
                lucide-react import at the top of this file.
            <LinkRow icon={Users} label="Followers & Following" onClick={() => router.push("/connections")} />
            ──────────────────────────────────────────────────────────── */}
          </div>
        </section>

        {/* Upcoming features — preview of what's coming next (not yet live) */}
        <section className="mb-4 rounded-3xl border border-white/60 bg-white/40 p-4 shadow-[0_10px_30px_rgba(16,24,40,0.08)] backdrop-blur-md">
          <SectionTitle icon={Sparkles} title="Upcoming features" />
          <div className="overflow-hidden rounded-2xl">
            <div className="divide-y divide-[#EADDD2]/70">
              <UpcomingRow icon={GraduationCap} label="College Mode" detail="Exclusively for college students." />
              <UpcomingRow icon={MessageCircle} label="AI companion" detail="Your personal AI partner to chat with." />
              <UpcomingRow icon={Crown} label="Exclusive Premium features" detail="Super options to enhance your experience." />
            </div>
          </div>
        </section>

        <section className="mb-8">
          <button
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-red-200 text-sm font-semibold text-[#ff3e3e] disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" />
            {logout.isPending ? "Logging out..." : "Log out"}
          </button>
        </section>
      </div>
    </main>
  );
}

function SectionTitle({ icon: Icon, title, detail }: { icon: LucideIcon; title: string; detail: string }) {
  return (
    <div className="mb-3 flex gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#2D2424]">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="text-sm leading-6 text-[#746767]">{detail}</p>
      </div>
    </div>
  );
}

function Select({ label, value, options, onChange }: {
  label: string; value: string; options: [string, string][]; onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm font-medium">
      <span>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-white/60 bg-white/70 px-2 py-1.5 text-sm text-[#2D2424] focus:outline-none"
      >
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}

function LinkRow({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 px-2 py-3 text-left text-sm font-semibold text-[#2D2424] transition hover:bg-white/30">
      <Icon className="h-5 w-5" />
      <span className="flex-1">{label}</span>
      <span className="text-[#746767]">→</span>
    </button>
  );
}

function UpcomingRow({ icon: Icon, label, detail }: { icon: LucideIcon; label: string; detail: string }) {
  return (
    <div className="flex items-center gap-3 py-3 text-sm">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/50 text-[#2D2424]">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <span className="block font-semibold text-[#2D2424]">{label}</span>
        <span className="block text-xs leading-5 text-[#746767]">{detail}</span>
      </div>
      <span className="shrink-0 rounded-full border border-[#B78A3B]/40 bg-[#B78A3B]/10 px-2.5 py-1 text-[11px] font-semibold text-[#B78A3B]">
        Soon
      </span>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-3 text-sm font-medium">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-[52px] shrink-0 items-center rounded-full transition-colors duration-300 ease-out ${
          checked ? "bg-[#5FD08A]" : "bg-[#E5E5EA]"
        }`}
      >
        <span
          className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-[0_2px_4px_rgba(16,24,40,0.25)] transition-transform duration-300 ease-out ${
            checked ? "translate-x-[24px]" : "translate-x-[2px]"
          }`}
        />
      </button>
    </div>
  );
}