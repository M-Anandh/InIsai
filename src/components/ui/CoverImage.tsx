"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Track } from "@/types";
import { ListMusic, Disc3, User, Disc } from "lucide-react";

export interface CoverImageProps {
  src?: string;
  alt: string;
  youtubeVideoId?: string;
  fallbackTracks?: Track[];
  className?: string;
  type?: "track" | "playlist" | "artist" | "album";
  aspect?: "square" | "video" | "none";
}

function getDeterministicGradient(seed: string): string {
  const palettes = [
    "from-[#FF8A3D]/80 via-[#FF3D77]/70 to-[#7A5CFF]/85",
    "from-[#7A5CFF]/80 via-[#4F46E5]/75 to-[#0EA5E9]/85",
    "from-[#FF3D77]/75 via-[#C026D3]/70 to-[#7A5CFF]/85",
    "from-[#10B981]/75 via-[#06B6D4]/75 to-[#3B82F6]/85",
    "from-[#F59E0B]/80 via-[#EF4444]/75 to-[#9333EA]/85",
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palettes[Math.abs(hash) % palettes.length];
}

export const CoverImage: React.FC<CoverImageProps> = ({
  src,
  alt,
  youtubeVideoId,
  fallbackTracks = [],
  className = "",
  type = "track",
  aspect = "none",
}) => {
  const [attemptIndex, setAttemptIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);

  // Build ordered resilient fallback candidate chain
  const candidateUrls = useMemo(() => {
    const urls: string[] = [];
    if (src && src.trim()) {
      urls.push(src);
      // Stage 2: Alternative sizing for Google / YouTube CDN
      if (src.includes("lh3.googleusercontent.com")) {
        urls.push(src.replace(/=w\d+-h\d+[^&]*/i, "=w300-h300-l90-rj"));
      }
      if (src.includes("c.saavncdn.com")) {
        urls.push(src.replace("500x500", "150x150"));
      }
    }
    if (youtubeVideoId) {
      urls.push(`https://i.ytimg.com/vi/${youtubeVideoId}/hqdefault.jpg`);
      urls.push(`https://i.ytimg.com/vi/${youtubeVideoId}/mqdefault.jpg`);
    }
    return Array.from(new Set(urls));
  }, [src, youtubeVideoId]);

  useEffect(() => {
    setAttemptIndex(0);
    setLoaded(false);
  }, [src, youtubeVideoId]);

  const activeUrl = candidateUrls[attemptIndex];
  const validTrackArts = fallbackTracks.filter((t) => Boolean(t.artworkUrl));

  const aspectClass =
    aspect === "square"
      ? "aspect-square"
      : aspect === "video"
      ? "aspect-video"
      : "";

  const handleImgError = () => {
    setLoaded(false);
    setAttemptIndex((prev) => prev + 1);
  };

  // Stage 1 & 2: Primary or Alt Size URL
  if (activeUrl) {
    return (
      <div className={`relative w-full h-full overflow-hidden ${aspectClass} ${className}`}>
        {!loaded && (
          <div className="absolute inset-0 bg-slate-200 dark:bg-white/10 animate-pulse" />
        )}
        <img
          src={activeUrl}
          alt={alt || "Artwork"}
          onLoad={() => setLoaded(true)}
          onError={handleImgError}
          loading="lazy"
          referrerPolicy="no-referrer"
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
        />
      </div>
    );
  }

  // Stage 3: 2x2 Mosaic Collage for Playlists when 4+ track covers exist
  if (type === "playlist" && validTrackArts.length >= 4) {
    return (
      <div className={`w-full h-full grid grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden ${aspectClass} ${className}`}>
        {validTrackArts.slice(0, 4).map((t, idx) => (
          <CoverImage
            key={`${t.id}-${idx}`}
            src={t.artworkUrl}
            alt={t.title}
            youtubeVideoId={t.youtubeVideoId}
          />
        ))}
      </div>
    );
  }

  // Stage 4: Single track cover if playlist has at least one valid cover
  if (validTrackArts.length > 0 && validTrackArts[0].artworkUrl !== src) {
    return (
      <CoverImage
        src={validTrackArts[0].artworkUrl}
        alt={alt}
        youtubeVideoId={validTrackArts[0].youtubeVideoId}
        className={className}
        aspect={aspect}
      />
    );
  }

  // Stage 5: Guaranteed Generated Gradient Initial Emblem (NEVER broken alt text)
  const cleanTitle = (alt || "InIsai").trim();
  const initial = cleanTitle.charAt(0).toUpperCase() || "♪";
  const gradientClass = getDeterministicGradient(cleanTitle);

  return (
    <div
      aria-label={cleanTitle}
      className={`w-full h-full flex flex-col items-center justify-center p-3 text-center bg-gradient-to-br ${gradientClass} text-white select-none relative overflow-hidden ${aspectClass} ${className}`}
    >
      <div className="absolute inset-0 bg-black/15" />
      <div className="relative z-10 flex flex-col items-center justify-center">
        {type === "playlist" ? (
          <ListMusic className="w-7 h-7 mb-1 opacity-90 drop-shadow" />
        ) : type === "artist" ? (
          <User className="w-7 h-7 mb-1 opacity-90 drop-shadow" />
        ) : type === "album" ? (
          <Disc className="w-7 h-7 mb-1 opacity-90 drop-shadow" />
        ) : (
          <Disc3 className="w-7 h-7 mb-1 opacity-90 drop-shadow" />
        )}
        <span className="text-lg font-extrabold tracking-tight drop-shadow-sm">
          {initial}
        </span>
      </div>
    </div>
  );
};
