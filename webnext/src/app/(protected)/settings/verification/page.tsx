"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BadgeCheck, Mail, Phone, CreditCard, ScanFace, Crown } from "lucide-react";
import {
  getVerificationStatus, requestPhoneOtp, verifyPhoneOtp, submitVerification,
  type VerificationBadgeKey,
} from "@/shared/api/verify.api";
import { showSuccess, showError } from "@/shared/utils/toast";

const BADGE_META: Record<VerificationBadgeKey, { icon: React.ElementType; label: string }> = {
  email:   { icon: Mail,      label: "Email" },
  phone:   { icon: Phone,     label: "Phone" },
  id:      { icon: CreditCard,    label: "ID document" },
  selfie:  { icon: ScanFace,  label: "Selfie" },
  premium: { icon: Crown,     label: "Premium" },
};

export default function VerificationPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const idRef = useRef<HTMLInputElement>(null);
  const selfieRef = useRef<HTMLInputElement>(null);

  const { data: status, isLoading } = useQuery({
    queryKey: ["verify-status"], queryFn: getVerificationStatus, retry: false,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["verify-status"] });

  const requestOtp = useMutation({
    mutationFn: () => requestPhoneOtp(phone),
    onSuccess: () => { setOtpSent(true); showSuccess("Code sent."); },
    onError: (e) => showError(e, "Could not send code."),
  });

  const verifyOtp = useMutation({
    mutationFn: () => verifyPhoneOtp(otp),
    onSuccess: () => { setOtpSent(false); setOtp(""); showSuccess("Phone verified."); refresh(); },
    onError: (e) => showError(e, "Invalid code."),
  });

  const submit = useMutation({
    mutationFn: (v: { vtype: "id" | "selfie"; file: File }) => submitVerification(v.vtype, v.file),
    onSuccess: () => { showSuccess("Submitted for review."); refresh(); },
    onError: (e) => showError(e, "Upload failed."),
  });

  return (
    <main className="min-h-[100dvh] px-4 py-5 text-[#2D2424]">
      <div className="mx-auto max-w-md">
        <header className="mb-5 flex items-center gap-3">
          <button onClick={() => router.back()} className="glass-btn grid h-9 w-9 place-items-center rounded-full" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-xl font-semibold">Verification</h1>
        </header>

        {isLoading && <p className="text-sm text-[#746767]">Loading…</p>}

        {status && (
          <>
            {/* Badge overview */}
            <section className="mb-4 grid grid-cols-2 gap-2">
              {(Object.keys(BADGE_META) as VerificationBadgeKey[]).map((k) => {
                const meta = BADGE_META[k];
                const granted = status.badges[k];
                const reqStatus = status.requests[k];
                const Icon = meta.icon;
                return (
                  <div key={k} className="flex items-center gap-2 rounded-2xl border border-white/60 bg-white/40 p-3 backdrop-blur-md">
                    <Icon className="h-5 w-5 text-[#2D2424]" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{meta.label}</p>
                      <p className="text-xs">
                        {granted ? (
                          <span className="flex items-center gap-1 text-[#3FC88A]"><BadgeCheck className="h-3 w-3" /> Verified</span>
                        ) : reqStatus ? (
                          <span className="text-amber-600 capitalize">{reqStatus.replace("_", " ")}</span>
                        ) : (
                          <span className="text-[#746767]">Not verified</span>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </section>

            {/* Phone OTP */}
            {!status.badges.phone && (
              <section className="mb-4 rounded-3xl border border-white/60 bg-white/40 p-4 backdrop-blur-md">
                <h2 className="mb-2 font-semibold">Verify phone</h2>
                {!otpSent ? (
                  <div className="flex gap-2">
                    <input
                      value={phone} onChange={(e) => setPhone(e.target.value)}
                      placeholder="Phone number"
                      className="flex-1 rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-sm focus:outline-none"
                    />
                    <button onClick={() => requestOtp.mutate()} disabled={!phone || requestOtp.isPending}
                      className="glass-btn rounded-xl px-4 text-sm font-semibold disabled:opacity-50">Send code</button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={otp} onChange={(e) => setOtp(e.target.value)}
                      placeholder="6-digit code" inputMode="numeric"
                      className="flex-1 rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-sm focus:outline-none"
                    />
                    <button onClick={() => verifyOtp.mutate()} disabled={!otp || verifyOtp.isPending}
                      className="glass-btn rounded-xl px-4 text-sm font-semibold disabled:opacity-50">Verify</button>
                  </div>
                )}
              </section>
            )}

            {/* ID + selfie uploads */}
            <section className="mb-4 rounded-3xl border border-white/60 bg-white/40 p-4 backdrop-blur-md">
              <h2 className="mb-3 font-semibold">Identity verification</h2>
              <div className="grid grid-cols-2 gap-3">
                <UploadTile
                  label="Upload ID" disabled={status.badges.id}
                  inputRef={idRef}
                  onFile={(f) => submit.mutate({ vtype: "id", file: f })}
                  icon={<CreditCard className="h-5 w-5" />}
                />
                <UploadTile
                  label="Upload selfie" disabled={status.badges.selfie}
                  inputRef={selfieRef}
                  onFile={(f) => submit.mutate({ vtype: "selfie", file: f })}
                  icon={<ScanFace className="h-5 w-5" />}
                />
              </div>
              <p className="mt-3 text-xs text-[#746767]">Documents are reviewed by the safety team.</p>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function UploadTile({ label, disabled, inputRef, onFile, icon }: {
  label: string; disabled: boolean; inputRef: React.RefObject<HTMLInputElement | null>;
  onFile: (f: File) => void; icon: React.ReactNode;
}) {
  return (
    <>
      <input
        ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); if (inputRef.current) inputRef.current.value = ""; }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className="glass-btn flex flex-col items-center gap-1.5 rounded-2xl p-4 text-sm font-semibold disabled:opacity-50"
      >
        {icon}
        {disabled ? "Verified" : label}
      </button>
    </>
  );
}
