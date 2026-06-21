"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { KeyRound, ArrowLeft, CheckCircle } from "lucide-react";
import { useForgotPassword } from "@/features/auth";
import { showError } from "@/shared/utils/toast";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const forgotMutation = useForgotPassword();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      showError("Please enter your email address.");
      return;
    }
    forgotMutation.mutate({ email: email.trim() });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="rounded-3xl shadow-xl p-8 space-y-6">

          {/* Icon */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="h-16 w-16 rounded-full flex items-center justify-center">
              <KeyRound className="h-8 w-8 text-[#F87171]" />
            </div>
            <h1 className="text-2xl font-bold text-[#2D2424]">Forgot password?</h1>
            <p className="text-sm text-[#746767] leading-relaxed">
              Enter your email and we&apos;ll send you a 6-digit code to reset your password.
            </p>
          </div>

          {/* Success state */}
          {forgotMutation.isSuccess ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <div>
                <p className="font-semibold text-[#2D2424]">Check your inbox</p>
                <p className="text-sm text-[#746767] mt-1">
                  A reset code has been sent to{" "}
                  <span className="font-semibold text-[#2D2424]">{email}</span>.
                </p>
              </div>
              <button
                onClick={() => forgotMutation.reset()}
                className="text-sm text-[#F87171] font-medium hover:underline"
              >
                Try a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-[#B78A3B] mb-1 block">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="your@mail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[#EADDD2] bg-[#FDFAF7] text-[#2D2424] placeholder-[#BFAAA0] outline-none focus:border-[#F87171] focus:ring-2 focus:ring-[#F87171]/20 transition text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={forgotMutation.isPending}
                className="glass-btn-rose w-full h-12 rounded-2xl font-semibold text-sm shadow-lg disabled:opacity-60 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
              >
                {forgotMutation.isPending ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  "Send Reset Code"
                )}
              </button>
            </form>
          )}

          {/* Back to login */}
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="w-full flex items-center justify-center gap-2 text-sm text-[#746767] hover:text-[#2D2424] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login page
          </button>
        </div>
      </motion.div>
    </div>
  );
}
