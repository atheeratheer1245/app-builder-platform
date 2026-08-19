const CACHE_NAME = "app-builder-shell-v2";
const APP_SHELL = ["/", "/guide", "/manifest.webmanifest"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).catch(() => undefined));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  // OAuth begins as a top-level navigation to /api/auth/google and then redirects
  // cross-origin to Google. The service worker must not follow or cache that
  // navigation, otherwise browsers can lose the redirect and the callback state.
  if (requestUrl.origin !== self.location.origin || requestUrl.pathname.startsWith("/api/")) return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).then(response => {
      const clone = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put("/", clone));
      return response;
    }).catch(() => caches.match("/")));
  }
});
