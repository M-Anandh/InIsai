"use client";

import React, { useState } from "react";
import { Track } from "@/types";
import { Music, ListMusic, Disc3 } from "lucide-react";

interface ArtworkImageProps {
  src?: string;
  alt: string;
  fallbackTracks?: Track[];
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  type?: "track" | "playlist" | "artist";
  priority?: boolean;
}

export const ArtworkImage: React.FC<ArtworkImageProps> = ({
  src,
  alt,
  fallbackTracks = [],
  className = "",
  size = "md",
  type = "track",
}) => {
  const [hasError, setHasError] = useState(false);

  // If primary image is available and hasn't errored
  if (src && !hasError) {
    return (
      <img
        src={src}
        alt={alt}
        onError={() => setHasError(true)}
        className={`w-full h-full object-cover transition-transform duration-500 ${className}`}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    );
  }

  // Multi-image collage for playlists when 4+ tracks are available
  const tracksWithArt = fallbackTracks.filter((t) => Boolean(t.artworkUrl));
  if (type === "playlist" && tracksWithArt.length >= 4) {
    return (
      <div className={`w-full h-full grid grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden ${className}`}>
        {tracksWithArt.slice(0, 4).map((t, idx) => (
          <img
            key={`${t.id}-${idx}`}
            src={t.artworkUrl}
            alt={t.title}
            className="w-full h-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ))}
      </div>
    );
  }

  // Single track fallback if at least one track has artwork
  if (tracksWithArt.length > 0) {
    return (
      <img
        src={tracksWithArt[0].artworkUrl}
        alt={alt}
        className={`w-full h-full object-cover ${className}`}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    );
  }

  // Original Branded InIsai Placeholder (Dual Theme Compatible)
  return (
    <div
      className={`w-full h-full flex flex-col items-center justify-center p-3 text-center bg-gradient-to-tr from-purple-900/30 via-slate-900/40 to-cyan-900/20 text-inisai-accent border border-white/5 ${className}`}
    >
      {type === "playlist" ? (
        <ListMusic className="w-8 h-8 opacity-75 mb-1 text-inisai-teal" />
      ) : (
        <Disc3 className="w-8 h-8 opacity-75 mb-1 text-inisai-accent" />
      )}
      <span className="text-[10px] font-bold tracking-wider uppercase text-inisai-muted truncate max-w-full">
        InIsai
      </span>
    </div>
  );
};

