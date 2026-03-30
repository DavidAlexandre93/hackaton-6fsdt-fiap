const CACHE_VERSION = 'professor-plus-v1';
const APP_SHELL_CACHE = `app-shell-${CACHE_VERSION}`;
const DATA_CACHE = `data-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline/light-content.json';

const APP_SHELL = ['/', '/index.html', OFFLINE_URL, '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => ![APP_SHELL_CACHE, DATA_CACHE].includes(key)).map((key) => caches.delete(key)))
      )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const cloned = response.clone();
          caches.open(APP_SHELL_CACHE).then((cache) => cache.put('/index.html', cloned));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  if (url.pathname === OFFLINE_URL) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const networkPromise = fetch(event.request)
          .then((response) => {
            const cloned = response.clone();
            caches.open(DATA_CACHE).then((cache) => cache.put(event.request, cloned));
            return response;
          })
          .catch(() => cached);

        return cached || networkPromise;
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response.ok && event.request.destination !== '') {
            const cloned = response.clone();
            caches.open(APP_SHELL_CACHE).then((cache) => cache.put(event.request, cloned));
          }
          return response;
        })
        .catch(() => caches.match('/index.html'));
    })
  );
});
