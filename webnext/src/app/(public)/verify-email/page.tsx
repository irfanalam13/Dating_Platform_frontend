"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, RefreshCw, CheckCircle, ArrowLeft } from "lucide-react";
import { useVerifyEmail, useResendVerification } from "@/features/auth";
import { showError } from "@/shared/utils/toast";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const emailFromQuery = searchParams.get("email") || "";
  const tokenFromQuery = searchParams.get("token") || "";

  const [token, setToken] = useState(tokenFromQuery);
  const [email, setEmail] = useState(emailFromQuery);

  const verifyMutation = useVerifyEmail();
  const resendMutation = useResendVerification();

  // Auto-verify if token is in URL (user clicked email link)
  useEffect(() => {
    if (tokenFromQuery) {
      verifyMutation.mutate({ token: tokenFromQuery });
    }
  }, [tokenFromQuery]);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      showError("Please enter your verification token.");
      return;
    }
    verifyMutation.mutate({ token: token.trim() });
  };

  const handleResend = () => {
    if (!email.trim()) {
      showError("Please enter your email address.");
      return;
    }
    resendMutation.mutate({ email: email.trim() });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-[#FFF8F1] to-[#FFF0E8]">
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl p-8 space-y-6">

          {/* Icon */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="h-16 w-16 rounded-full bg-[#FFF0F2] flex items-center justify-center">
              <Mail className="h-8 w-8 text-[#7A2432]" />
            </div>
            <h1 className="text-2xl font-bold text-[#2D2424]">Verify your email</h1>
            <p className="text-sm text-[#746767] leading-relaxed">
              We sent a verification link to{" "}
              {emailFromQuery ? (
                <span className="font-semibold text-[#2D2424]">{emailFromQuery}</span>
              ) : (
                "your email"
              )}
              . Click the link or paste the token below.
            </p>
          </div>

          {/* Auto-verifying state */}
          {tokenFromQuery && verifyMutation.isPending && (
            <div className="flex flex-col items-center gap-3 py-4">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-[#7A2432] border-t-transparent" />
              <p className="text-sm text-[#746767]">Verifying your email...</p>
            </div>
          )}

          {/* Success state */}
          {verifyMutation.isSuccess && (
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <p className="text-sm font-medium text-green-600">Email verified! Redirecting...</p>
            </div>
          )}

          {/* Manual token form — shown when no token in URL */}
          {!tokenFromQuery && !verifyMutation.isSuccess && (
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-[#B78A3B] mb-1 block">
                  Verification Token
                </label>
                <input
                  type="text"
                  placeholder="Paste token from email"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[#EADDD2] bg-[#FDFAF7] text-[#2D2424] placeholder-[#BFAAA0] outline-none focus:border-[#7A2432] focus:ring-2 focus:ring-[#7A2432]/20 transition text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={verifyMutation.isPending}
                className="w-full h-12 rounded-2xl bg-[#7A2432] text-white font-semibold text-sm shadow-lg shadow-[#7A2432]/25 disabled:opacity-60 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
              >
                {verifyMutation.isPending ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  "Verify Email"
                )}
              </button>
            </form>
          )}

          {/* Divider */}
          {!verifyMutation.isSuccess && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#EADDD2]" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-xs text-[#BFAAA0]">Didn't get the email?</span>
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
                className="w-full px-4 py-3 rounded-xl border border-[#EADDD2] bg-[#FDFAF7] text-[#2D2424] placeholder-[#BFAAA0] outline-none focus:border-[#7A2432] focus:ring-2 focus:ring-[#7A2432]/20 transition text-sm"
              />
              <button
                type="button"
                onClick={handleResend}
                disabled={resendMutation.isPending}
                className="w-full h-12 rounded-2xl border-2 border-[#EADDD2] text-[#7A2432] font-semibold text-sm disabled:opacity-60 hover:bg-[#FFF0F2] transition-colors flex items-center justify-center gap-2"
              >
                {resendMutation.isPending ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#7A2432] border-t-transparent" />
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Resend Verification Email
                  </>
                )}
              </button>
            </div>
          )}

          {/* Back to login */}
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="w-full flex items-center justify-center gap-2 text-sm text-[#746767] hover:text-[#2D2424] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </button>
        </div>
      </motion.div>
    </div>
  );
}