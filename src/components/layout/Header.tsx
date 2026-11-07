"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { InisaiLogo } from "../ui/InisaiLogo";
import { PWAInstaller } from "../pwa/PWAInstaller";
import { Search, User, LogIn } from "lucide-react";

export const Header: React.FC = () => {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const greeting = useMemo(() => {
    if (!mounted) return "இனிசை வணக்கம் (Welcome to InIsai)";
    const hour = new Date().getHours();
    if (hour < 12) return "காலை வணக்கம் (Good Morning)";
    if (hour < 17) return "மதிய வணக்கம் (Good Afternoon)";
    return "மாலை வணக்கம் (Good Evening)";
  }, [mounted]);

  return (
    <header className="sticky top-0 z-20 bg-inisai-dark/80 backdrop-blur-md border-b border-white/5 px-4 sm:px-8 py-3.5 flex items-center justify-between">
      {/* Mobile Logo / Desktop Greeting */}
      <div className="flex items-center space-x-3">
        <div className="md:hidden">
          <InisaiLogo size="sm" />
        </div>
        <div className="hidden md:block">
          <p className="text-xs font-semibold text-inisai-accent font-tamil">
            {greeting}
          </p>
          <h2 className="text-lg font-bold text-white tracking-tight">
            {user?.displayName ? `${user.displayName}` : "InIsai Music"}
          </h2>
        </div>
      </div>

      {/* Quick Search Bar */}
      <div
        onClick={() => router.push("/search")}
        className="hidden sm:flex items-center space-x-2 bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-full cursor-pointer text-xs text-inisai-muted max-w-xs w-full transition-all"
      >
        <Search className="w-4 h-4 text-inisai-accent" />
        <span className="truncate">Search songs, Tamil ragas, artists...</span>
      </div>

      {/* Right Actions: Install & Profile */}
      <div className="flex items-center space-x-3">
        <PWAInstaller />

        {isAuthenticated && user ? (
          <Link
            href="/profile"
            className="flex items-center space-x-2 p-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-inisai-accent to-inisai-teal flex items-center justify-center text-xs font-bold text-white uppercase">
              {user.displayName.charAt(0)}
            </div>
          </Link>
        ) : (
          <Link
            href="/login"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
          >
            <LogIn className="w-3.5 h-3.5 text-inisai-teal" />
            <span>Sign In</span>
          </Link>
        )}
      </div>
    </header>
  );
};

