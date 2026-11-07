import React from "react";
import Link from "next/link";
import { FileText } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 text-white py-6">
      <div className="flex items-center space-x-3 pb-4 border-b border-white/10">
        <FileText className="w-8 h-8 text-inisai-teal" />
        <h1 className="text-2xl font-bold">Terms of Service — InIsai (இனிசை)</h1>
      </div>

      <div className="space-y-4 text-xs sm:text-sm text-inisai-muted leading-relaxed">
        <h3 className="text-white font-semibold text-base">1. Acceptance of Terms</h3>
        <p>
          By accessing or using InIsai, you agree to comply with these terms.
        </p>

        <h3 className="text-white font-semibold text-base pt-2">2. Permitted Use & Music Playback</h3>
        <p>
          InIsai provides client playback interfaces for authorized public domain and Creative Commons tracks, along with user-selected local audio files. You agree not to use InIsai to circumvent DRM or redistribute copyrighted media without proper authorization.
        </p>

        <h3 className="text-white font-semibold text-base pt-2">3. Service Availability</h3>
        <p>
          InIsai operates on free-tier infrastructure. Features are provided &ldquo;as is&rdquo; without commercial guarantees of uninterrupted service.
        </p>

        <div className="pt-6">
          <Link href="/settings" className="text-inisai-accent font-semibold hover:underline">
            ← Back to Settings
          </Link>
        </div>
      </div>
    </div>
  );
}
