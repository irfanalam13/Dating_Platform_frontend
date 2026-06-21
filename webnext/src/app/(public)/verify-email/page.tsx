"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, RefreshCw, CheckCircle, ArrowLeft } from "lucide-react";
import { useVerifyEmail, useResendVerification } from "@/features/auth";
import { showError } from "@/shared/utils/toast";
import OTPInput from "@/shared/components/OTPInput";

const CODE_LENGTH = 6;

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const emailFromQuery = searchParams.get("email") || "";

  const [code, setCode] = useState("");
  const [email, setEmail] = useState(emailFromQuery);

  const verifyMutation = useVerifyEmail();
  const resendMutation = useResendVerification();

  const submitCode = (value: string) => {
    if (!email.trim()) {
      showError("Please enter your email address.");
      return;
    }
    if (value.length !== CODE_LENGTH) {
      showError("Please enter the 6-digit code from your email.");
      return;
    }
    verifyMutation.mutate({ email: email.trim(), code: value });
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    submitCode(code);
  };

  const handleResend = () => {
    if (!email.trim()) {
      showError("Please enter your email address.");
      return;
    }
    resendMutation.mutate({ email: email.trim() });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        {/* Card */}
        <div className="rounded-3xl shadow-xl p-8 space-y-6">

          {/* Icon */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="h-16 w-16 rounded-full flex items-center justify-center">
              <Mail className="h-8 w-8 text-[#A9A9A9]" />
            </div>
            <h1 className="text-2xl font-bold text-[#2D2424]">Verify your email</h1>
            <p className="text-sm text-[#746767] leading-relaxed">
              Type the 6-digit verification code sent to{" "}
              {emailFromQuery ? (
                <span className="font-semibold text-[#2D2424]">{emailFromQuery}</span>
              ) : (
                "your email"
              )}
            </p>
          </div>
          <br />

          {/* Success state */}
          {verifyMutation.isSuccess && (
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <p className="text-sm font-medium text-green-600">Email verified! Redirecting...</p>
            </div>
          )}

          {/* OTP code form */}
          {!verifyMutation.isSuccess && (
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-[#B78A3B] mb-2 block">
                  Verification Code
                </label>
                <OTPInput
                  value={code}
                  onChange={setCode}
                  length={CODE_LENGTH}
                  disabled={verifyMutation.isPending}
                  onComplete={submitCode}
                />
              </div>

              <button
                type="submit"
                disabled={verifyMutation.isPending || code.length !== CODE_LENGTH}
                className="glass-btn w-full h-12 rounded-2xl font-semibold text-sm disabled:opacity-60 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
              >
                {verifyMutation.isPending ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#2D2424] border-t-transparent" />
                ) : (
                  "Verify Email"
                )}
              </button>
            </form>
          )}
          <br />

          {/* Divider */}
          {!verifyMutation.isSuccess && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#EADDD2]" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 text-xs text-[#BFAAA0]">Typed wrong email?</span>
              </div>
            </div>
          )}

          {/* Resend section */}
          {!verifyMutation.isSuccess && (
            <div className="space-y-3">
              <input
                type="email"
                placeholder="Enter your email to resend"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#EADDD2] bg-[#FDFAF7] text-[#2D2424] placeholder-[#BFAAA0] outline-none focus:border-[#F87171] focus:ring-2 focus:ring-[#F87171]/20 transition text-sm"
              />
              <button
                type="button"
                onClick={handleResend}
                disabled={resendMutation.isPending}
                className="w-full h-12 rounded-2xl border-2 border-[#EADDD2] text-[green] font-semibold text-sm disabled:opacity-60 hover:bg-[#FFF0F2] transition-colors flex items-center justify-center gap-2"
              >
                {resendMutation.isPending ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#F87171] border-t-transparent" />
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Resend Verification Code
                  </>
                )}
              </button>
            </div>
          )}

          {/* Back to login */}
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="w-full flex items-center justify-center gap-2 text-sm text-[#000000] hover:text-[#2D2424] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </button>
        </div>
      </motion.div>
    </div>
  );
}