// Fragmenta Service Worker — safe cache-first for static assets, network-first for pages
const CACHE_NAME = 'fragmenta-v1';
const STATIC_ASSETS = ['/', '/manifest.json', '/offline'];
const API_CACHE = 'fragmenta-api-v1';

// Install: pre-cache core shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== API_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // API routes: network-first, never serve stale for mutations
  if (url.pathname.startsWith('/api/')) {
    // Cache read-only API responses briefly
    if (request.method === 'GET') {
      event.respondWith(
        fetch(request)
          .then((res) => {
            const clone = res.clone();
            caches.open(API_CACHE).then((cache) => cache.put(request, clone));
            return res;
          })
          .catch(() => caches.match(request))
      );
    }
    return;
  }

  // Static assets (_next): cache-first
  if (url.pathname.startsWith('/_next/')) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return res;
      }))
    );
    return;
  }

  // Pages: network-first, fall back to cache, then offline page
  event.respondWith(
    fetch(request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return res;
      })
      .catch(() =>
        caches.match(request).then((cached) => cached || caches.match('/offline'))
      )
  );
});
