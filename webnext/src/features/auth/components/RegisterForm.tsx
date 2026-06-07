"use client";

import { useState } from "react";
import { useRegister } from "../hooks/useAuth";
import { showError } from "@/shared/utils/toast";
import { Eye, EyeOff, CheckCircle, XCircle, Mail } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import GoogleAuthButton from "./GoogleAuthButton";

export default function RegisterForm() {
  const { mutate, isPending, isSuccess } = useRegister();
  const router = useRouter();

  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    username: "",
    email: "",
    password: "",
    confirm_password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const password = form.password.trim();
  const confirm_password = form.confirm_password.trim();

  const isLengthValid = password.length >= 10;
  const hasNumber = /\d/.test(password);
  const hasLetter = /[A-Za-z]/.test(password);
  const passwordsMatch = password && confirm_password && password === confirm_password;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.full_name || !form.username || !form.email) {
      return showError("All fields are required");
    }
    if (!isLengthValid) {
      return showError("Password must be at least 10 characters");
    }
    if (!passwordsMatch) {
      return showError("Passwords do not match");
    }

    mutate({
      full_name: form.full_name,
      username: form.username,
      email: form.email,
      password: password,
      confirm_password: confirm_password,
    });
  };

  // ── Success state — show "check your email" message ──
  if (isSuccess) {
    return (
      <div className="flex items-center justify-center px-4 min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md p-8 rounded-3xl shadow-xl text-center space-y-4"
        >
          <div className="h-16 w-16 rounded-full flex items-center justify-center mx-auto">
            <Mail className="h-8 w-8 text-[#7A2432]" />
          </div>
          <h2 className="text-2xl font-bold text-[#2D2424]">Check your email</h2>
          <p className="text-sm text-[#746767] leading-relaxed">
            We sent a 6-digit verification code to{" "}
            <span className="font-semibold text-[#2D2424]">{form.email}</span>.
            Enter it to activate your account.
          </p>
          <button
            onClick={() => router.push(`/verify-email?email=${encodeURIComponent(form.email)}`)}
            className="w-full py-3 rounded-full bg-[#0088FF] text-white font-medium hover:bg-[#006DCD] transition"
          >
            Enter Verification Code
          </button>
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="text-sm text-black/60 hover:text-black transition"
          >
            Back to login
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center px-4 mt-0">
      <motion.form
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        onSubmit={handleSubmit}
        className="w-full max-w-md p-8 rounded-3xl space-y-5 text-black"
      >
        {/* Title */}
        <div className="text-center">
          <img src="/logo.png" alt="" width={200} height={200} className="mx-auto" />
          <p className="log-font text-black/70 text-4xl">MatchMakers</p>
        </div>
        <br />

        <input
          name="full_name"
          placeholder="Full name"
          value={form.full_name}
          onChange={handleChange}
          className="w-full px-4 py-3 rounded-xl bg-white/20 text-black placeholder-black/60 outline-none border border-white/20 focus:border-white focus:ring-2 focus:ring-white/40 transition"
        />

        <input
          name="username"
          placeholder="Username"
          
          value={form.username}
          onChange={handleChange}
          className="w-full px-4 py-3 rounded-xl bg-white/20 text-black placeholder-black/60 outline-none border border-white/20 focus:border-white focus:ring-2 focus:ring-white/40 transition"
        />

        <input
          name="email"
          type="email"
          placeholder="Type your email"
          value={form.email}
          onChange={handleChange}
          className="w-full px-4 py-3 rounded-xl bg-white/20 text-black placeholder-black/60 outline-none border border-white/20 focus:border-white focus:ring-2 focus:ring-white/40 transition"
        />

        {/* Password */}
        <div className="relative">
          <input
            name="password"
            type={showPass ? "text" : "password"}
            placeholder="Set a password"
            value={form.password}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-xl bg-white/20 text-xs placeholder-black/60 outline-none border border-white/20 focus:border-white focus:ring-2 focus:ring-white/40 transition"
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute right-3 top-3 text-black/60"
          >
            {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {/* Password Strength */}
        {password && (
          <div className="text-sm space-y-1 text-black/80">
            <div className="flex items-center gap-2">
              {isLengthValid
                ? <CheckCircle className="text-green-400" size={16} />
                : <XCircle className="text-red-400" size={16} />}
              <span>At least 10 characters</span>
            </div>
            <div className="flex items-center gap-2">
              {hasLetter
                ? <CheckCircle className="text-green-400" size={16} />
                : <XCircle className="text-red-400" size={16} />}
              <span>Contains letters</span>
            </div>
            <div className="flex items-center gap-2">
              {hasNumber
                ? <CheckCircle className="text-green-400" size={16} />
                : <XCircle className="text-red-400" size={16} />}
              <span>Contains number</span>
            </div>
          </div>
        )}

        {/* Confirm Password */}
        <div className="relative">
          <input
            name="confirm_password"
            type={showConfirm ? "text" : "password"}
            placeholder="Confirm Password"
            value={form.confirm_password}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-xl bg-white/20 text-xs placeholder-black/60 outline-none border border-white/20 focus:border-white focus:ring-2 focus:ring-white/40 transition"
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-3 text-black/60"
          >
            {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {/* Match indicator */}
        {form.confirm_password && (
          <div className="flex items-center gap-2 text-sm">
            {passwordsMatch ? (
              <>
                <CheckCircle className="text-green-400" size={16} />
                <span className="text-green-400">Passwords match</span>
              </>
            ) : (
              <>
                <XCircle className="text-red-400" size={16} />
                <span className="text-red-400">Passwords do not match</span>
              </>
            )}
          </div>
        )}

        {/* Footer */}
        <p className="text-right text-sm text-black/70">
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="text-[#005DFF] font-bold underline"
          >
            Log on
          </button>
        </p>
        <br />

        {/* Button */}
        <button
          disabled={isPending}
          className="w-48 py-3 mx-auto block rounded-full bg-[#0088FF] text-white font-light hover:bg-[#006DCD] transition"
        >
          {isPending ? "Creating..." : "Register"}
        </button>
      </motion.form>
    </div>
  );
}
