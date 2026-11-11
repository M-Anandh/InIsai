"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { InisaiLogo } from "@/components/ui/InisaiLogo";
import { LogIn, UserPlus, Lock, Mail, User, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signUp } = useAuthStore();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    if (mode === "register") {
      if (!name) {
        setErrorMsg("Please enter your name.");
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg("Passwords do not match.");
        return;
      }
      if (password.length < 6) {
        setErrorMsg("Password must be at least 6 characters.");
        return;
      }

      setIsLoading(true);
      const res = await signUp(email, password, name);
      setIsLoading(false);

      if (res.error) {
        setErrorMsg(res.error);
      } else if (res.needsConfirmation) {
        setConfirmationSent(true);
      } else {
        router.push("/");
      }
    } else {
      setIsLoading(true);
      const res = await signIn(email, password);
      setIsLoading(false);

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        router.push("/");
      }
    }
  };

  const handleGuest = () => {
    router.push("/");
  };

  if (confirmationSent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
        <div className="w-full max-w-md bg-inisai-card border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center">
          <InisaiLogo size="lg" className="justify-center" />
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
            <Mail className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Check your email</h2>
            <p className="text-xs text-inisai-muted leading-relaxed">
              We sent a verification link to <span className="font-semibold text-white">{email}</span>. Click the link in your email to activate your account and start streaming.
            </p>
          </div>
          <div className="pt-4 space-y-2">
            <button
              onClick={() => {
                setConfirmationSent(false);
                setMode("login");
              }}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-colors"
            >
              Back to Sign In
            </button>
            <button
              onClick={handleGuest}
              className="w-full py-2.5 rounded-xl bg-transparent hover:bg-white/5 text-inisai-muted hover:text-white text-xs transition-colors"
            >
              Continue in Guest Mode
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <div className="w-full max-w-md bg-inisai-card border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <InisaiLogo size="lg" className="justify-center" />
          <p className="text-xs text-inisai-muted">
            {mode === "login"
              ? "Sign in to synchronize your playlists & liked tracks"
              : "Create your free InIsai music account"}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="grid grid-cols-2 gap-1 bg-black/40 p-1 rounded-2xl border border-white/5">
          <button
            onClick={() => {
              setMode("login");
              setErrorMsg(null);
            }}
            className={`py-2 rounded-xl text-xs font-bold transition-all ${
              mode === "login"
                ? "bg-inisai-accent text-white shadow-md shadow-inisai-accent/30"
                : "text-white/60 hover:text-white"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setMode("register");
              setErrorMsg(null);
            }}
            className={`py-2 rounded-xl text-xs font-bold transition-all ${
              mode === "register"
                ? "bg-inisai-accent text-white shadow-md shadow-inisai-accent/30"
                : "text-white/60 hover:text-white"
            }`}
          >
            Register
          </button>
        </div>

        {errorMsg && (
          <div className="flex items-center space-x-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-inisai-muted">Your Name</label>
              <div className="flex items-center bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 focus-within:border-inisai-accent">
                <User className="w-4 h-4 text-inisai-muted mr-2" />
                <input
                  type="text"
                  placeholder="e.g., Anandh"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-transparent text-sm text-white outline-none w-full placeholder-white/30"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-inisai-muted">Email Address</label>
            <div className="flex items-center bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 focus-within:border-inisai-accent">
              <Mail className="w-4 h-4 text-inisai-muted mr-2" />
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-transparent text-sm text-white outline-none w-full placeholder-white/30"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-inisai-muted">Password</label>
            <div className="flex items-center bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 focus-within:border-inisai-accent">
              <Lock className="w-4 h-4 text-inisai-muted mr-2" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-transparent text-sm text-white outline-none w-full placeholder-white/30"
              />
            </div>
          </div>

          {mode === "register" && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-inisai-muted">Confirm Password</label>
              <div className="flex items-center bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 focus-within:border-inisai-accent">
                <Lock className="w-4 h-4 text-inisai-muted mr-2" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-transparent text-sm text-white outline-none w-full placeholder-white/30"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-inisai-accent to-inisai-teal text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-inisai-accent/30 hover:opacity-95 active:scale-95 transition-all flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : mode === "login" ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create Account</span>
              </>
            )}
          </button>
        </form>

        <div className="pt-2 border-t border-white/5 text-center">
          <button
            onClick={handleGuest}
            className="text-xs text-inisai-muted hover:text-white transition-colors"
          >
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  );
}

