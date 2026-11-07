import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Header } from "@/components/layout/Header";
import { MiniPlayer } from "@/components/player/MiniPlayer";
import { FullScreenPlayer } from "@/components/player/FullScreenPlayer";

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
  themeColor: "#08090d",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="referrer" content="no-referrer" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Noto+Sans+Tamil:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-inisai-dark text-white flex flex-col antialiased selection:bg-inisai-accent selection:text-white">
        <div className="flex flex-1 min-h-screen">
          {/* Desktop Sidebar */}
          <Sidebar />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 pb-36 md:pb-24">
            <Header />
            <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full">
              {children}
            </main>

            {/* Copyright & Creator Attribution Footer */}
            <footer className="mt-auto px-4 sm:px-8 py-6 border-t border-white/5 text-xs text-inisai-muted flex flex-col sm:flex-row items-center justify-between gap-2">
              <p>
                © 2026 <span className="font-semibold text-white">InIsai (இனிசை)</span> — Every Beat, Your World.
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

        {/* Global Persistent Players */}
        <MiniPlayer />
        <FullScreenPlayer />

        {/* Mobile Bottom Navigation */}
        <MobileNav />

        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
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

