// Service worker dasar Tahap 1 (R24, ARCHITECTURE.md §8).
// Strategi cache-first HANYA untuk aset statis milik aplikasi (ikon,
// manifest). Permintaan navigasi/halaman dan API dibiarkan lewat ke
// jaringan apa adanya agar data selalu diusahakan terbaru. Strategi
// network-first penuh untuk /api/** dan halaman fallback offline
// disempurnakan pada Tahap 6 (lihat docs/IMPLEMENTATION_PLAN.md).
const CACHE_NAME = "supplier-harga-static-v1";
const PRECACHE_URLS = ["/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => {
        // Pemasangan tidak boleh gagal total hanya karena precache gagal
        // (mis. offline saat instalasi pertama).
      }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isStaticAsset =
    isSameOrigin && (url.pathname.startsWith("/icons/") || url.pathname === "/manifest.webmanifest");

  if (!isStaticAsset) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        return response;
      });
    }),
  );
});
