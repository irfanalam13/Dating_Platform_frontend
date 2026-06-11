"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
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
                <SelfieCamera
                  disabled={status.badges.selfie}
                  onCapture={(f) => submit.mutate({ vtype: "selfie", file: f })}
                />
              </div>
              <p className="mt-3 text-xs text-[#746767]">
                The selfie must be taken with your live camera (no gallery uploads).
                Documents are reviewed by the safety team.
              </p>
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

/**
 * Live-camera-only selfie capture. Uses getUserMedia (front camera) and grabs a
 * frame from the video stream — there is intentionally NO file input, so a user
 * can never upload a saved/gallery image for the selfie verification.
 * Requires a secure context (HTTPS or localhost).
 */
function SelfieCamera({ disabled, onCapture }: {
  disabled: boolean;
  onCapture: (f: File) => void;
}) {
  const [open, setOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // Always release the camera if the component unmounts while open.
  useEffect(() => () => stop(), [stop]);

  const start = async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Live camera isn't available on this device/browser.");
      return;
    }
    setStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      setOpen(true);
      // Attach after the <video> mounts on the next frame.
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch {
      setError("Camera permission denied. Allow camera access to verify.");
    } finally {
      setStarting(false);
    }
  };

  const close = useCallback(() => {
    stop();
    setOpen(false);
  }, [stop]);

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onCapture(new File([blob], `selfie-${Date.now()}.jpg`, { type: "image/jpeg" }));
        close();
      },
      "image/jpeg",
      0.9
    );
  };

  return (
    <>
      <button
        onClick={start}
        disabled={disabled || starting}
        className="glass-btn flex flex-col items-center gap-1.5 rounded-2xl p-4 text-sm font-semibold disabled:opacity-50"
      >
        <ScanFace className="h-5 w-5" />
        {disabled ? "Verified" : starting ? "Opening…" : "Take selfie"}
      </button>

      {error && <p className="col-span-2 -mt-1 text-xs text-red-600">{error}</p>}

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-4">
            <video
              ref={videoRef}
              playsInline
              muted
              className="aspect-[3/4] w-full rounded-xl bg-black object-cover"
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={close}
                className="flex-1 rounded-xl border border-[#EADDD2] py-2 text-sm font-semibold text-[#2D2424]"
              >
                Cancel
              </button>
              <button
                onClick={capture}
                className="flex-1 rounded-xl bg-[#7A2432] py-2 text-sm font-semibold text-white"
              >
                Capture
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
