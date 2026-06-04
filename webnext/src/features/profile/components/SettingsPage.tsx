"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Bell, GraduationCap, Lock, LogOut, SlidersHorizontal, UserRound, type LucideIcon } from "lucide-react";
import {
  getBlockedUsers,
  getPrivacySettings,
  unblockProfile,
  updatePrivacySettings,
} from "@/shared/api/mvp.api";
import { useLogout } from "@/features/auth/hooks/useAuth";

export default function SettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const logout = useLogout();

  const { data: privacy } = useQuery({ queryKey: ["privacy"], queryFn: getPrivacySettings, retry: false });
  const { data: blocked = [] } = useQuery({ queryKey: ["blockedUsers"], queryFn: getBlockedUsers, retry: false });

  const privacyMutation = useMutation({
    mutationFn: updatePrivacySettings,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["privacy"] }),
  });

  const unblockMutation = useMutation({
    mutationFn: unblockProfile,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["blockedUsers"] }),
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
              <p className="text-sm text-[#746767]">Control privacy, preferences, and safety.</p>
            </div>
          </div>
        </header>

        <section className="mb-4 rounded-3xl border border-white/60 bg-white/40 p-4 shadow-[0_10px_30px_rgba(16,24,40,0.08)] backdrop-blur-md">
          <SectionTitle icon={Lock} title="Account privacy" detail="MVP privacy works with your Django privacy app." />
          <div className="overflow-hidden rounded-2xl">
            <div className="divide-y divide-[#EADDD2]/70">
              <Toggle
                label="Private account"
                checked={!(privacy?.is_profile_public ?? true)}
                onChange={(value) => privacyMutation.mutate({ is_profile_public: !value, allow_messages_from: "matches" })}
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
          <div className="mt-3 text-sm text-[#746767]">
            Messages are locked to mutual matches for MVP safety.
          </div>
        </section>

        <section className="mb-4 rounded-3xl border border-white/60 bg-white/40 p-4 shadow-[0_10px_30px_rgba(16,24,40,0.08)] backdrop-blur-md">
          <SectionTitle icon={SlidersHorizontal} title="Match preferences" detail="Basic filters are powered by preference APIs." />
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
          <SectionTitle icon={UserRound} title="Blocked contacts" detail="People you block are hidden from discover and chat." />
          {blocked.length === 0 && <p className="mt-3 text-sm text-[#746767]">No blocked users.</p>}
          <div className="mt-1 divide-y divide-[#EADDD2]/70">
            {blocked.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-3">
                <span className="text-sm">{item.blocked_email}</span>
                <button
                  onClick={() => unblockMutation.mutate(item.blocked_profile_id)}
                  className="text-sm font-semibold text-[#7A2432]"
                >
                  Unblock
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-4 rounded-3xl border border-white/60 bg-white/40 p-2 shadow-[0_10px_30px_rgba(16,24,40,0.08)] backdrop-blur-md">
          <div className="grid grid-cols-2 divide-x divide-[#EADDD2]/70">
            <button onClick={() => router.push("/college")} className="rounded-2xl p-4 text-left transition hover:bg-white/30">
              <GraduationCap className="mb-3 h-5 w-5 text-[#2D2424]" />
              <span className="block font-semibold">College Mode</span>
              <span className="block text-xs text-[#746767]">Student verification</span>
            </button>
            <button className="rounded-2xl p-4 text-left transition hover:bg-white/30">
              <Bell className="mb-3 h-5 w-5 text-[#2D2424]" />
              <span className="block font-semibold">Subscription</span>
              <span className="block text-xs text-[#746767]">Minimal MVP emphasis</span>
            </button>
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