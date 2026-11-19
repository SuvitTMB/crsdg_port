// CRSDG New Year 2026 - PWA Service Worker
// Enables Standalone PWA installability and hides address bar on mobile devices

const CACHE_NAME = 'crsdg-2026-pwa-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Network-first pass through for all requests so Firestore and realtime updates remain perfectly synchronized
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
