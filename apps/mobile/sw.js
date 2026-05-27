const CACHE_NAME = "intellilaw-remates-mobile-v4";
const APP_SHELL = [
  "/mobile/",
  "/mobile/assets/app-version.js",
  "/mobile/assets/court-options.js",
  "/mobile/assets/mobile.css",
  "/mobile/assets/mobile-app.js",
  "/mobile/assets/app-icon-192.png",
  "/mobile/assets/app-icon-512.png",
  "/mobile/assets/favicon-32.png",
  "/mobile/assets/legalflow-logo.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || !new URL(request.url).pathname.startsWith("/mobile")) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      return response;
    }))
  );
});
