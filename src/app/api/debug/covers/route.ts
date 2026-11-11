import { NextRequest, NextResponse } from "next/server";
import { ytHomeShelves, ytSearch } from "@/music/providers/ytmusic-server";
import { INISAI_OFFICIAL_COLLECTIONS } from "@/music/collections";
import { buildDailyMixes } from "@/lib/recommendations/recommendation-engine";
import { buildUserMusicProfile } from "@/lib/recommendations/user-music-profile";

export const dynamic = "force-dynamic";

interface CoverAuditItem {
  surface: string;
  id: string;
  title: string;
  originalUrl: string;
  httpStatus: number | string;
  contentType: string;
  naturalWidth: number;
  naturalHeight: number;
  realArt: boolean;
  rejectedReason?: string;
}

interface SurfaceSummary {
  surface: string;
  total: number;
  realArt: number;
  fallback: number;
  percentage: number;
}

// Inspect an image URL to determine HTTP status, content-type and natural pixel size
async function probeImage(url: string): Promise<{
  httpStatus: number | string;
  contentType: string;
  naturalWidth: number;
  naturalHeight: number;
  rejectedReason?: string;
}> {
  if (!url || !url.trim()) {
    return {
      httpStatus: "N/A",
      contentType: "N/A",
      naturalWidth: 0,
      naturalHeight: 0,
      rejectedReason: "Missing URL",
    };
  }

  // Detect tiny URL size params
  const ytMatch = url.match(/=w(\d+)-h(\d+)/);
  let parsedWidth = ytMatch ? parseInt(ytMatch[1], 10) : 0;
  let parsedHeight = ytMatch ? parseInt(ytMatch[2], 10) : 0;

  const saavnMatch = url.match(/c\.saavncdn\.com\/.*-(\d+)x(\d+)\.jpg/);
  if (saavnMatch) {
    parsedWidth = parseInt(saavnMatch[1], 10);
    parsedHeight = parseInt(saavnMatch[2], 10);
  }

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(5000),
    });

    const contentType = res.headers.get("content-type") || "unknown";
    const status = res.status;

    if (!res.ok) {
      return {
        httpStatus: status,
        contentType,
        naturalWidth: 0,
        naturalHeight: 0,
        rejectedReason: `HTTP ${status} error`,
      };
    }

    // Inspect image header bytes for natural size if not in URL
    let naturalWidth = parsedWidth;
    let naturalHeight = parsedHeight;

    if (!naturalWidth) {
      try {
        const buffer = await res.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        // Basic JPEG size detection
        if (bytes[0] === 0xff && bytes[1] === 0xd8) {
          let offset = 2;
          while (offset < bytes.length) {
            if (bytes[offset] === 0xff && (bytes[offset + 1] === 0xc0 || bytes[offset + 1] === 0xc2)) {
              naturalHeight = (bytes[offset + 5] << 8) | bytes[offset + 6];
              naturalWidth = (bytes[offset + 7] << 8) | bytes[offset + 8];
              break;
            }
            offset += 2 + ((bytes[offset + 2] << 8) | bytes[offset + 3]);
          }
        }
      } catch {}
    }

    // Evaluate against rejection rules
    if (url.includes("i.ytimg.com") && naturalWidth <= 120 && naturalHeight <= 90) {
      return {
        httpStatus: status,
        contentType,
        naturalWidth: naturalWidth || 120,
        naturalHeight: naturalHeight || 90,
        rejectedReason: "YouTube placeholder grey TV box (~120x90)",
      };
    }

    if (naturalWidth > 0 && naturalWidth < 100) {
      return {
        httpStatus: status,
        contentType,
        naturalWidth,
        naturalHeight,
        rejectedReason: `Thumbnail size too small (< 100px: ${naturalWidth}x${naturalHeight}) without upscaling`,
      };
    }

    return {
      httpStatus: status,
      contentType,
      naturalWidth: naturalWidth || 500,
      naturalHeight: naturalHeight || 500,
    };
  } catch (err: any) {
    return {
      httpStatus: "ERR",
      contentType: "N/A",
      naturalWidth: parsedWidth,
      naturalHeight: parsedHeight,
      rejectedReason: `Fetch failed: ${err.message}`,
    };
  }
}

export async function GET(req: NextRequest) {
  const auditItems: CoverAuditItem[] = [];

  // 1. Audit Home Shelves
  try {
    const shelves = await ytHomeShelves();
    for (const shelf of shelves.slice(0, 3)) {
      for (const track of (shelf.items || []).slice(0, 6)) {
        const probe = await probeImage(track.artworkUrl || "");
        auditItems.push({
          surface: `Home Shelf: ${shelf.title}`,
          id: track.id,
          title: track.title,
          originalUrl: track.artworkUrl || "",
          httpStatus: probe.httpStatus,
          contentType: probe.contentType,
          naturalWidth: probe.naturalWidth,
          naturalHeight: probe.naturalHeight,
          realArt: !probe.rejectedReason,
          rejectedReason: probe.rejectedReason,
        });
      }
    }
  } catch (err: any) {
    console.error("Audit home shelves error:", err);
  }

  // 2. Audit Search queries
  const searchQueries = ["anirudh ravichander", "chinna thamarai", "hiphop tamizha", "ilaiyaraaja"];
  for (const q of searchQueries) {
    try {
      const res = await ytSearch(q, "all");
      for (const song of (res.songs || []).slice(0, 5)) {
        const probe = await probeImage(song.artworkUrl || "");
        auditItems.push({
          surface: `Search: "${q}"`,
          id: song.id,
          title: song.title,
          originalUrl: song.artworkUrl || "",
          httpStatus: probe.httpStatus,
          contentType: probe.contentType,
          naturalWidth: probe.naturalWidth,
          naturalHeight: probe.naturalHeight,
          realArt: !probe.rejectedReason,
          rejectedReason: probe.rejectedReason,
        });
      }
      for (const artist of (res.artists || []).slice(0, 3)) {
        const probe = await probeImage(artist.artworkUrl || "");
        auditItems.push({
          surface: `Search: "${q}" (Artist)`,
          id: artist.id,
          title: artist.name,
          originalUrl: artist.artworkUrl || "",
          httpStatus: probe.httpStatus,
          contentType: probe.contentType,
          naturalWidth: probe.naturalWidth,
          naturalHeight: probe.naturalHeight,
          realArt: !probe.rejectedReason,
          rejectedReason: probe.rejectedReason,
        });
      }
    } catch (err: any) {
      console.error(`Audit search error for ${q}:`, err);
    }
  }

  // 3. Audit Collections
  for (const col of INISAI_OFFICIAL_COLLECTIONS) {
    const probe = await probeImage(col.artworkUrl || "");
    auditItems.push({
      surface: "Collections",
      id: col.id,
      title: col.title,
      originalUrl: col.artworkUrl || "",
      httpStatus: probe.httpStatus,
      contentType: probe.contentType,
      naturalWidth: probe.naturalWidth,
      naturalHeight: probe.naturalHeight,
      realArt: !probe.rejectedReason,
      rejectedReason: probe.rejectedReason,
    });
  }

  // 4. Audit Daily Mixes
  const sampleMixes = buildDailyMixes([], buildUserMusicProfile(null, [], []), []);
  for (const mix of sampleMixes) {
    const probe = await probeImage(mix.artworkUrl || "");
    auditItems.push({
      surface: "Daily Mixes",
      id: mix.id,
      title: mix.title,
      originalUrl: mix.artworkUrl || "",
      httpStatus: probe.httpStatus,
      contentType: probe.contentType,
      naturalWidth: probe.naturalWidth,
      naturalHeight: probe.naturalHeight,
      realArt: !probe.rejectedReason,
      rejectedReason: probe.rejectedReason,
    });
  }

  // Surface Summaries
  const surfaceMap = new Map<string, { total: number; realArt: number; fallback: number }>();
  for (const item of auditItems) {
    const cur = surfaceMap.get(item.surface) || { total: 0, realArt: 0, fallback: 0 };
    cur.total += 1;
    if (item.realArt) cur.realArt += 1;
    else cur.fallback += 1;
    surfaceMap.set(item.surface, cur);
  }

  const summaries: SurfaceSummary[] = [];
  for (const [surface, stat] of surfaceMap.entries()) {
    summaries.push({
      surface,
      total: stat.total,
      realArt: stat.realArt,
      fallback: stat.fallback,
      percentage: stat.total > 0 ? Math.round((stat.realArt / stat.total) * 100) : 0,
    });
  }

  // Top rejection reasons
  const rejectionCounts = new Map<string, number>();
  for (const item of auditItems) {
    if (item.rejectedReason) {
      rejectionCounts.set(
        item.rejectedReason,
        (rejectionCounts.get(item.rejectedReason) || 0) + 1
      );
    }
  }

  const topRejectionReasons = Array.from(rejectionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([reason, count]) => ({ reason, count }));

  return NextResponse.json(
    {
      timestamp: new Date().toISOString(),
      summaries,
      topRejectionReasons,
      items: auditItems,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

