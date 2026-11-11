import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Header } from "@/components/layout/Header";
import { MiniPlayer } from "@/components/player/MiniPlayer";
import { FullScreenPlayer } from "@/components/player/FullScreenPlayer";
import { PlayerProvider } from "@/components/player/PlayerProvider";
import { PageTransition } from "@/components/layout/PageTransition";
import { ThemeSync } from "@/components/ui/ThemeSync";
import { FontLoader } from "@/components/ui/FontLoader";
import { SWUpdateNotifier } from "@/components/pwa/SWUpdateNotifier";
import { GlobalAddToPlaylistModal } from "@/components/music/GlobalAddToPlaylistModal";

export const metadata: Metadata = {
  title: "InIsai — Every Beat, Your World",
  description:
    "Every Beat, Your World. Modern, installable PWA music streaming and personal music player with Tamil melodies and local music playback.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "InIsai",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B0A10",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const stored = localStorage.getItem('inisai_auth_storage') || localStorage.getItem('inisai-auth-storage');
                let theme = 'system';
                if (stored) {
                  const parsed = JSON.parse(stored);
                  theme = parsed?.state?.theme || parsed?.state?.user?.theme || 'system';
                }
                if (theme === 'system') {
                  theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                }
                if (theme === 'light') {
                  document.documentElement.classList.add('light');
                  document.documentElement.classList.remove('dark');
                } else {
                  document.documentElement.classList.add('dark');
                  document.documentElement.classList.remove('light');
                }
              } catch (e) {}
            `,
          }}
        />
        <link rel="preconnect" href="https://i.ytimg.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://lh3.googleusercontent.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-[#FBF7F1] dark:bg-[#0B0A10] text-[#1B1824] dark:text-[#F6F3EE] flex flex-col antialiased selection:bg-inisai-accent selection:text-white">
        <FontLoader />
        <ThemeSync />
        <PlayerProvider>
          <div className="flex flex-1 min-h-screen">
            {/* Desktop Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 pb-40 md:pb-28">
              <Header />
              <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
                <PageTransition>{children}</PageTransition>
              </main>

              {/* Copyright & Creator Attribution Footer */}
              <footer className="mt-auto px-4 sm:px-8 py-6 border-t border-slate-200 dark:border-white/5 text-xs text-slate-500 dark:text-inisai-muted flex flex-col sm:flex-row items-center justify-between gap-2">
                <p>
                  © 2026 <span className="font-semibold text-slate-900 dark:text-white">InIsai (இனிசை)</span> — Every Beat, Your World.
                </p>
                <p className="flex items-center space-x-1.5">
                  <span>Created with ❤️ by</span>
                  <a
                    href="https://www.linkedin.com/in/anandh-m/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-inisai-teal hover:text-inisai-accent font-semibold underline underline-offset-4 transition-colors"
                  >
                    Anandh M
                  </a>
                </p>
              </footer>
            </div>
          </div>

          {/* Global Persistent Players & Modals */}
          <MiniPlayer />
          <FullScreenPlayer />
          <GlobalAddToPlaylistModal />

          {/* Mobile Bottom Navigation */}
          <MobileNav />
          <SWUpdateNotifier />
        </PlayerProvider>

        {/* Service Worker Registration & Stale Chunk Auto-Recovery */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Auto-recover from Next.js deployment chunk mismatches
              window.addEventListener('error', function(e) {
                var msg = (e && e.message) ? e.message.toLowerCase() : '';
                if (msg.indexOf('chunkloaderror') !== -1 || msg.indexOf('loading chunk') !== -1 || msg.indexOf('failed to fetch dynamically imported') !== -1) {
                  if ('caches' in window) {
                    caches.keys().then(function(keys) {
                      keys.forEach(function(k) { caches.delete(k); });
                    });
                  }
                  if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistrations().then(function(regs) {
                      regs.forEach(function(r) { r.unregister(); });
                    });
                  }
                  setTimeout(function() { window.location.reload(); }, 100);
                }
              });

              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(err => {
                    console.log('SW registration note:', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}

