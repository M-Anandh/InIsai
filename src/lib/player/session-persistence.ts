import { Track, EngineId, RepeatMode, PlaybackSessionState } from "@/types";
import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";

export const IDB_SESSION_KEY = "inisai_playback_session_v1";
export const LOCAL_STORAGE_SESSION_KEY = "inisai_playback_session_sync";

function sanitizeTrackForStorage(track: Track): Track {
  // Never persist expiring direct stream URLs or blob URLs across restarts
  return { ...track, streamUrl: "" };
}

function sanitizeSessionForStorage(session: PlaybackSessionState): PlaybackSessionState {
  return {
    ...session,
    currentTrack: sanitizeTrackForStorage(session.currentTrack),
    queue: session.queue.map(sanitizeTrackForStorage),
  };
}

let lastSaveTime = 0;
let pendingSaveTimer: any = null;

/**
 * Saves playback session state synchronously to localStorage and asynchronously to IndexedDB.
 * Throttled to at most once per 3s during continuous playback, but can be forced immediately.
 */
export function persistPlaybackSession(
  session: PlaybackSessionState,
  forceImmediate = false
): void {
  if (typeof window === "undefined") return;
  if (!session.currentTrack) return;

  const doSave = () => {
    lastSaveTime = Date.now();
    try {
      const cleanSession = sanitizeSessionForStorage(session);
      cleanSession.savedAt = Date.now();
      const serialized = JSON.stringify(cleanSession);
      localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, serialized);
      idbSet(IDB_SESSION_KEY, cleanSession).catch(() => {});
    } catch (e) {
      console.warn("Failed saving playback session:", e);
    }
  };

  const now = Date.now();
  if (forceImmediate || now - lastSaveTime >= 3000) {
    if (pendingSaveTimer) {
      clearTimeout(pendingSaveTimer);
      pendingSaveTimer = null;
    }
    doSave();
  } else if (!pendingSaveTimer) {
    pendingSaveTimer = setTimeout(() => {
      pendingSaveTimer = null;
      doSave();
    }, 3000 - (now - lastSaveTime));
  }
}

/**
 * Synchronous immediate write for use in pagehide, beforeunload, and freeze events.
 */
export function persistPlaybackSessionSync(session: PlaybackSessionState): void {
  if (typeof window === "undefined" || !session.currentTrack) return;
  try {
    const cleanSession = sanitizeSessionForStorage(session);
    cleanSession.savedAt = Date.now();
    localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(cleanSession));
  } catch {}
}

/**
 * Loads the last persisted playback session, checking IndexedDB with fallback to localStorage.
 */
export async function loadPersistedSession(): Promise<PlaybackSessionState | null> {
  if (typeof window === "undefined") return null;

  try {
    // 1. Try IndexedDB first
    const fromIdb = await idbGet<PlaybackSessionState>(IDB_SESSION_KEY);
    if (fromIdb && fromIdb.currentTrack && Array.isArray(fromIdb.queue)) {
      return fromIdb;
    }
  } catch {}

  try {
    // 2. Fall back to synchronous localStorage mirror
    const raw = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PlaybackSessionState;
      if (parsed && parsed.currentTrack && Array.isArray(parsed.queue)) {
        return parsed;
      }
    }
  } catch {}

  return null;
}

/**
 * Clears the persisted playback session from both storage tiers.
 */
export async function clearPersistedSession(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
    await idbDel(IDB_SESSION_KEY);
  } catch {}
}
