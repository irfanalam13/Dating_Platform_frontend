"use client";

import { useState } from "react";
import { useLogin } from "../hooks/useAuth";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const { mutate, isPending } = useLogin();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    mutate({
      email: email.trim(),
      password: password,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md p-8 rounded-3xl space-y-5 text-black"
      >
        <div className="text-center">
          <img src="/logo.png" alt="" width={200} height={200} className="mx-auto" />
          <p className="log-font text-black/70 text-4xl">MatchMakers</p>
        </div>
        <br /><br />

        <input
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Type in your email"
          className="w-full px-4 py-3 rounded-xl bg-white/20 text-black placeholder-black/60 outline-none border border-white/20 focus:border-white focus:ring-2 focus:ring-white/40 transition"
          required
        />

        {/* Password with show/hide */}
        <div className="relative">
          <input
            name="password"
            type={showPass ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Type in your password"
            className="w-full px-4 py-3 rounded-xl bg-white/20 text-black placeholder-black/60 outline-none border border-white/20 focus:border-white focus:ring-2 focus:ring-white/40 transition"
            required
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute right-3 top-3.5 text-black/60"
          >
            {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {/* Forgot password + register links */}
        <div className="flex items-center justify-between text-sm text-black/70">
          <button
            type="button"
            onClick={() => router.push("/forgot-password")}
            className="text-[#005DFF] font-medium hover:underline"
          >
            Forgot password?
          </button>
          <span>
            New here?{" "}
            <button
              type="button"
              onClick={() => router.push("/register")}
              className="text-[#005DFF] font-bold underline"
            >
              Register
            </button>
          </span>
        </div>
        <br />

        <button
          type="submit"
          disabled={isPending}
          className="w-48 py-3 mx-auto block rounded-full bg-[#0088FF] text-white font-light hover:bg-[#006DCD] transition"
        >
          {isPending ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}
