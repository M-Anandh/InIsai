import React from "react";
import Link from "next/link";
import { Shield } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 text-white py-6">
      <div className="flex items-center space-x-3 pb-4 border-b border-white/10">
        <Shield className="w-8 h-8 text-inisai-accent" />
        <h1 className="text-2xl font-bold">Privacy Policy — InIsai (இனிசை)</h1>
      </div>

      <div className="space-y-4 text-xs sm:text-sm text-inisai-muted leading-relaxed">
        <p>
          At InIsai, we believe music listening should be private, serene, and respectful of your data.
        </p>

        <h3 className="text-white font-semibold text-base pt-2">1. Local Audio Files</h3>
        <p>
          When you select audio files from your device to play via InIsai&apos;s Local Music player, all audio processing and storage occur exclusively on your device using IndexedDB. No audio files are transmitted to or stored on our servers.
        </p>

        <h3 className="text-white font-semibold text-base pt-2">2. Account Information</h3>
        <p>
          If you create an account, your profile data, playlists, and liked songs are securely stored in Supabase PostgreSQL under strict Row Level Security (RLS) policies. Only you have access to your private library.
        </p>

        <h3 className="text-white font-semibold text-base pt-2">3. No Third-Party Tracking</h3>
        <p>
          We do not sell your personal data or use commercial advertising trackers.
        </p>

        <div className="pt-6">
          <Link href="/settings" className="text-inisai-teal font-semibold hover:underline">
            ← Back to Settings
          </Link>
        </div>
      </div>
    </div>
  );
}

