"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, ShieldCheck, Check } from "lucide-react";
import { updateProfile } from "@/shared/api/profile.api";
import { useAuthStore } from "@/features/auth/store/auth.store";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [privacy, setPrivacy] = useState("true");
  const [saving, setSaving] = useState(false);

  const user = useAuthStore((s) => s.user);
  const firstName = (user?.full_name ?? "").trim().split(/\s+/)[0] ?? "";
  // Captured once on mount via a lazy initializer so the time-of-day read
  // stays out of render (no impure call during render).
  const [greeting] = useState(() => {
    const hour = new Date().getHours();
    return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  });

  const finish = async () => {
    setSaving(true);
    const data = new FormData();
    data.append("is_profile_public", privacy);
    await updateProfile(data);
    router.push("/profile/edit");
  };

  return (
    <main className="min-h-[100dvh] px-4 py-6 text-[#2D2424]">
      <div className="mx-auto flex min-h-[calc(100dvh-48px)] max-w-md flex-col">
        <div className="mb-8 grid grid-cols-2 gap-2">
          {[0, 1].map((item) => (
            <div key={item} className={`h-1.5 rounded-full ${item <= step ? "bg-[#5FD08A]" : "bg-[#EADDD2]"}`} />
          ))}
        </div>

        <motion.section key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-1 flex-col justify-center">
          {step === 0 && (
            <div className="text-center">
              <h1 className="text-3xl font-semibold leading-tight">
                {greeting}{firstName ? `, ${firstName}` : ""}
              </h1>
              <p className="mt-3 text-sm leading-6 text-[#746767]">Account registered. Ready to set up your profile?</p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <Lock className="h-10 w-10 text-[#000000]" />
              <h1 className="text-2xl font-semibold">Choose your account privacy</h1>
              <div className="space-y-3 pt-1">
                {[
                  { value: "true", label: "Public profile", Icon: ShieldCheck },
                  { value: "false", label: "Private profile", Icon: Lock },
                ].map(({ value, label, Icon }) => {
                  const selected = privacy === value;
                  return (
                    <motion.button
                      key={value}
                      type="button"
                      onClick={() => setPrivacy(value)}
                      aria-pressed={selected}
                      whileTap={{ scale: 0.97 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className="glass-card relative flex w-full items-center gap-3 overflow-hidden rounded-2xl px-4 py-4 text-left"
                    >
                      {/* Liquid selection highlight — glides between options via shared layout */}
                      {selected && (
                        <motion.span
                          layoutId="privacy-selection"
                          transition={{ type: "spring", stiffness: 420, damping: 34 }}
                          className="absolute inset-0 rounded-2xl bg-white/35 shadow-[inset_0_0_0_2px_rgba(45,36,36,0.4)]"
                        />
                      )}
                      <span className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors duration-300 ${selected ? "bg-[#2D2424] text-white" : "bg-white/60 text-[#2D2424]"}`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="relative min-w-0 flex-1">
                        <span className="block font-semibold text-[#2D2424]">{label}</span>
                      </span>
                      <span className="relative grid h-6 w-6 shrink-0 place-items-center">
                        <motion.span
                          initial={false}
                          animate={{ scale: selected ? 1 : 0, opacity: selected ? 1 : 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 28 }}
                          className="grid h-6 w-6 place-items-center rounded-full bg-[#5FD08A] text-white"
                        >
                          <Check className="h-4 w-4" />
                        </motion.span>
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}
        </motion.section>

        <div className="grid grid-cols-2 gap-3">
          <button disabled={step === 0} onClick={() => setStep((value) => value - 1)} className="glass-btn h-12 rounded-full font-semibold disabled:opacity-40">
            Back
          </button>
          {step < 1 ? (
            <button onClick={() => setStep((value) => value + 1)} className="glass-btn h-12 rounded-full font-semibold">
              Continue
            </button>
          ) : (
            <button onClick={finish} disabled={saving} className="glass-btn h-12 rounded-full font-semibold disabled:opacity-60">
              {saving ? "Saving..." : "Start setup"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
