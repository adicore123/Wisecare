self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// WiseCare handles sensitive data, so the service worker intentionally does not cache API responses.
self.addEventListener('fetch', () => {});
