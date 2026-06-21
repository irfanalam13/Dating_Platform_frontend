"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LockKeyhole, Eye, EyeOff, CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import { useResetPassword } from "@/features/auth";
import { showError } from "@/shared/utils/toast";
import OTPInput from "@/shared/components/OTPInput";

const CODE_LENGTH = 6;

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const emailFromQuery = searchParams.get("email") || "";

  const [email, setEmail] = useState(emailFromQuery);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const resetMutation = useResetPassword();

  const isLengthValid = password.length >= 10;
  const hasNumber = /\d/.test(password);
  const hasLetter = /[A-Za-z]/.test(password);
  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      showError("Please enter your email address.");
      return;
    }
    if (code.length !== CODE_LENGTH) {
      showError("Please enter the 6-digit code from your email.");
      return;
    }
    if (!isLengthValid) {
      showError("Password must be at least 10 characters.");
      return;
    }
    if (!passwordsMatch) {
      showError("Passwords do not match.");
      return;
    }

    resetMutation.mutate({
      email: email.trim(),
      code: code,
      password: password,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="rounded-3xl shadow-xl p-6 sm:p-8 space-y-6">

          {/* Icon */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="h-16 w-16 rounded-full flex items-center justify-center">
              <LockKeyhole className="h-8 w-8 text-[#F87171]" />
            </div>
            <h1 className="text-2xl font-bold text-[#2D2424]">Reset your password</h1>
            <p className="text-sm text-[#746767]">
              Choose a strong new password for your account.
            </p>
          </div>

          {/* Success state */}
          {resetMutation.isSuccess ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <div>
                <p className="font-semibold text-[#2D2424]">Password reset!</p>
                <p className="text-sm text-[#746767] mt-1">
                  You can now log in with your new password.
                </p>
              </div>
              <button
                onClick={() => router.push("/login")}
                className="glass-btn-rose w-full h-12 rounded-2xl font-semibold text-sm shadow-lg active:scale-[0.98] transition-transform"
              >
                Go to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Email — only show if not passed via the forgot-password redirect */}
              {!emailFromQuery && (
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest text-[#B78A3B] mb-1 block">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[#EADDD2] bg-[#FDFAF7] text-[#2D2424] placeholder-[#BFAAA0] outline-none focus:border-[#F87171] focus:ring-2 focus:ring-[#F87171]/20 transition text-sm"
                  />
                </div>
              )}

              {/* Reset code */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-[#B78A3B] mb-2 block">
                  Reset Code
                </label>
                <OTPInput
                  value={code}
                  onChange={setCode}
                  length={CODE_LENGTH}
                  disabled={resetMutation.isPending}
                />
              </div>

              {/* New password */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-[#B78A3B] mb-1 block">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[#EADDD2] bg-[#FDFAF7] text-[#2D2424] placeholder-[#BFAAA0] outline-none focus:border-[#F87171] focus:ring-2 focus:ring-[#F87171]/20 transition text-sm pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-3.5 text-[#BFAAA0] hover:text-[#746767]"
                  >
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Password strength */}
              {password && (
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2">
                    {isLengthValid
                      ? <CheckCircle className="text-green-500" size={15} />
                      : <XCircle className="text-red-400" size={15} />}
                    <span className={isLengthValid ? "text-green-600" : "text-[#746767]"}>
                      At least 10 characters
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasLetter
                      ? <CheckCircle className="text-green-500" size={15} />
                      : <XCircle className="text-red-400" size={15} />}
                    <span className={hasLetter ? "text-green-600" : "text-[#746767]"}>
                      Contains letters
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasNumber
                      ? <CheckCircle className="text-green-500" size={15} />
                      : <XCircle className="text-red-400" size={15} />}
                    <span className={hasNumber ? "text-green-600" : "text-[#746767]"}>
                      Contains a number
                    </span>
                  </div>
                </div>
              )}

              {/* Confirm password */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-[#B78A3B] mb-1 block">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[#EADDD2] bg-[#FDFAF7] text-[#2D2424] placeholder-[#BFAAA0] outline-none focus:border-[#F87171] focus:ring-2 focus:ring-[#F87171]/20 transition text-sm pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-3.5 text-[#BFAAA0] hover:text-[#746767]"
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {confirmPassword && (
                  <div className="flex items-center gap-2 mt-1.5 text-sm">
                    {passwordsMatch
                      ? <><CheckCircle className="text-green-500" size={15} /><span className="text-green-600">Passwords match</span></>
                      : <><XCircle className="text-red-400" size={15} /><span className="text-red-500">Passwords do not match</span></>
                    }
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={resetMutation.isPending}
                className="glass-btn-rose w-full h-12 rounded-2xl font-semibold text-sm shadow-lg disabled:opacity-60 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
              >
                {resetMutation.isPending ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  "Reset Password"
                )}
              </button>
            </form>
          )}

          {/* Back to login */}
          {!resetMutation.isSuccess && (
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="w-full flex items-center justify-center gap-2 text-sm text-[#746767] hover:text-[#2D2424] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
