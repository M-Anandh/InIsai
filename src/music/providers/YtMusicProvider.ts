import { Track, Shelf } from "@/types";
import { SourceProvider, ProviderSearchOptions, ProviderHealth } from "./types";

export class YtMusicProvider implements SourceProvider {
  public readonly id = "ytmusic" as const;
  public readonly name = "YouTube Music (Primary Catalog)";
  public readonly description = "Official YouTube Music metadata & IFrame playback via compliant YT.Player API.";
  public readonly capabilities = {
    search: true,
    browse: true,
    charts: true,
    related: true,
    stream: "iframe" as const,
    lyricsIds: true,
  };

  async search(q: string, opts?: ProviderSearchOptions, signal?: AbortSignal): Promise<Track[]> {
    if (!q.trim()) return [];
    const url = `/api/yt/search?q=${encodeURIComponent(q)}&type=${opts?.type || "all"}`;
    const res = await fetch(url, { signal });
    if (res.ok) {
      const data = await res.json();
      return (data.songs || data.results || []).slice(0, opts?.limit || 25).map((t: Track) => ({
        ...t,
        providerId: "ytmusic" as const,
      }));
    }

    // Legacy fallback if /api/yt/search is not yet mounted
    const legacy = await fetch(`/api/music/youtube?q=${encodeURIComponent(q)}`, { signal });
    if (!legacy.ok) return [];
    const legacyData = await legacy.json();
    return (legacyData.results || []).slice(0, opts?.limit || 25).map((t: Track) => ({
      ...t,
      providerId: "ytmusic" as const,
    }));
  }

  async suggest(q: string, signal?: AbortSignal): Promise<string[]> {
    if (!q.trim()) return [];
    try {
      const res = await fetch(`/api/yt/suggest?q=${encodeURIComponent(q)}`, { signal });
      if (!res.ok) return [];
      const data = await res.json();
      return data.suggestions || [];
    } catch {
      return [];
    }
  }

  async browse(shelfId: string): Promise<Shelf> {
    try {
      const res = await fetch(`/api/yt/home?shelf=${encodeURIComponent(shelfId)}`);
      if (res.ok) {
        const data = await res.json();
        return data.shelf || { id: shelfId, title: shelfId, items: [] };
      }
    } catch {}
    return { id: shelfId, title: shelfId, items: [] };
  }

  async related(track: Track): Promise<Track[]> {
    const vid = track.youtubeVideoId || track.sourceId;
    if (!vid) return [];
    try {
      const res = await fetch(`/api/yt/related?videoId=${encodeURIComponent(vid)}`);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.results || []).map((t: Track) => ({ ...t, providerId: "ytmusic" as const }));
    } catch {
      return [];
    }
  }

  async health(): Promise<ProviderHealth> {
    const start = performance.now();
    try {
      const res = await fetch("/api/yt/suggest?q=tamil");
      const ok = res.ok;
      return {
        ok,
        latencyMs: Math.round(performance.now() - start),
        message: ok ? "YouTube Music InnerTube metadata reachable" : `HTTP ${res.status}`,
        checkedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        ok: false,
        latencyMs: Math.round(performance.now() - start),
        message: err?.message || "Metadata probe failed",
        checkedAt: new Date().toISOString(),
      };
    }
  }
}
