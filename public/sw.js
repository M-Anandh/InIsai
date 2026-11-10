// InIsai PWA Service Worker v2
const CACHE_NAME = "inisai-pwa-v2";
const OFFLINE_URL = "/offline.html";

const PRECACHE_ASSETS = [
  "/",
  "/search",
  "/explore",
  "/library",
  "/liked",
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn("Precache partial note:", err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);

  // Never cache external streaming CDNs or YouTube media frames
  if (
    url.pathname.endsWith(".mp3") ||
    url.pathname.endsWith(".mp4") ||
    url.pathname.endsWith(".wav") ||
    url.pathname.endsWith(".ogg") ||
    url.hostname.includes("saavncdn.com") ||
    url.hostname.includes("youtube.com") ||
    url.hostname.includes("googlevideo.com") ||
    url.hostname.includes("ytimg.com")
  ) {
    return;
  }

  // Handle navigation requests with network-first + offline shell fallback
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(event.request)) || (await cache.match(OFFLINE_URL)) || new Response("InIsai is offline.");
      })
    );
    return;
  }

  // Stale-while-revalidate for static UI assets only
  if (url.origin === self.location.origin && !url.pathname.startsWith("/api/")) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
  }
});
