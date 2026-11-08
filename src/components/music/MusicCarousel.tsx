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
        <div className="space-y-0.5">
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center space-x-2.5">
            {icon && <span className="flex-shrink-0">{icon}</span>}
            <span>{title}</span>
          </h2>
          {subtitle && (
            <p className="text-xs sm:text-sm text-inisai-muted">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {seeAllHref && (
            <Link
              href={seeAllHref}
              className="text-xs font-semibold text-inisai-teal hover:text-white transition-colors mr-1 hidden xs:inline-block"
            >
              See all
            </Link>
          )}

          {/* Desktop Left / Right Arrow Navigation */}
          <div className="hidden sm:flex items-center space-x-1">
            <button
              onClick={() => scroll("left")}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-all active:scale-95"
              title="Previous"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll("right")}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-all active:scale-95"
              title="Next"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Carousel Track */}
      <div
        ref={containerRef}
        className="flex items-stretch space-x-4 overflow-x-auto scrollbar-none scroll-smooth pb-2 pt-1 -mx-2 px-2 snap-x snap-mandatory"
      >
        {children}
      </div>
    </section>
  );
};

