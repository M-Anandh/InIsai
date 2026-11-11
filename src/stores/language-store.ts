"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";

export const AVAILABLE_LANGUAGES = [
  { id: "Tamil", label: "Tamil", nativeLabel: "தமிழ்", code: "ta" },
  { id: "English", label: "English", nativeLabel: "English", code: "en" },
  { id: "Hindi", label: "Hindi", nativeLabel: "हिन्दी", code: "hi" },
  { id: "Telugu", label: "Telugu", nativeLabel: "తెలుగు", code: "te" },
  { id: "Malayalam", label: "Malayalam", nativeLabel: "മലയാളം", code: "ml" },
  { id: "Kannada", label: "Kannada", nativeLabel: "ಕನ್ನಡ", code: "kn" },
  { id: "Punjabi", label: "Punjabi", nativeLabel: "ਪੰਜਾਬੀ", code: "pa" },
];

interface LanguageState {
  selectedLanguages: string[];
  hasChosenOnboarding: boolean;
  toggleLanguage: (lang: string) => void;
  setLanguages: (langs: string[]) => void;
  setHasChosenOnboarding: (val: boolean) => void;
  syncWithProfile: (userId?: string) => Promise<void>;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      selectedLanguages: ["Tamil", "English"],
      hasChosenOnboarding: false,

      toggleLanguage: (lang: string) => {
        const current = get().selectedLanguages;
        let updated: string[];
        if (current.includes(lang)) {
          if (current.length === 1) return; // Keep at least one
          updated = current.filter((l) => l !== lang);
        } else {
          updated = [...current, lang];
        }
        set({ selectedLanguages: updated, hasChosenOnboarding: true });
        get().syncWithProfile();
      },

      setLanguages: (langs: string[]) => {
        if (!langs || langs.length === 0) return;
        set({ selectedLanguages: langs, hasChosenOnboarding: true });
        get().syncWithProfile();
      },

      setHasChosenOnboarding: (val: boolean) => {
        set({ hasChosenOnboarding: val });
      },

      syncWithProfile: async (userId?: string) => {
        if (!isSupabaseConfigured()) return;
        try {
          const user = userId ? { id: userId } : (await supabase.auth.getUser()).data.user;
          if (user?.id) {
            await supabase
              .from("profiles")
              .update({
                preferred_languages: get().selectedLanguages,
                updated_at: new Date().toISOString(),
              })
              .eq("id", user.id);
          }
        } catch (e) {
          console.warn("[LanguageStore] Sync note:", e);
        }
      },
    }),
    {
      name: "inisai_preferred_languages_v2",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
