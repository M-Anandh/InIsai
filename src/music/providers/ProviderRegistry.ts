import { Track, SourceProviderId } from "@/types";
import { SourceProvider, ProviderSearchOptions, ProviderHealth } from "./types";
import { YtMusicProvider } from "./YtMusicProvider";
import { SaavnProvider } from "./SaavnProvider";
import { LocalProvider } from "./LocalProvider";

const PROVIDER_PREFS_KEY = "inisai_provider_prefs";

export function normalizeTrackSignature(title: string, artist: string): string {
  const cleanTitle = (title || "")
    .toLowerCase()
    .replace(/\(official.*?\)|\[official.*?\]|\(audio\)|\(lyrics.*?\)|\(from .*?\)|\(feat.*?\)/gi, "")
    .replace(/[^a-z0-9]/g, "");
  const primaryArtist = (artist || "")
    .toLowerCase()
    .split(/[,&•]/)[0]
    .replace(/[^a-z0-9]/g, "");
  return `${cleanTitle}_${primaryArtist}`;
}

export class ProviderRegistry {
  private static instance: ProviderRegistry;
  private providers: Map<SourceProviderId, SourceProvider> = new Map();
  private enabledMap: Record<SourceProviderId, boolean> = {
    ytmusic: true,
    saavn: true,
    local: true,
  };

  private constructor() {
    this.register(new YtMusicProvider());
    this.register(new SaavnProvider());
    this.register(new LocalProvider());
    this.loadPreferences();
  }

  public static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  public register(provider: SourceProvider) {
    this.providers.set(provider.id, provider);
  }

  public getProvider(id: SourceProviderId): SourceProvider | undefined {
    return this.providers.get(id);
  }

  public getAllProviders(): SourceProvider[] {
    return Array.from(this.providers.values());
  }

  public isEnabled(id: SourceProviderId): boolean {
    return this.enabledMap[id] ?? true;
  }

  public setEnabled(id: SourceProviderId, enabled: boolean) {
    this.enabledMap[id] = enabled;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(PROVIDER_PREFS_KEY, JSON.stringify(this.enabledMap));
      } catch {}
    }
  }

  private loadPreferences() {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(PROVIDER_PREFS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.enabledMap = { ...this.enabledMap, ...parsed };
      }
    } catch {}
  }

  public getEnabledProviders(): SourceProvider[] {
    return this.getAllProviders().filter((p) => this.isEnabled(p.id));
  }

  /**
   * Parallel query across enabled providers, de-duplicated and ranked.
   */
  public async searchAll(
    query: string,
    opts?: ProviderSearchOptions,
    signal?: AbortSignal
  ): Promise<Track[]> {
    const active = this.getEnabledProviders();
    const settled = await Promise.allSettled(
      active.map((provider) => provider.search(query, opts, signal))
    );

    const combined: Track[] = [];
    const seenIds = new Set<string>();
    const seenSignatures = new Map<string, Track>();

    for (const res of settled) {
      if (res.status !== "fulfilled") continue;
      for (const track of res.value) {
        if (seenIds.has(track.id)) continue;
        seenIds.add(track.id);

        const sig = normalizeTrackSignature(track.title, track.artist);
        const existing = seenSignatures.get(sig);

        // Prefer YouTube Music primary or higher quality version, attach versions cleanly
        if (existing) {
          const durDiff = Math.abs((existing.duration || 0) - (track.duration || 0));
          if (durDiff <= 5 || !existing.duration || !track.duration) {
            existing.versions = [...(existing.versions || []), track];
            continue;
          }
        }

        seenSignatures.set(sig, track);
        combined.push(track);
      }
    }

    return combined;
  }

  /**
   * Cross-provider match lookup: find matching direct-audio track (Saavn or Local) for a YT track
   * or an alternative playable version when a video embed fails.
   */
  public async findAudioMatch(track: Track, targetProvider: SourceProviderId = "saavn"): Promise<Track | null> {
    const provider = this.providers.get(targetProvider);
    if (!provider || !this.isEnabled(targetProvider)) return null;

    const cleanTitle = track.title
      .replace(/\(official.*?\)|\[official.*?\]|\(audio\)|\(video\)|\(lyrics.*?\)/gi, "")
      .trim();
    const query = `${cleanTitle} ${track.artist.split(",")[0] || ""}`.trim();

    try {
      const candidates = await provider.search(query, { limit: 10 });
      const targetSig = normalizeTrackSignature(track.title, track.artist);

      // Exact normalized signature + duration match within +-5s
      const exact = candidates.find((c) => {
        const sigMatch = normalizeTrackSignature(c.title, c.artist) === targetSig;
        const durOk = !track.duration || !c.duration || Math.abs(track.duration - c.duration) <= 5;
        return Boolean(c.streamUrl) && sigMatch && durOk;
      });
      if (exact) return exact;

      // Secondary title inclusion match with playable audio stream
      const loose = candidates.find(
        (c) =>
          Boolean(c.streamUrl) &&
          c.title.toLowerCase().includes(cleanTitle.toLowerCase().slice(0, 10))
      );
      return loose || null;
    } catch {
      return null;
    }
  }

  public async checkAllHealth(): Promise<Record<SourceProviderId, ProviderHealth>> {
    const all = this.getAllProviders();
    const results = await Promise.all(
      all.map(async (p) => [p.id, await p.health()] as const)
    );
    return Object.fromEntries(results) as Record<SourceProviderId, ProviderHealth>;
  }
}

export const providerRegistry = ProviderRegistry.getInstance();

