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
        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/5 text-xs font-semibold transition-all cursor-pointer"
        title="Go back"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back</span>
      </button>

      {title && (
        <span className="text-sm font-semibold text-white/70 truncate">
          {title}
        </span>
      )}
    </div>
  );
};

