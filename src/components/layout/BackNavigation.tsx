"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface BackNavigationProps {
  title?: string;
  fallbackUrl?: string;
}

export const BackNavigation: React.FC<BackNavigationProps> = ({
  title,
  fallbackUrl = "/",
}) => {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackUrl);
    }
  };

  return (
    <div className="flex items-center space-x-3 mb-4">
      <button
        onClick={handleBack}
        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-800 dark:text-white/90 hover:text-slate-900 dark:hover:text-white border border-slate-300/80 dark:border-white/10 text-xs font-semibold transition-all cursor-pointer shadow-sm dark:shadow-none"
        title="Go back"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back</span>
      </button>

      {title && (
        <span className="text-sm font-semibold text-slate-700 dark:text-white/70 truncate">
          {title}
        </span>
      )}
    </div>
  );
};

