"use client";

import { create } from "zustand";
import { Track } from "@/types";

interface AddToPlaylistState {
  isOpen: boolean;
  track: Track | null;
  open: (track: Track) => void;
  close: () => void;
}

export const useAddToPlaylistStore = create<AddToPlaylistState>((set) => ({
  isOpen: false,
  track: null,
  open: (track: Track) => set({ isOpen: true, track }),
  close: () => set({ isOpen: false, track: null }),
}));
