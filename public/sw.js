// Minimal service worker. Its only job is to satisfy Chrome's installability
// criteria for the native install prompt (`beforeinstallprompt`), which requires
// a registered service worker with a `fetch` handler. Deliberately a pure
// network pass-through — this app's data (roster, calendar, messages) changes
// constantly, so caching responses here would risk serving stale content
// instead of adding real offline support.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
