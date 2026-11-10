"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface MusicCarouselProps {
  title: string;
  subtitle?: string;
  seeAllHref?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const MusicCarousel: React.FC<MusicCarouselProps> = ({
  title,
  subtitle,
  seeAllHref,
  icon,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const scroll = (direction: "left" | "right") => {
    if (!containerRef.current) return;
    const scrollAmount = containerRef.current.clientWidth * 0.75;
    containerRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <section className="space-y-3.5 group/section">
      {/* Section Header */}
      <div className="flex items-end justify-between">
        <div className="space-y-0.5 min-w-0 pr-2">
          <h2 className="fluid-h2 font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2.5 truncate">
            {icon && <span className="flex-shrink-0">{icon}</span>}
            <span className="truncate">{title}</span>
          </h2>
          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-500 dark:text-inisai-muted line-clamp-1">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center space-x-2 flex-shrink-0">
          {seeAllHref && (
            <Link
              href={seeAllHref}
              className="text-xs font-semibold text-inisai-accent hover:underline transition-colors mr-1 hidden xs:inline-block"
            >
              See all
            </Link>
          )}

          {/* Desktop Left / Right Arrow Navigation */}
          <div className="hidden sm:flex items-center space-x-1">
            <button
              onClick={() => scroll("left")}
              className="w-8 h-8 rounded-full bg-slate-200/70 dark:bg-white/5 hover:bg-slate-300 dark:hover:bg-white/15 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-700 dark:text-white/75 transition-all active:scale-95 cursor-pointer"
              title="Previous"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll("right")}
              className="w-8 h-8 rounded-full bg-slate-200/70 dark:bg-white/5 hover:bg-slate-300 dark:hover:bg-white/15 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-700 dark:text-white/75 transition-all active:scale-95 cursor-pointer"
              title="Next"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Snap-Scroll Carousel Track with Edge Fades */}
      <div
        ref={containerRef}
        className="flex space-x-4 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth scrollbar-none carousel-mask px-1"
      >
        {children}
      </div>
    </section>
  );
};
