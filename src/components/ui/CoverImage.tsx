"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Track } from "@/types";
import { normalizeThumb, ThumbSize } from "@/lib/media/thumb";
import { get, set } from "idb-keyval";

export interface CoverImageProps {
  src?: string;
  candidates?: string[];
  alt: string;
  id?: string; // provider:trackId for IndexedDB caching
  youtubeVideoId?: string;
  fallbackTracks?: Track[];
  className?: string;
  kind?: "song" | "album" | "playlist" | "artist" | "collection";
  type?: "track" | "playlist" | "artist" | "album" | "collection"; // alias for backwards-compat
  aspect?: "square" | "video" | "none";
  size?: ThumbSize;
  eager?: boolean;
}

const CACHE_PREFIX = "inisai_cover_v2:";

export const CoverImage: React.FC<CoverImageProps> = ({
  src,
  candidates: explicitCandidates,
  alt,
  id,
  youtubeVideoId,
  fallbackTracks = [],
  className = "",
  kind,
  type = "track",
  aspect = "none",
  size = "card",
  eager = false,
}) => {
  // Normalize kind
  const effectiveKind =
    kind ||
    (type === "track" ? "song" : (type as "song" | "album" | "playlist" | "artist" | "collection"));

  const [attemptIndex, setAttemptIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [cachedUrl, setCachedUrl] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Look up cached verified working URL in IndexedDB on mount
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    get(`${CACHE_PREFIX}${id}`)
      .then((val) => {
        if (!cancelled && typeof val === "string" && val.length > 5) {
          setCachedUrl(val);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Build resilient, normalized candidate list
  const candidateUrls = useMemo(() => {
    if (explicitCandidates && explicitCandidates.length > 0) {
      return explicitCandidates;
    }

    const list: string[] = [];
    if (cachedUrl) {
      list.push(cachedUrl);
    }

    if (src && src.trim()) {
      list.push(...normalizeThumb(src, size));
    }

    return Array.from(new Set(list));
  }, [src, explicitCandidates, cachedUrl, size]);

  useEffect(() => {
    setAttemptIndex(0);
    setLoaded(false);
  }, [src, cachedUrl]);

  const activeUrl = candidateUrls[attemptIndex];
  const validTrackArts = fallbackTracks.filter((t) => Boolean(t.artworkUrl));

  const aspectClass =
    aspect === "square"
      ? "aspect-square"
      : aspect === "video"
      ? "aspect-video"
      : "";

  const handleImgError = useCallback(() => {
    setLoaded(false);
    setAttemptIndex((prev) => prev + 1);
  }, []);

  // Validation function: checks image dimensions
  // Rejects YouTube's ~120x90 grey placeholder TV icon (<300px for ytimg)
  // Rejects broken images under 100px
  const validateAndMarkLoaded = useCallback(
    (img: HTMLImageElement | null, currentUrl?: string) => {
      if (!img) return;
      const w = img.naturalWidth;
      const h = img.naturalHeight;

      if (w === 0 || h === 0) return;

      const isYtPlaceholder =
        currentUrl?.includes("i.ytimg.com") && (w < 300 || h < 200);

      if (isYtPlaceholder || w < 100 || h < 100) {
        handleImgError();
        return;
      }

      setLoaded(true);

      // Cache verified working URL in IndexedDB for instant subsequent renders
      if (id && currentUrl && !currentUrl.startsWith("data:")) {
        set(`${CACHE_PREFIX}${id}`, currentUrl).catch(() => {});
      }
    },
    [handleImgError, id]
  );

  const imageRefCallback = useCallback(
    (img: HTMLImageElement | null) => {
      imgRef.current = img;
      if (!img) return;
      if (img.complete) {
        validateAndMarkLoaded(img, activeUrl);
      }
    },
    [validateAndMarkLoaded, activeUrl]
  );

  // 4-second timeout fallback: if a CDN stalls, advance to next candidate
  useEffect(() => {
    if (!activeUrl || loaded) return;
    const timer = setTimeout(() => {
      if (!loaded) {
        if (imgRef.current?.complete && imgRef.current.naturalWidth >= 100) {
          validateAndMarkLoaded(imgRef.current, activeUrl);
        } else {
          handleImgError();
        }
      }
    }, 4000);
    return () => clearTimeout(timer);
  }, [activeUrl, loaded, handleImgError, validateAndMarkLoaded]);

  // Stage 1: Active normalized URL candidate
  if (activeUrl) {
    return (
      <div
        className={`relative w-full h-full overflow-hidden ${aspectClass} ${className} ${
          effectiveKind === "artist" ? "rounded-full" : ""
        }`}
      >
        {/* Responsive skeleton behind the image */}
        <div
          className={`absolute inset-0 bg-slate-200 dark:bg-white/10 transition-opacity duration-300 ${
            loaded ? "opacity-0 pointer-events-none" : "animate-pulse opacity-100"
          }`}
        />
        <img
          ref={imageRefCallback}
          src={activeUrl}
          alt={alt || "Artwork"}
          onLoad={(e) => validateAndMarkLoaded(e.currentTarget, activeUrl)}
          onError={handleImgError}
          loading={eager ? "eager" : "lazy"}
          decoding={eager ? "sync" : "async"}
          fetchPriority={eager ? "high" : "auto"}
          referrerPolicy="no-referrer"
          className={`w-full h-full object-cover transition-opacity duration-200 ${
            loaded ? "opacity-100" : "opacity-0"
          } ${effectiveKind === "artist" ? "rounded-full" : ""}`}
        />
      </div>
    );
  }

  // Stage 2: 2x2 Mosaic Collage for Playlists when 4+ track covers exist
  if (effectiveKind === "playlist" && validTrackArts.length >= 4) {
    return (
      <div
        className={`w-full h-full grid grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden ${aspectClass} ${className}`}
      >
        {validTrackArts.slice(0, 4).map((t, idx) => (
          <CoverImage
            key={`${t.id}-${idx}`}
            src={t.artworkUrl}
            alt={t.title}
            youtubeVideoId={t.youtubeVideoId}
            kind="song"
          />
        ))}
      </div>
    );
  }

  // Stage 3: Designed Default Cover (no letters, no icon-on-gradient overlay)
  const defaultAsset = `/covers/default-${effectiveKind}.svg`;

  return (
    <div
      aria-label={alt || "InIsai Music"}
      className={`relative w-full h-full flex items-center justify-center overflow-hidden bg-slate-900 ${aspectClass} ${className} ${
        effectiveKind === "artist" ? "rounded-full" : ""
      }`}
    >
      <img
        src={defaultAsset}
        alt={alt || "Cover"}
        className="w-full h-full object-cover select-none pointer-events-none"
        loading="lazy"
        decoding="async"
      />
    </div>
  );
};
