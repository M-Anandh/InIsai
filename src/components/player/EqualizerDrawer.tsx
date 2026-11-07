"use client";

import React from "react";
import { usePlayerStore, EQ_PRESETS } from "@/stores/player-store";
import { Sliders, Moon, Gauge, Disc } from "lucide-react";

export const EqualizerDrawer: React.FC = () => {
  const {
    settings,
    setEQPreset,
    setEQBand,
    setBassBoost,
    setTrebleBoost,
    toggleEqualizer,
    setCrossfade,
    setPlaybackRate,
    setSleepTimer,
  } = usePlayerStore();

  const eqFrequencies = ["60Hz", "230Hz", "910Hz", "4kHz", "14kHz"];

  return (
    <div className="flex flex-col space-y-6 text-white p-4 max-w-lg mx-auto overflow-y-auto max-h-[75vh]">
      {/* Header & Toggle */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center space-x-2">
          <Sliders className="w-5 h-5 text-inisai-accent" />
          <h3 className="font-semibold text-lg">InIsai Audio FX & Equalizer</h3>
        </div>
        <button
          onClick={() => toggleEqualizer()}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
            settings.equalizerEnabled
              ? "bg-inisai-accent text-white shadow-lg shadow-inisai-accent/30"
              : "bg-white/10 text-white/50"
          }`}
        >
          {settings.equalizerEnabled ? "Active" : "Bypassed"}
        </button>
      </div>

      {/* Presets */}
      <div>
        <label className="text-xs uppercase tracking-wider text-inisai-muted font-medium block mb-2">
          Sound Profile (முன்னமைவு)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.entries(EQ_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => setEQPreset(key)}
              className={`p-2 rounded-xl text-xs font-medium text-left border transition-all ${
                settings.selectedEqPreset === key
                  ? "border-inisai-accent bg-inisai-accent/20 text-white"
                  : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* 5-Band Slider Bars */}
      <div>
        <label className="text-xs uppercase tracking-wider text-inisai-muted font-medium block mb-4">
          5-Band Parametric EQ (-12dB to +12dB)
        </label>
        <div className="grid grid-cols-5 gap-3 bg-black/40 p-4 rounded-2xl border border-white/5">
          {eqFrequencies.map((freq, idx) => {
            const gain = settings.equalizerBands[idx] ?? 0;
            return (
              <div key={freq} className="flex flex-col items-center space-y-2">
                <span className="text-[11px] font-mono text-inisai-accent">
                  {gain > 0 ? `+${gain}` : gain}dB
                </span>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="1"
                  value={gain}
                  onChange={(e) => setEQBand(idx, Number(e.target.value))}
                  className="h-28 w-2 appearance-none bg-white/10 rounded-full outline-none accent-inisai-accent cursor-pointer [writing-mode:vertical-lr] [direction:rtl]"
                />
                <span className="text-[10px] text-white/60 font-medium">{freq}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bass & Treble Knobs */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-inisai-muted">Bass Boost (பாஸ்)</span>
            <span className="font-mono text-inisai-accent">{settings.bassBoost}dB</span>
          </div>
          <input
            type="range"
            min="-6"
            max="12"
            value={settings.bassBoost}
            onChange={(e) => setBassBoost(Number(e.target.value))}
            className="w-full accent-inisai-accent"
          />
        </div>

        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-inisai-muted">Treble Clarity</span>
            <span className="font-mono text-inisai-teal">{settings.trebleBoost}dB</span>
          </div>
          <input
            type="range"
            min="-6"
            max="12"
            value={settings.trebleBoost}
            onChange={(e) => setTrebleBoost(Number(e.target.value))}
            className="w-full accent-inisai-teal"
          />
        </div>
      </div>

      {/* Crossfade & Playback Speed */}
      <div className="space-y-4 pt-2 border-t border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-inisai-muted">
            <Disc className="w-4 h-4 text-inisai-accent" />
            <span>Crossfade Transition</span>
          </div>
          <span className="text-xs font-mono text-white">
            {settings.crossfadeDuration}s
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="12"
          step="1"
          value={settings.crossfadeDuration}
          onChange={(e) => setCrossfade(Number(e.target.value))}
          className="w-full accent-inisai-accent"
        />

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center space-x-2 text-xs text-inisai-muted">
            <Gauge className="w-4 h-4 text-inisai-teal" />
            <span>Playback Speed</span>
          </div>
          <div className="flex space-x-1">
            {[0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
              <button
                key={rate}
                onClick={() => setPlaybackRate(rate)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all ${
                  settings.playbackRate === rate
                    ? "bg-inisai-teal text-black font-bold"
                    : "bg-white/5 text-white/60 hover:bg-white/10"
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>

        {/* Sleep Timer */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center space-x-2 text-xs text-inisai-muted">
            <Moon className="w-4 h-4 text-amber-400" />
            <span>Sleep Timer</span>
          </div>
          <div className="flex space-x-1">
            {[null, 15, 30, 60].map((mins) => (
              <button
                key={String(mins)}
                onClick={() => setSleepTimer(mins)}
                className={`px-2 py-0.5 rounded text-[11px] transition-all ${
                  settings.sleepTimerMinutes === mins
                    ? "bg-amber-400 text-black font-bold"
                    : "bg-white/5 text-white/60 hover:bg-white/10"
                }`}
              >
                {mins === null ? "Off" : `${mins}m`}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

