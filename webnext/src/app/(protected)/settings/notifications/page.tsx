"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import {
  getNotificationPreferences, updateNotificationPreferences,
  type NotificationPreferences,
} from "@/shared/api/notification.api";

type Key = keyof NotificationPreferences;

const ROWS: { label: string; keys: { label: string; key: Key }[] }[] = [
  { label: "Matches", keys: [
    { label: "In-app", key: "match_inapp" }, { label: "Push", key: "match_push" }, { label: "Email", key: "match_email" },
  ]},
  { label: "Messages", keys: [
    { label: "In-app", key: "message_inapp" }, { label: "Push", key: "message_push" }, { label: "Email", key: "message_email" },
  ]},
  { label: "Follows", keys: [
    { label: "In-app", key: "follow_inapp" }, { label: "Push", key: "follow_push" }, { label: "Email", key: "follow_email" },
  ]},
  { label: "Marketing", keys: [
    { label: "Push", key: "marketing_push" }, { label: "Email", key: "marketing_email" },
  ]},
];

export default function NotificationSettingsPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const { data: prefs, isLoading } = useQuery({
    queryKey: ["notif-prefs"], queryFn: getNotificationPreferences, retry: false,
  });

  const mutation = useMutation({
    mutationFn: (patch: Partial<NotificationPreferences>) => updateNotificationPreferences(patch),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: ["notif-prefs"] });
      const prev = qc.getQueryData<NotificationPreferences>(["notif-prefs"]);
      if (prev) qc.setQueryData(["notif-prefs"], { ...prev, ...patch });
      return { prev };
    },
    onError: (_e, _patch, ctx) => { if (ctx?.prev) qc.setQueryData(["notif-prefs"], ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: ["notif-prefs"] }),
  });

  return (
    <main className="min-h-[100dvh] px-4 py-5 text-[#2D2424]">
      <div className="mx-auto max-w-md">
        <header className="mb-5 flex items-center gap-3">
          <button onClick={() => router.back()} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/80 bg-white/85 text-[#1a1a2e] shadow-[0_4px_12px_rgba(16,24,40,0.08)]" aria-label="Back">
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>
          <h1 className="text-xl font-semibold">Notification preferences</h1>
        </header>

        {isLoading && <p className="text-sm text-[#746767]">Loading…</p>}

        {prefs && (
          <>
            <section className="mb-4 rounded-3xl border border-white/60 bg-white/40 p-4 backdrop-blur-md">
              <Toggle
                label="Email notifications (master switch)"
                checked={prefs.email_enabled}
                onChange={(v) => mutation.mutate({ email_enabled: v })}
              />
              <p className="mt-1 text-xs text-[#746767]">Safety & account alerts are always delivered.</p>
            </section>

            {ROWS.map((row) => (
              <section key={row.label} className="mb-3 rounded-3xl border border-white/60 bg-white/40 p-4 backdrop-blur-md">
                <h2 className="mb-2 font-semibold">{row.label}</h2>
                <div className="divide-y divide-[#EADDD2]/70">
                  {row.keys.map((k) => (
                    <Toggle
                      key={k.key}
                      label={k.label}
                      checked={!!prefs[k.key]}
                      onChange={(v) => mutation.mutate({ [k.key]: v } as Partial<NotificationPreferences>)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </>
        )}
      </div>
    </main>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-3 text-sm font-medium">
      <span>{label}</span>
      <button
        type="button" role="switch" aria-checked={checked} aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-[52px] shrink-0 items-center rounded-full transition-colors ${checked ? "bg-[#5FD08A]" : "bg-[#E5E5EA]"}`}
      >
        <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-[24px]" : "translate-x-[2px]"}`} />
      </button>
    </div>
  );
}
