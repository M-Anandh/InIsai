"use client";

import React, { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { usePlayerStore } from "@/stores/player-store";
import { useMounted } from "@/hooks/use-mounted";
import { User, Check, Heart, History, ListMusic, Save } from "lucide-react";

export default function ProfilePage() {
  const { user, updateProfile, likedTrackIds, userPlaylists } = useAuthStore();
  const { history } = usePlayerStore();
  const mounted = useMounted();

  const [name, setName] = useState("InIsai Listener");
  const [lang, setLang] = useState("Tamil");
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (user?.displayName) setName(user.displayName);
    if (user?.preferredLanguage) setLang(user.preferredLanguage);
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile({
      displayName: name.trim(),
      preferredLanguage: lang,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Profile Header Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-inisai-card via-[#1c1836] to-inisai-card border border-white/10 flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 text-center sm:text-left">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-inisai-accent via-inisai-teal to-inisai-emerald flex items-center justify-center font-extrabold text-white text-3xl shadow-xl shadow-inisai-accent/30 uppercase">
          {name.charAt(0)}
        </div>
        <div>
          <span className="text-xs uppercase font-mono tracking-wider text-inisai-teal font-bold">
            Listener Profile
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            {name}
          </h1>
          <p className="text-xs text-inisai-muted mt-0.5">
            Preferred Language: <span className="text-white font-semibold">{lang}</span>
          </p>
        </div>
      </div>

      {/* Stats Counter */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
          <Heart className="w-5 h-5 mx-auto text-rose-500 mb-1" />
          <span className="text-lg font-bold text-white font-mono">{mounted ? likedTrackIds.length : 0}</span>
          <p className="text-[11px] text-inisai-muted">Liked Songs</p>
        </div>
        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
          <ListMusic className="w-5 h-5 mx-auto text-inisai-accent mb-1" />
          <span className="text-lg font-bold text-white font-mono">{mounted ? userPlaylists.length : 0}</span>
          <p className="text-[11px] text-inisai-muted">Playlists</p>
        </div>
        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
          <History className="w-5 h-5 mx-auto text-inisai-teal mb-1" />
          <span className="text-lg font-bold text-white font-mono">{mounted ? history.length : 0}</span>
          <p className="text-[11px] text-inisai-muted">History</p>
        </div>
      </div>

      {/* Edit Form */}
      <form onSubmit={handleSave} className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-5">
        <h2 className="text-base font-bold text-white">Edit Your Preferences</h2>

        <div className="space-y-2">
          <label className="text-xs text-inisai-muted font-medium block">
            Display Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-sm text-white outline-none focus:border-inisai-accent"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs text-inisai-muted font-medium block">
            Preferred Music Language
          </label>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-sm text-white outline-none focus:border-inisai-accent cursor-pointer"
          >
            <option value="Tamil">Tamil</option>
            <option value="English">English</option>
            <option value="Hindi">Hindi</option>
            <option value="Telugu">Telugu</option>
            <option value="Malayalam">Malayalam</option>
          </select>
        </div>

        <button
          type="submit"
          className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-inisai-accent text-white text-xs font-bold shadow-lg shadow-inisai-accent/30 hover:opacity-90 transition-all"
        >
          {isSaved ? <Check className="w-4 h-4 text-inisai-emerald" /> : <Save className="w-4 h-4" />}
          <span>{isSaved ? "Saved Successfully!" : "Save Changes"}</span>
        </button>
      </form>
    </div>
  );
}

