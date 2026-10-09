// Service Worker AnisFlix
//
// Les pages HTML doivent toujours venir du réseau lorsqu'il est disponible.
// Les mettre en cache en priorité conserve un ancien index.html après un
// déploiement et peut laisser Chrome/Brave sur une page blanche.
const CACHE_NAME = 'anisflix-v3';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.add(OFFLINE_URL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith('anisflix-') && cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      )),
      self.registration.navigationPreload
        ? self.registration.navigationPreload.enable()
        : Promise.resolve(),
    ]).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) {
    return;
  }

  const url = new URL(request.url);

  // Les API, les URLs de streaming signées et les médias ne doivent jamais
  // être conservés par le service worker.
  if (
    url.pathname.startsWith('/api/') ||
    request.headers.has('range') ||
    ['video', 'audio'].includes(request.destination)
  ) {
    return;
  }

  // Network-first pour chaque navigation afin de récupérer le dernier build.
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith((async () => {
      try {
        const preloadedResponse = await event.preloadResponse;
        if (preloadedResponse) {
          return preloadedResponse;
        }

        return await fetch(request, { cache: 'no-store' });
      } catch {
        return (await caches.match(OFFLINE_URL)) || Response.error();
      }
    })());
    return;
  }

  // Les fichiers Vite dans /assets portent un hash dans leur nom. Ils sont
  // immuables et peuvent donc être servis depuis le cache sans devenir périmés.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request).then((networkResponse) => {
          if (networkResponse.ok) {
            const responseToCache = networkResponse.clone();
            event.waitUntil(
              caches.open(CACHE_NAME)
                .then((cache) => cache.put(request, responseToCache))
            );
          }

          return networkResponse;
        });
      })
    );
  }
});
