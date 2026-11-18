const CACHE_NAME = 'ananquiz-pwa-v1';
const PRECACHE_URLS = [
  '/',
  '/quizzes',
  '/library',
  '/profile',
  '/manifest.webmanifest',
  '/icon.svg',
  '/data/index.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.allSettled(
          PRECACHE_URLS.map((url) =>
            fetch(url, { cache: 'reload' }).then((res) => {
              if (res && res.ok) {
                return cache.put(url, res.clone());
              }
            })
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('ananquiz-') && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  const isDataOrAsset =
    url.pathname.startsWith('/data/') ||
    url.pathname.startsWith('/diagrams/') ||
    url.pathname.startsWith('/_next/static/') ||
    url.pathname === '/icon.svg' ||
    url.pathname === '/manifest.webmanifest';

  if (isDataOrAsset) {
    // Stale-While-Revalidate for quiz JSON banks, diagrams, and immutable static bundles
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(req).then((cached) => {
          const networkFetch = fetch(req)
            .then((networkRes) => {
              if (networkRes && networkRes.ok) {
                cache.put(req, networkRes.clone());
              }
              return networkRes;
            })
            .catch(() => cached || Response.error());

          return cached || networkFetch;
        })
      )
    );
    return;
  }

  // Network-First with Cache Fallback for app shell pages and navigations
  if (req.mode === 'navigate' || url.pathname.startsWith('/session')) {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.ok) {
            const copy = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return networkRes;
        })
        .catch(() =>
          caches
            .match(req, { ignoreSearch: true })
            .then((cached) => cached || caches.match('/'))
            .then((res) => res || Response.error())
        )
    );
  }
});
