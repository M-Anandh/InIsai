import { Track, Shelf } from "@/types";
import { SourceProvider, ProviderSearchOptions, ProviderHealth } from "./types";

export class SaavnProvider implements SourceProvider {
  public readonly id = "saavn" as const;
  public readonly name = "InIsai Cloud Audio (Saavn)";
  public readonly description = "Direct AAC/MP3 audio streaming for Indian & global catalogs with mobile background support.";
  public readonly capabilities = {
    search: true,
    browse: true,
    charts: true,
    related: true,
    stream: "audio" as const,
    lyricsIds: false,
  };

  async search(q: string, opts?: ProviderSearchOptions, signal?: AbortSignal): Promise<Track[]> {
    if (!q.trim()) return [];
    const res = await fetch(`/api/music/search?q=${encodeURIComponent(q)}`, { signal });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || [])
      .slice(0, opts?.limit || 25)
      .map((t: Track) => ({
        ...t,
        providerId: "saavn" as const,
        sourceAttribution: "InIsai Cloud Audio",
      }));
  }

  async suggest(q: string, signal?: AbortSignal): Promise<string[]> {
    const items = await this.search(q, { limit: 6 }, signal);
    return Array.from(new Set(items.map((t) => t.title)));
  }

  async browse(shelfId: string): Promise<Shelf> {
    const category = shelfId.replace("saavn-", "");
    const res = await fetch(`/api/music/trending?category=${encodeURIComponent(category)}`);
    if (!res.ok) {
      return { id: shelfId, title: category, items: [] };
    }
    const data = await res.json();
    return {
      id: shelfId,
      title: category,
      items: (data.results || []).map((t: Track) => ({ ...t, providerId: "saavn" as const })),
    };
  }

  async related(track: Track): Promise<Track[]> {
    const res = await fetch(
      `/api/music/recommend?id=${encodeURIComponent(track.sourceId || "")}&artist=${encodeURIComponent(
        track.artist || ""
      )}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((t: Track) => ({ ...t, providerId: "saavn" as const }));
  }

  async health(): Promise<ProviderHealth> {
    const start = performance.now();
    try {
      const res = await fetch("/api/music/search?q=nilaave+vaa");
      const ok = res.ok;
      return {
        ok,
        latencyMs: Math.round(performance.now() - start),
        message: ok ? "Direct 320kbps AAC catalog reachable" : `HTTP ${res.status}`,
        checkedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        ok: false,
        latencyMs: Math.round(performance.now() - start),
        message: err?.message || "Network unreachable",
        checkedAt: new Date().toISOString(),
      };
    }
  }
}

