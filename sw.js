// CRSDG New Year 2026 - PWA Service Worker
// Enables Standalone PWA installability and hides address bar on mobile devices

const CACHE_NAME = 'crsdg-2026-pwa-v3';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Passive fetch listener to satisfy PWA criteria without intercepting or blocking any network requests
// Allows the browser to process 100% of network requests, WebSockets, and Firestore natively with zero 503 errors.
self.addEventListener('fetch', () => {
  // Do not call event.respondWith(); let the native browser network engine handle everything cleanly
});
